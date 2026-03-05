import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { requireSession } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const company_id = session.company_id || 1;
    const body = await req.json();
    const batch = await queryOne<any>(`SELECT * FROM product_batches WHERE batch_id=? AND company_id=?`, [params.id, company_id]);
    if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (body.barcode && body.barcode !== batch.barcode) {
      const dup = await queryOne(`SELECT batch_id FROM product_batches WHERE barcode=? AND batch_id!=?`, [body.barcode, params.id]);
      if (dup) return NextResponse.json({ error: 'Barcode already used' }, { status: 400 });
    }
    await execute(
      `UPDATE product_batches SET batch_number=?,barcode=?,cost_price=?,selling_price=?,quantity=?,received_date=?,expiry_date=?,notes=?,status=?,updated_at=datetime('now') WHERE batch_id=?`,
      [body.batch_number, body.barcode, body.cost_price, body.selling_price, body.quantity, body.received_date, body.expiry_date||null, body.notes||null, body.status||'active', params.id]
    );
    await execute(`UPDATE products SET quantity=(SELECT COALESCE(SUM(quantity),0) FROM product_batches WHERE product_id=? AND status='active') WHERE product_id=?`, [batch.product_id, batch.product_id]);
    return NextResponse.json({ success: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const company_id = session.company_id || 1;
    const batch = await queryOne<any>(`SELECT * FROM product_batches WHERE batch_id=? AND company_id=?`, [params.id, company_id]);
    if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await execute(`DELETE FROM product_batches WHERE batch_id=?`, [params.id]);
    await execute(`UPDATE products SET quantity=(SELECT COALESCE(SUM(quantity),0) FROM product_batches WHERE product_id=? AND status='active') WHERE product_id=?`, [batch.product_id, batch.product_id]);
    return NextResponse.json({ success: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
