import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireSession } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'current';

    if (view === 'current') {
      const myShift = await queryOne(`SELECT s.*, u.full_name FROM shifts s JOIN users u ON s.user_id = u.user_id WHERE s.user_id = ? AND s.status = 'open'`, [session.user_id]);
      const allOpen = await query(`SELECT s.*, u.full_name FROM shifts s JOIN users u ON s.user_id = u.user_id WHERE s.status = 'open' ORDER BY s.started_at DESC`);
      return NextResponse.json({ myShift, allOpen });
    }

    if (view === 'report') {
      const dateFrom = searchParams.get('date_from') || new Date(Date.now() - 30*86400000).toISOString().slice(0,10);
      const dateTo = searchParams.get('date_to') || new Date().toISOString().slice(0,10);
      // Sales by cashier
      const byCashier = await query(`
        SELECT u.full_name, u.user_id,
          COUNT(DISTINCT sh.shift_id) as total_shifts,
          COUNT(s.sale_id) as total_sales,
          COALESCE(SUM(s.total_amount),0) as total_revenue,
          COALESCE(AVG(s.total_amount),0) as avg_sale,
          COALESCE(SUM(CASE WHEN s.payment_method='cash' THEN s.total_amount ELSE 0 END),0) as cash_revenue,
          COALESCE(SUM(CASE WHEN s.payment_method!='cash' THEN s.total_amount ELSE 0 END),0) as online_revenue
        FROM users u
        LEFT JOIN shifts sh ON sh.user_id = u.user_id AND date(sh.started_at) BETWEEN ? AND ?
        LEFT JOIN sales s ON s.user_id = u.user_id AND date(s.sale_date) BETWEEN ? AND ? AND s.payment_status='completed'
        WHERE u.is_active = 1 AND u.role != 'admin'
        GROUP BY u.user_id ORDER BY total_revenue DESC`, [dateFrom, dateTo, dateFrom, dateTo]);
      const shiftHistory = await query(`
        SELECT s.*, u.full_name FROM shifts s
        JOIN users u ON s.user_id = u.user_id
        WHERE date(s.started_at) BETWEEN ? AND ?
        ORDER BY s.started_at DESC LIMIT 50`, [dateFrom, dateTo]);
      return NextResponse.json({ byCashier, shiftHistory });
    }
    return NextResponse.json({ error: 'Invalid view' }, { status: 400 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { action, opening_cash, closing_cash, notes } = await req.json();

    if (action === 'start') {
      const existing = await queryOne(`SELECT shift_id FROM shifts WHERE user_id = ? AND status = 'open'`, [session.user_id]);
      if (existing) return NextResponse.json({ error: 'You already have an open shift' }, { status: 400 });
      const result = await execute(`INSERT INTO shifts (user_id, opening_cash, status, started_at) VALUES (?, ?, 'open', datetime('now'))`, [session.user_id, opening_cash || 0]);
      return NextResponse.json({ success: true, shift_id: result.lastInsertRowid });
    }

    if (action === 'end') {
      const shift = await queryOne<any>(`SELECT * FROM shifts WHERE user_id = ? AND status = 'open'`, [session.user_id]);
      if (!shift) return NextResponse.json({ error: 'No open shift' }, { status: 400 });
      const totals = await queryOne<any>(`
        SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount),0) as rev,
               COALESCE(SUM(CASE WHEN payment_method='cash' THEN total_amount ELSE 0 END),0) as cash_sales
        FROM sales WHERE shift_id = ? AND payment_status = 'completed'`, [shift.shift_id]);
      const expectedCash = shift.opening_cash + (totals?.cash_sales || 0);
      const diff = (closing_cash || 0) - expectedCash;
      await execute(
        `UPDATE shifts SET closing_cash=?, expected_cash=?, cash_difference=?, total_sales=?, total_revenue=?, notes=?, status='closed', ended_at=datetime('now') WHERE shift_id=?`,
        [closing_cash || 0, expectedCash, diff, totals?.cnt || 0, totals?.rev || 0, notes || null, shift.shift_id]
      );
      return NextResponse.json({ success: true, summary: { ...totals, expectedCash, diff, closing_cash, shift_id: shift.shift_id } });
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
