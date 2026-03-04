import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    if (!hasRole(session.role, 'manager')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { category_name, description, is_active } = await req.json();
    await execute(
      `UPDATE categories SET category_name=?, description=?, is_active=?, updated_at=datetime('now') WHERE category_id=?`,
      [category_name, description || null, is_active ?? 1, parseInt(params.id)]
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
    await execute(`UPDATE categories SET is_active = 0 WHERE category_id = ?`, [parseInt(params.id)]);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
