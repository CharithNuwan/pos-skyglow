import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireSession } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    let sql = `SELECT * FROM customers WHERE is_active = 1 AND company_id = ?`;
    const args: any[] = [];
    if (search) { sql += ` AND (full_name LIKE ? OR phone LIKE ? OR email LIKE ?)`; args.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    const total = (await queryOne<any>(`SELECT COUNT(*) as cnt FROM (${sql}) t`, args))?.cnt ?? 0;
    sql += ` ORDER BY total_spent DESC LIMIT 20 OFFSET ?`;
    args.push((page - 1) * 20);
    const customers = await query(sql, args);
    return NextResponse.json({ customers, total });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const { full_name, phone, email, address, notes } = await req.json();
    if (!full_name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const result = await execute(
      `INSERT INTO customers (full_name, phone, email, address, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [full_name, phone || null, email || null, address || null, notes || null]
    );
    return NextResponse.json({ success: true, customer_id: result.lastInsertRowid });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
