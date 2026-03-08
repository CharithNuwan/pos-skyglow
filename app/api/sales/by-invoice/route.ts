import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Look up a sale by invoice number (for refund/damage after scanning receipt barcode). Scoped by company. */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!hasRole(session.role, 'manager')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const company_id = session.company_id ?? 1;
    const invoice_number = req.nextUrl.searchParams.get('invoice_number')?.trim();
    if (!invoice_number) {
      return NextResponse.json({ error: 'invoice_number required' }, { status: 400 });
    }
    const sale = await queryOne(
      `SELECT s.sale_id, s.invoice_number, s.payment_status, s.total_amount, s.sale_date, s.customer_name, s.payment_method, u.full_name as cashier_name
       FROM sales s LEFT JOIN users u ON s.user_id = u.user_id
       WHERE s.company_id = ? AND s.invoice_number = ?`,
      [company_id, invoice_number]
    );
    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }
    return NextResponse.json(sale);
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
