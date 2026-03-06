import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireSession();
    const company_id = session.company_id || 1;

    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const [todaySales, totalProductsRow, lowStock, recentSales, topProducts] = await Promise.all([
      queryOne<{ total_orders: number; total_revenue: number }>(
        `SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue
         FROM sales WHERE company_id = ? AND date(sale_date) = ? AND payment_status = 'completed'`, [company_id, today]
      ),
      queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND (company_id = ? OR company_id IS NULL)`, [company_id]
      ),
      query(
        `SELECT p.product_name, p.quantity, p.minimum_stock, c.category_name
         FROM products p LEFT JOIN categories c ON p.category_id = c.category_id
         WHERE p.quantity <= p.minimum_stock AND p.is_active = 1 AND (p.company_id = ? OR p.company_id IS NULL)
         ORDER BY p.quantity ASC LIMIT 5`, [company_id]
      ),
      query(
        `SELECT s.invoice_number, s.total_amount, s.payment_method, s.payment_status, s.sale_date, u.full_name as cashier_name
         FROM sales s JOIN users u ON s.user_id = u.user_id
         WHERE s.company_id = ?
         ORDER BY s.sale_date DESC LIMIT 8`, [company_id]
      ),
      query(
        `SELECT p.product_name, SUM(si.quantity) as total_sold, SUM(si.total_price) as total_revenue
         FROM sale_items si JOIN products p ON si.product_id = p.product_id
         JOIN sales s ON si.sale_id = s.sale_id
         WHERE s.company_id = ? AND s.payment_status = 'completed' AND date(s.sale_date) >= ?
         GROUP BY si.product_id ORDER BY total_sold DESC LIMIT 5`, [company_id, thirtyDaysAgo]
      ),
    ]);

    return NextResponse.json({
      todaySales,
      totalProducts: totalProductsRow?.count ?? 0,
      lowStock,
      recentSales,
      topProducts,
    });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Dashboard error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
