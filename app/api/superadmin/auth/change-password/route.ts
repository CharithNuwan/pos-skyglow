import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';
import bcrypt from 'bcryptjs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const { current, newPassword } = await req.json();
    const user = await queryOne<any>(`SELECT password_hash FROM users WHERE user_id = ?`, [session.user_id]);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const valid = await bcrypt.compare(current, user.password_hash);
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    const hash = await bcrypt.hash(newPassword, 10);
    await execute(`UPDATE users SET password_hash = ? WHERE user_id = ?`, [hash, session.user_id]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
