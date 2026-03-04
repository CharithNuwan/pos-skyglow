import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    if (!hasRole(session.role, 'manager')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const id = parseInt(params.id);
    const { supplier_name, contact_person, phone, email, address, notes, is_active } = await req.json();
    await execute(
      `UPDATE suppliers SET supplier_name=?, contact_person=?, phone=?, email=?, address=?, notes=?, is_active=?, updated_at=datetime('now') WHERE supplier_id=?`,
      [supplier_name, contact_person || null, phone || null, email || null, address || null, notes || null, is_active ?? 1, id]
    );
    return NextResponse.json({ success: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
