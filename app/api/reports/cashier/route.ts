import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const company_id = session.company_id || 1;
    if (!hasRole(session.role, 'manager')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('date_from') || new Date(Date.now() - 30*86400000).toISOString().slice(0,10);
    const dateTo = searchParams.get('date_to') || new Date().toISOString().slice(0,10);

    const cashierStats = await query(
      `SELECT u.user_id, u.full_name, u.username, u.role,
              COUNT(s.sale_id) as total_sales,
              COALESCE(SUM(s.total_amount),0) as total_revenue,
              COALESCE(AVG(s.total_amount),0) as avg_sale,
              COALESCE(SUM(s.discount_amount),0) as total_discounts,
              COALESCE(SUM(CASE WHEN s.payment_method='cash' THEN s.total_amount ELSE 0 END),0) as cash_sales,
              COALESCE(SUM(CASE WHEN s.payment_method='card' THEN s.total_amount ELSE 0 END),0) as card_sales,
              COALESCE(SUM(CASE WHEN s.payment_method='online' THEN s.total_amount ELSE 0 END),0) as online_sales,
              MIN(s.sale_date) as first_sale, MAX(s.sale_date) as last_sale
       FROM users u
       LEFT JOIN sales s ON s.user_id = u.user_id AND s.company_id = ? AND date(s.sale_date) BETWEEN ? AND ? AND s.payment_status = 'completed'
       WHERE u.is_active = 1 AND u.company_id = ?
       GROUP BY u.user_id ORDER BY total_revenue DESC`,
      [company_id, dateFrom, dateTo, company_id]
    );

    const shiftStats = await query(
      `SELECT s.*, u.full_name,
              ROUND((julianday(COALESCE(s.ended_at, datetime('now'))) - julianday(s.started_at)) * 24, 1) as hours_worked
       FROM shifts s JOIN users u ON s.user_id = u.user_id
       WHERE s.company_id = ? AND date(s.started_at) BETWEEN ? AND ?
       ORDER BY s.started_at DESC`,
      [company_id, dateFrom, dateTo]
    );

    const dailySales = await query(
      `SELECT date(s.sale_date) as day, u.full_name, u.user_id,
              COUNT(*) as sales_count, SUM(s.total_amount) as revenue
       FROM sales s JOIN users u ON s.user_id = u.user_id
       WHERE s.company_id = ? AND date(s.sale_date) BETWEEN ? AND ? AND s.payment_status = 'completed'
       GROUP BY date(s.sale_date), s.user_id ORDER BY day DESC, revenue DESC`,
      [company_id, dateFrom, dateTo]
    );

    return NextResponse.json({ cashierStats, shiftStats, dailySales, dateFrom, dateTo });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
