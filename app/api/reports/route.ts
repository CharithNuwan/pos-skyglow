import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!hasRole(session.role, 'manager')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('date_from') || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const dateTo = searchParams.get('date_to') || new Date().toISOString().slice(0, 10);

    const [summary, dailySales, topProducts, topCategories, paymentMethods] = await Promise.all([
      queryOne(`SELECT COUNT(*) as total_orders, COALESCE(SUM(subtotal),0) as total_subtotal, COALESCE(SUM(tax_amount),0) as total_tax, COALESCE(SUM(discount_amount),0) as total_discount, COALESCE(SUM(total_amount),0) as total_revenue, COALESCE(AVG(total_amount),0) as avg_order FROM sales WHERE date(sale_date) BETWEEN ? AND ? AND payment_status='completed'`, [dateFrom, dateTo]),
      query(`SELECT date(sale_date) as date, COUNT(*) as orders, SUM(total_amount) as revenue FROM sales WHERE date(sale_date) BETWEEN ? AND ? AND payment_status='completed' GROUP BY date(sale_date) ORDER BY date`, [dateFrom, dateTo]),
      query(`SELECT p.product_name, SUM(si.quantity) as quantity_sold, SUM(si.total_price) as revenue FROM sale_items si JOIN products p ON si.product_id=p.product_id JOIN sales s ON si.sale_id=s.sale_id WHERE date(s.sale_date) BETWEEN ? AND ? AND s.payment_status='completed' GROUP BY si.product_id ORDER BY quantity_sold DESC LIMIT 10`, [dateFrom, dateTo]),
      query(`SELECT c.category_name, SUM(si.quantity) as quantity_sold, SUM(si.total_price) as revenue FROM sale_items si JOIN products p ON si.product_id=p.product_id JOIN categories c ON p.category_id=c.category_id JOIN sales s ON si.sale_id=s.sale_id WHERE date(s.sale_date) BETWEEN ? AND ? AND s.payment_status='completed' GROUP BY c.category_id ORDER BY revenue DESC LIMIT 5`, [dateFrom, dateTo]),
      query(`SELECT payment_method, COUNT(*) as count, SUM(total_amount) as amount FROM sales WHERE date(sale_date) BETWEEN ? AND ? AND payment_status='completed' GROUP BY payment_method`, [dateFrom, dateTo]),
    ]);

    return NextResponse.json({ summary, dailySales, topProducts, topCategories, paymentMethods });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
