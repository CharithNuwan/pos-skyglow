import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireSession();
    if (!hasRole(session.role, 'manager')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const products = await query(`
      SELECT p.barcode, p.product_name, c.category_name, p.cost_price, p.selling_price,
             p.quantity, p.minimum_stock, p.description, p.is_active
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.is_active = 1
      ORDER BY p.product_name
    `);

    // Build CSV
    const headers = ['barcode', 'product_name', 'category_name', 'cost_price', 'selling_price', 'quantity', 'minimum_stock', 'description', 'is_active'];
    const rows = (products as any[]).map(p =>
      headers.map(h => {
        const val = p[h] ?? '';
        // Quote fields that contain commas or quotes
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="products-${new Date().toISOString().slice(0,10)}.csv"`,
      },
    });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
