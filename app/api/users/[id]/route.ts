import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    if (!hasRole(session.role, 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { username, email, password, full_name, phone, role, is_active } = await req.json();
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await execute(`UPDATE users SET username=?, email=?, password_hash=?, full_name=?, phone=?, role=?, is_active=?, updated_at=datetime('now') WHERE user_id=?`, [username, email, hash, full_name, phone || null, role, is_active ?? 1, parseInt(params.id)]);
    } else {
      await execute(`UPDATE users SET username=?, email=?, full_name=?, phone=?, role=?, is_active=?, updated_at=datetime('now') WHERE user_id=?`, [username, email, full_name, phone || null, role, is_active ?? 1, parseInt(params.id)]);
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
