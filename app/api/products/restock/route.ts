import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!hasRole(session.role, 'manager')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { product_id, quantity, note } = await req.json();
    if (!product_id || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Invalid product or quantity' }, { status: 400 });
    }

    // Get current stock
    const product = await queryOne<{ product_id: number; quantity: number; product_name: string }>(
      `SELECT product_id, quantity, product_name FROM products WHERE product_id = ?`, [product_id]
    );
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const newQuantity = product.quantity + quantity;

    // Update stock
    await execute(
      `UPDATE products SET quantity = ?, updated_at = datetime('now') WHERE product_id = ?`,
      [newQuantity, product_id]
    );

    // Log the stock movement
    await execute(
      `INSERT INTO stock_logs (product_id, user_id, movement_type, quantity_before, quantity_change, quantity_after, notes, created_at)
       VALUES (?, ?, 'restock', ?, ?, ?, ?, datetime('now'))`,
      [product_id, session.user_id, product.quantity, quantity, newQuantity, note || 'Manual restock']
    );

    return NextResponse.json({
      success: true,
      product_name: product.product_name,
      quantity_before: product.quantity,
      quantity_added: quantity,
      quantity_after: newQuantity,
    });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
