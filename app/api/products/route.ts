import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const inStock = searchParams.get('inStock') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = 20;

    let sql = `SELECT p.*, c.category_name FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id WHERE p.is_active = 1`;
    const args: (string | number)[] = [];

    if (search) { sql += ` AND (p.product_name LIKE ? OR p.barcode LIKE ?)`; args.push(`%${search}%`, `%${search}%`); }
    if (category) { sql += ` AND p.category_id = ?`; args.push(parseInt(category)); }
    if (inStock) { sql += ` AND p.quantity > 0`; }

    const countResult = await queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM (${sql}) t`, args);
    const total = countResult?.cnt ?? 0;

    sql += ` ORDER BY p.product_name LIMIT ? OFFSET ?`;
    args.push(perPage, (page - 1) * perPage);

    const products = await query(sql, args);
    return NextResponse.json({ products, total, page, perPage });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!hasRole(session.role, 'manager')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const data = await req.json();
    const { barcode, product_name, short_name, pack_size, category_id, supplier_id, cost_price, selling_price, quantity, minimum_stock, description } = data;

    const result = await execute(
      `INSERT INTO products (barcode, product_name, short_name, pack_size, category_id, supplier_id, cost_price, selling_price, quantity, minimum_stock, description, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      [barcode || null, product_name, short_name || null, pack_size || 1, category_id || null, supplier_id || null, cost_price, selling_price, quantity, minimum_stock || 5, description || null]
    );
    return NextResponse.json({ success: true, product_id: result.lastInsertRowid });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
