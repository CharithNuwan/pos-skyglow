import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireSession, hasRole, generateInvoiceNumber } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const company_id = session.company_id || 1;
    if (!hasRole(session.role, 'manager')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = 20;
    const dateFrom = searchParams.get('date_from') || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const dateTo = searchParams.get('date_to') || new Date().toISOString().slice(0, 10);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    let sql = `SELECT s.*, u.full_name as cashier_name FROM sales s JOIN users u ON s.user_id = u.user_id WHERE s.company_id = ? AND date(s.sale_date) BETWEEN ? AND ?`;
    const args: (string | number)[] = [company_id, dateFrom, dateTo];

    if (status) { sql += ` AND s.payment_status = ?`; args.push(status); }
    if (search) { sql += ` AND (s.invoice_number LIKE ? OR s.customer_name LIKE ?)`; args.push(`%${search}%`, `%${search}%`); }

    const countResult = await queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM (${sql}) t`, args);
    const total = countResult?.cnt ?? 0;
    sql += ` ORDER BY s.sale_date DESC LIMIT ? OFFSET ?`;
    args.push(perPage, (page - 1) * perPage);

    const sales = await query(sql, args);
    return NextResponse.json({ sales, total, page, perPage });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const company_id = session.company_id || 1;
    const data = await req.json();

    if (!data.items?.length) return NextResponse.json({ error: 'No items in cart' }, { status: 400 });

    const invoiceNumber = await generateInvoiceNumber();
    const db = (await import('@/lib/db')).getDB();

    // Use batch for transaction
    const statements = [];

    // Insert sale
    statements.push({
      sql: `INSERT INTO sales (invoice_number, user_id, customer_id, shift_id, customer_name, customer_phone, subtotal, tax_amount, discount_amount, discount_type, discount_value, total_amount, payment_method, payment_status, cash_received, change_amount, notes, sale_date, company_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, datetime('now'), ?, datetime('now'), datetime('now'))`,
      args: [
        invoiceNumber, session.user_id, data.customer_id || null, data.shift_id || null,
        data.customer_name || null, data.customer_phone || null,
        data.subtotal, data.tax_amount, data.discount_amount,
        data.discount_type || null, data.discount_value || 0, data.total_amount,
        data.payment_method || 'cash', data.cash_received || 0, data.change_amount || 0, data.notes || null,
        company_id
      ]
    });

    await db.batch(statements, 'write');

    // Get the sale id
    const sale = await queryOne<{ sale_id: number }>(`SELECT sale_id FROM sales WHERE invoice_number = ?`, [invoiceNumber]);
    if (!sale) throw new Error('Sale not found after insert');
    const saleId = sale.sale_id;

    // Insert items and update stock
    for (const item of data.items) {
      const batch_id = item.batch_id ?? null;
      await execute(
        `INSERT INTO sale_items (sale_id, product_id, batch_id, quantity, unit_price, cost_price, total_price, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [saleId, item.product_id, batch_id, item.quantity, item.unit_price, item.cost_price || 0, item.total_price]
      );

      if (batch_id != null) {
        const batch = await queryOne<{ quantity: number; product_id: number }>(`SELECT quantity, product_id FROM product_batches WHERE batch_id = ?`, [batch_id]);
        if (batch) {
          const qAfter = Math.max(0, (batch.quantity ?? 0) - item.quantity);
          await execute(`UPDATE product_batches SET quantity = ?, updated_at = datetime('now') WHERE batch_id = ?`, [qAfter, batch_id]);
          await execute(`UPDATE products SET quantity = (SELECT COALESCE(SUM(quantity),0) FROM product_batches WHERE product_id = ? AND status = 'active'), updated_at = datetime('now') WHERE product_id = ?`, [batch.product_id, batch.product_id]);
        }
        await execute(
          `INSERT INTO stock_logs (product_id, user_id, movement_type, quantity_before, quantity_change, quantity_after, reference_id, reference_type, notes, created_at) VALUES (?, ?, 'sale', ?, ?, ?, ?, 'sale', ?, datetime('now'))`,
          [item.product_id, session.user_id, batch?.quantity ?? 0, -item.quantity, Math.max(0, (batch?.quantity ?? 0) - item.quantity), saleId, `Sale - ${invoiceNumber}`]
        );
      } else {
        const product = await queryOne<{ quantity: number; cost_price: number }>(`SELECT quantity, cost_price FROM products WHERE product_id = ?`, [item.product_id]);
        const qBefore = product?.quantity ?? 0;
        const qAfter = qBefore - item.quantity;
        await execute(`UPDATE products SET quantity = quantity - ?, updated_at = datetime('now') WHERE product_id = ?`, [item.quantity, item.product_id]);
        await execute(
          `INSERT INTO stock_logs (product_id, user_id, movement_type, quantity_before, quantity_change, quantity_after, reference_id, reference_type, notes, created_at) VALUES (?, ?, 'sale', ?, ?, ?, ?, 'sale', ?, datetime('now'))`,
          [item.product_id, session.user_id, qBefore, -item.quantity, qAfter, saleId, `Sale - ${invoiceNumber}`]
        );
      }
    }

    // Update customer stats + loyalty points
    if (data.customer_id) {
      await execute(
        `UPDATE customers SET total_spent = total_spent + ?, visit_count = visit_count + 1, loyalty_points = loyalty_points + ?, updated_at = datetime('now') WHERE customer_id = ?`,
        [data.total_amount, Math.floor(data.total_amount / 100), data.customer_id]
      );
    }

    // Insert payment record
    await execute(
      `INSERT INTO payments (sale_id, payment_method, payment_status, amount, payment_date, created_at, updated_at) VALUES (?, ?, 'completed', ?, datetime('now'), datetime('now'), datetime('now'))`,
      [saleId, data.payment_method || 'cash', data.total_amount]
    );

    return NextResponse.json({ success: true, sale_id: saleId, invoice_number: invoiceNumber, cashier_name: session.full_name });
  } catch (e: unknown) {
    console.error('Sale error:', e);
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
