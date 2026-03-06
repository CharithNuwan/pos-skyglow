import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireSession } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireSession();
    const company_id = session.company_id || 1;
    // Get current open drawer
    const open = await queryOne(`SELECT d.*, u.full_name FROM cash_drawer d JOIN users u ON d.user_id = u.user_id WHERE d.status = 'open' AND (d.company_id = ? OR d.company_id IS NULL) ORDER BY d.opened_at DESC LIMIT 1`, [company_id]);
    // Get recent closed drawers
    const history = await query(`SELECT d.*, u.full_name FROM cash_drawer d JOIN users u ON d.user_id = u.user_id WHERE d.status = 'closed' AND (d.company_id = ? OR d.company_id IS NULL) ORDER BY d.closed_at DESC LIMIT 10`, [company_id]);
    return NextResponse.json({ open, history });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const company_id = session.company_id || 1;
    const { action, opening_cash, closing_cash, notes } = await req.json();

    if (action === 'open') {
      // Check no drawer already open for this company
      const existing = await queryOne(`SELECT drawer_id FROM cash_drawer WHERE status = 'open' AND (company_id = ? OR company_id IS NULL)`, [company_id]);
      if (existing) return NextResponse.json({ error: 'A drawer is already open' }, { status: 400 });
      await execute(
        `INSERT INTO cash_drawer (user_id, company_id, opening_cash, status, opened_at) VALUES (?, ?, ?, 'open', datetime('now'))`,
        [session.user_id, company_id, opening_cash || 0]
      );
      return NextResponse.json({ success: true, message: 'Drawer opened' });
    }

    if (action === 'close') {
      const drawer = await queryOne<any>(`SELECT * FROM cash_drawer WHERE status = 'open' AND (company_id = ? OR company_id IS NULL) ORDER BY opened_at DESC LIMIT 1`, [company_id]);
      if (!drawer) return NextResponse.json({ error: 'No open drawer' }, { status: 400 });

      // Calculate totals from sales since drawer opened
      const totals = await queryOne<any>(
        `SELECT COALESCE(SUM(CASE WHEN payment_method='cash' THEN total_amount ELSE 0 END),0) as cash_sales,
                COALESCE(SUM(CASE WHEN payment_method!='cash' THEN total_amount ELSE 0 END),0) as online_sales,
                COUNT(*) as total_sales
         FROM sales WHERE company_id = ? AND sale_date >= ? AND payment_status='completed'`,
        [company_id, drawer.opened_at]
      );
      const expectedCash = drawer.opening_cash + (totals?.cash_sales || 0);
      const diff = (closing_cash || 0) - expectedCash;

      await execute(
        `UPDATE cash_drawer SET closing_cash=?, expected_cash=?, cash_difference=?,
         total_cash_sales=?, total_online_sales=?, total_sales=?, notes=?, status='closed', closed_at=datetime('now')
         WHERE drawer_id=?`,
        [closing_cash || 0, expectedCash, diff, totals?.cash_sales || 0, totals?.online_sales || 0, totals?.total_sales || 0, notes || null, drawer.drawer_id]
      );
      return NextResponse.json({ success: true, summary: { ...totals, expectedCash, diff, closing_cash } });
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
