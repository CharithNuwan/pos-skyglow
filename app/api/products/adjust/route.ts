import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!hasRole(session.role, 'manager')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { product_id, new_quantity, reason } = await req.json();
    if (!product_id || new_quantity === undefined || new_quantity < 0) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

    const product = await queryOne<any>(`SELECT product_id, quantity, product_name FROM products WHERE product_id = ?`, [product_id]);
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const diff = new_quantity - product.quantity;
    await execute(`UPDATE products SET quantity = ?, updated_at = datetime('now') WHERE product_id = ?`, [new_quantity, product_id]);
    await execute(
      `INSERT INTO stock_logs (product_id, user_id, movement_type, quantity_before, quantity_change, quantity_after, notes, created_at) VALUES (?, ?, 'adjustment', ?, ?, ?, ?, datetime('now'))`,
      [product_id, session.user_id, product.quantity, diff, new_quantity, reason || 'Manual adjustment']
    );
    return NextResponse.json({ success: true, quantity_before: product.quantity, quantity_after: new_quantity, diff });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
