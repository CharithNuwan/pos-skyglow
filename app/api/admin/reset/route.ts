import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!hasRole(session.role, 'admin')) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { scope } = await req.json();

    if (scope === 'all') {
      // Delete in correct order to respect foreign keys
      await execute(`DELETE FROM stock_logs`);
      await execute(`DELETE FROM warehouse_stock`);
      await execute(`DELETE FROM sale_items`);
      await execute(`DELETE FROM payments`);
      await execute(`DELETE FROM sales`);
      await execute(`DELETE FROM shifts`);
      await execute(`DELETE FROM cash_drawer`);
      await execute(`DELETE FROM expenses`);
      await execute(`DELETE FROM products`);
      await execute(`DELETE FROM categories`);
      await execute(`DELETE FROM suppliers`);
      await execute(`DELETE FROM customers`);
      // Reset auto-increment counters
      await execute(`DELETE FROM sqlite_sequence WHERE name IN ('products','categories','suppliers','customers','sales','sale_items','payments','stock_logs','shifts','cash_drawer','expenses')`);
      return NextResponse.json({ success: true, message: 'All data cleared' });
    }

    if (scope === 'products_only') {
      await execute(`DELETE FROM stock_logs`);
      await execute(`DELETE FROM warehouse_stock`);
      await execute(`DELETE FROM sale_items`);
      await execute(`DELETE FROM sales`);
      await execute(`DELETE FROM products`);
      await execute(`DELETE FROM sqlite_sequence WHERE name IN ('products','sales','sale_items','stock_logs')`);
      return NextResponse.json({ success: true, message: 'Products and sales cleared' });
    }

    if (scope === 'sales_only') {
      await execute(`DELETE FROM stock_logs WHERE movement_type = 'sale'`);
      await execute(`DELETE FROM sale_items`);
      await execute(`DELETE FROM payments`);
      await execute(`DELETE FROM sales`);
      await execute(`DELETE FROM sqlite_sequence WHERE name IN ('sales','sale_items','payments')`);
      return NextResponse.json({ success: true, message: 'Sales history cleared' });
    }

    return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
