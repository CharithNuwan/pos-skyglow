import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const company_id = session.company_id ?? 1;
    const { id } = params;
    const warehouse = await queryOne(
      `SELECT * FROM warehouses WHERE warehouse_id = ? AND company_id = ?`,
      [parseInt(id, 10), company_id]
    );
    if (!warehouse) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    return NextResponse.json(warehouse);
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const company_id = session.company_id ?? 1;
    if (!hasRole(session.role, 'manager')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = params;
    const warehouse_id = parseInt(id, 10);
    const existing = await queryOne(`SELECT * FROM warehouses WHERE warehouse_id = ? AND company_id = ?`, [warehouse_id, company_id]);
    if (!existing) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    const { name, code, is_default } = await req.json();
    if (name !== undefined && typeof name === 'string' && !name.trim()) return NextResponse.json({ error: 'Name cannot be blank' }, { status: 400 });
    if (is_default) {
      await execute(`UPDATE warehouses SET is_default = 0 WHERE company_id = ? AND warehouse_id != ?`, [company_id, warehouse_id]);
    }
    await execute(
      `UPDATE warehouses SET name = COALESCE(?, name), code = COALESCE(?, code), is_default = COALESCE(?, is_default) WHERE warehouse_id = ? AND company_id = ?`,
      [name?.trim() ?? existing.name, code !== undefined ? (code?.trim() || null) : existing.code, is_default !== undefined ? (is_default ? 1 : 0) : existing.is_default, warehouse_id, company_id]
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
    const company_id = session.company_id ?? 1;
    if (!hasRole(session.role, 'manager')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = params;
    const warehouse_id = parseInt(id, 10);
    const existing = await queryOne(`SELECT * FROM warehouses WHERE warehouse_id = ? AND company_id = ?`, [warehouse_id, company_id]);
    if (!existing) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });
    const stock = await queryOne<{ total: number }>(`SELECT COUNT(*) as total FROM warehouse_stock WHERE warehouse_id = ?`, [warehouse_id]);
    if (stock && Number(stock.total) > 0) {
      return NextResponse.json({ error: 'Cannot delete warehouse with stock. Transfer or adjust stock first.' }, { status: 400 });
    }
    await execute(`DELETE FROM warehouses WHERE warehouse_id = ? AND company_id = ?`, [warehouse_id, company_id]);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
