import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    if (!hasRole(session.role, 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const saleId = parseInt(params.id);
    const sale = await queryOne<{ sale_id: number; payment_status: string; invoice_number: string }>(
      `SELECT sale_id, payment_status, invoice_number FROM sales WHERE sale_id = ?`, [saleId]
    );

    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    if (sale.payment_status === 'refunded') return NextResponse.json({ error: 'Already refunded' }, { status: 400 });

    const items = await query<{ product_id: number; quantity: number }>(`SELECT product_id, quantity FROM sale_items WHERE sale_id = ?`, [saleId]);

    const company_id = session.company_id ?? 1;
    const defaultWh = await queryOne<{ warehouse_id: number }>(`SELECT warehouse_id FROM warehouses WHERE company_id = ? AND is_default = 1 LIMIT 1`, [company_id]);
    for (const item of items) {
      const product = await queryOne<{ quantity: number; company_id: number }>(`SELECT quantity, company_id FROM products WHERE product_id = ?`, [item.product_id]);
      const qBefore = product?.quantity ?? 0;
      await execute(`UPDATE products SET quantity = quantity + ?, updated_at = datetime('now') WHERE product_id = ?`, [item.quantity, item.product_id]);
      if (defaultWh) {
        await execute(
          `INSERT INTO warehouse_stock (product_id, warehouse_id, quantity, updated_at) VALUES (?, ?, ?, datetime('now'))
           ON CONFLICT(product_id, warehouse_id) DO UPDATE SET quantity = quantity + ?, updated_at = datetime('now')`,
          [item.product_id, defaultWh.warehouse_id, item.quantity, item.quantity]
        );
      }
      await execute(
        `INSERT INTO stock_logs (product_id, user_id, movement_type, quantity_before, quantity_change, quantity_after, reference_id, reference_type, notes, created_at) VALUES (?, ?, 'return', ?, ?, ?, ?, 'refund', ?, datetime('now'))`,
        [item.product_id, session.user_id, qBefore, item.quantity, qBefore + item.quantity, saleId, `Refund - ${sale.invoice_number}`]
      );
    }

    await execute(`UPDATE sales SET payment_status = 'refunded', updated_at = datetime('now') WHERE sale_id = ?`, [saleId]);
    await execute(`UPDATE payments SET payment_status = 'refunded', updated_at = datetime('now') WHERE sale_id = ?`, [saleId]);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
