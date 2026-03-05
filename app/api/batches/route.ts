import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireSession } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const company_id = session.company_id || 1;
    const { searchParams } = new URL(req.url);
    const product_id = searchParams.get('product_id');
    const expiring_soon = searchParams.get('expiring_soon');

    if (expiring_soon) {
      const batches = await query(`
        SELECT b.*, p.product_name FROM product_batches b
        JOIN products p ON b.product_id = p.product_id
        WHERE b.company_id=? AND b.status='active' AND b.quantity>0
          AND b.expiry_date IS NOT NULL
          AND date(b.expiry_date) <= date('now','+30 days')
          AND date(b.expiry_date) >= date('now')
        ORDER BY b.expiry_date ASC`, [company_id]);
      const expired = await query(`
        SELECT b.*, p.product_name FROM product_batches b
        JOIN products p ON b.product_id = p.product_id
        WHERE b.company_id=? AND b.quantity>0
          AND b.expiry_date IS NOT NULL AND date(b.expiry_date) < date('now')
        ORDER BY b.expiry_date ASC`, [company_id]);
      return NextResponse.json({ expiring_soon: batches, expired });
    }

    if (product_id) {
      const batches = await query(`SELECT * FROM product_batches WHERE product_id=? AND company_id=? ORDER BY received_date ASC, batch_id ASC`, [product_id, company_id]);
      return NextResponse.json({ batches });
    }
    return NextResponse.json({ error: 'product_id required' }, { status: 400 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const company_id = session.company_id || 1;
    const { product_id, batch_number, barcode, cost_price, selling_price, quantity, received_date, expiry_date, notes } = await req.json();
    if (!product_id || !batch_number || !barcode) return NextResponse.json({ error: 'product_id, batch_number and barcode required' }, { status: 400 });
    const existing = await queryOne(`SELECT batch_id FROM product_batches WHERE barcode=?`, [barcode]);
    if (existing) return NextResponse.json({ error: 'Barcode already used by another batch' }, { status: 400 });
    const result = await execute(
      `INSERT INTO product_batches (product_id,company_id,batch_number,barcode,cost_price,selling_price,quantity,received_date,expiry_date,notes,status) VALUES (?,?,?,?,?,?,?,?,?,?,'active')`,
      [product_id, company_id, batch_number, barcode, cost_price||0, selling_price||0, quantity||0, received_date||new Date().toISOString().slice(0,10), expiry_date||null, notes||null]
    );
    await execute(`UPDATE products SET quantity=(SELECT COALESCE(SUM(quantity),0) FROM product_batches WHERE product_id=? AND status='active') WHERE product_id=?`, [product_id, product_id]);
    return NextResponse.json({ success: true, batch_id: result.lastInsertRowid });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
