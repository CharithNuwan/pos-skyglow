import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireSession } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSession();
    const id = parseInt(params.id);
    const customer = await queryOne(`SELECT * FROM customers WHERE customer_id = ?`, [id]);
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const purchases = await query(
      `SELECT s.sale_id, s.invoice_number, s.total_amount, s.payment_method, s.sale_date, s.payment_status
       FROM sales s WHERE s.customer_id = ? ORDER BY s.sale_date DESC LIMIT 20`, [id]
    );
    return NextResponse.json({ customer, purchases });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSession();
    const id = parseInt(params.id);
    const { full_name, phone, email, address, notes, is_active } = await req.json();
    await execute(
      `UPDATE customers SET full_name=?, phone=?, email=?, address=?, notes=?, is_active=?, updated_at=datetime('now') WHERE customer_id=?`,
      [full_name, phone || null, email || null, address || null, notes || null, is_active ?? 1, id]
    );
    return NextResponse.json({ success: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
