import { NextRequest, NextResponse } from 'next/server';
import { queryOne, transaction } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const company_id = session.company_id ?? 1;
    if (!hasRole(session.role, 'manager')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { from_warehouse_id, to_warehouse_id, product_id, quantity } = await req.json();
    if (!from_warehouse_id || !to_warehouse_id || !product_id || quantity == null || quantity < 1) {
      return NextResponse.json({ error: 'from_warehouse_id, to_warehouse_id, product_id and positive quantity required' }, { status: 400 });
    }
    if (from_warehouse_id === to_warehouse_id) {
      return NextResponse.json({ error: 'From and to warehouse must be different' }, { status: 400 });
    }
    const fromId = parseInt(String(from_warehouse_id), 10);
    const toId = parseInt(String(to_warehouse_id), 10);
    const prodId = parseInt(String(product_id), 10);
    const qty = parseInt(String(quantity), 10);
    if (isNaN(fromId) || isNaN(toId) || isNaN(prodId) || isNaN(qty) || qty < 1) {
      return NextResponse.json({ error: 'Invalid ids or quantity' }, { status: 400 });
    }

    const product = await queryOne<{ product_id: number; product_name: string; company_id: number }>(
      `SELECT product_id, product_name, company_id FROM products WHERE product_id = ?`,
      [prodId]
    );
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    const productCompany = product.company_id ?? 1;
    if (productCompany !== company_id) return NextResponse.json({ error: 'Product not in your company' }, { status: 403 });

    const fromWh = await queryOne<{ warehouse_id: number; name: string; company_id: number }>(
      `SELECT warehouse_id, name, company_id FROM warehouses WHERE warehouse_id = ?`,
      [fromId]
    );
    const toWh = await queryOne<{ warehouse_id: number; name: string; company_id: number }>(
      `SELECT warehouse_id, name, company_id FROM warehouses WHERE warehouse_id = ?`,
      [toId]
    );
    if (!fromWh || !toWh) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    if (fromWh.company_id !== company_id || toWh.company_id !== company_id) {
      return NextResponse.json({ error: 'Warehouses must belong to your company' }, { status: 403 });
    }

    const fromStock = await queryOne<{ quantity: number }>(
      `SELECT quantity FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ?`,
      [prodId, fromId]
    );
    const available = fromStock ? Number(fromStock.quantity) : 0;
    if (available < qty) {
      return NextResponse.json({ error: `Insufficient stock in source warehouse (available: ${available})` }, { status: 400 });
    }

    const fromQtyBefore = available;
    const fromQtyAfter = fromQtyBefore - qty;
    const notes = `Transfer: ${fromWh.name} → ${toWh.name}`;

    await transaction([
      { sql: `UPDATE warehouse_stock SET quantity = quantity - ?, updated_at = datetime('now') WHERE product_id = ? AND warehouse_id = ?`, args: [qty, prodId, fromId] },
      { sql: `INSERT INTO warehouse_stock (product_id, warehouse_id, quantity, updated_at) VALUES (?, ?, ?, datetime('now'))
              ON CONFLICT(product_id, warehouse_id) DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = datetime('now')`, args: [prodId, toId, qty] },
      { sql: `UPDATE products SET quantity = (SELECT COALESCE(SUM(quantity), 0) FROM warehouse_stock WHERE product_id = ?), updated_at = datetime('now') WHERE product_id = ?`, args: [prodId, prodId] },
      { sql: `INSERT INTO stock_logs (product_id, user_id, movement_type, quantity_before, quantity_change, quantity_after, notes, created_at) VALUES (?, ?, 'transfer', ?, ?, ?, ?, datetime('now'))`, args: [prodId, session.user_id, fromQtyBefore, -qty, fromQtyAfter, notes] },
    ]);
    return NextResponse.json({ success: true, message: `Transferred ${qty} units of "${product.product_name}" from ${fromWh.name} to ${toWh.name}` });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
