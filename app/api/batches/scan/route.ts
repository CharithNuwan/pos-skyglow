import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireSession } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const company_id = session.company_id || 1;
    const barcode = new URL(req.url).searchParams.get('barcode');
    if (!barcode) return NextResponse.json({ error: 'barcode required' }, { status: 400 });

    const batch = await queryOne<any>(`
      SELECT b.*, p.product_name, p.product_id, p.barcode as product_barcode, c.category_name
      FROM product_batches b
      JOIN products p ON b.product_id = p.product_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE b.barcode=? AND b.company_id=?`, [barcode, company_id]);

    if (!batch) return NextResponse.json({ found: false });

    // ── BLOCK: Expired (only if expiry_date is set)
    if (batch.expiry_date && new Date(batch.expiry_date) < new Date()) {
      return NextResponse.json({
        found: true, blocked: true, reason: 'expired',
        message: `❌ EXPIRED — Batch ${batch.batch_number} expired on ${new Date(batch.expiry_date).toLocaleDateString('en-GB')}. Sale not allowed.`,
        batch,
      });
    }

    // ── BLOCK: Out of stock
    if (batch.quantity <= 0) {
      return NextResponse.json({
        found: true, blocked: true, reason: 'depleted',
        message: `❌ Out of stock — Batch ${batch.batch_number} has no remaining quantity.`,
        batch,
      });
    }

    // ── BLOCK: Inactive/suspended
    if (batch.status !== 'active') {
      return NextResponse.json({
        found: true, blocked: true, reason: 'inactive',
        message: `❌ Batch ${batch.batch_number} is ${batch.status}. Sale not allowed.`,
        batch,
      });
    }

    // ── WARNING: Expiring within 7 days
    let warning = null;
    if (batch.expiry_date) {
      const daysLeft = Math.ceil((new Date(batch.expiry_date).getTime() - Date.now()) / 86400000);
      if (daysLeft <= 7) {
        warning = `⚠️ Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} (${new Date(batch.expiry_date).toLocaleDateString('en-GB')})`;
      }
    }

    return NextResponse.json({ found: true, blocked: false, warning, batch });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
