import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    if (!hasRole(session.role, 'manager')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const id = parseInt(params.id);
    const data = await req.json();
    await execute(
      `UPDATE products SET barcode=?, product_name=?, short_name=?, pack_size=?, category_id=?, supplier_id=?, cost_price=?, selling_price=?, quantity=?, minimum_stock=?, description=?, is_active=?, updated_at=datetime('now') WHERE product_id=?`,
      [data.barcode || null, data.product_name, data.short_name || null, data.pack_size || 1, data.category_id || null, data.supplier_id || null, data.cost_price, data.selling_price, data.quantity, data.minimum_stock || 5, data.description || null, data.is_active ?? 1, id]
    );
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    if (!hasRole(session.role, 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const id = parseInt(params.id);
    await execute(`UPDATE products SET is_active = 0 WHERE product_id = ?`, [id]);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
