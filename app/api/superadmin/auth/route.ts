import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { createSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    const user = await queryOne<any>(
      `SELECT * FROM users WHERE username = ? AND role = 'superadmin' AND is_active = 1`, [username]
    );
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const sessionUser = { user_id: user.user_id, username: user.username, email: user.email, full_name: user.full_name, role: 'superadmin' as any, company_id: 0 };
    const token = await createSession(sessionUser);
    await execute(`UPDATE users SET last_login = datetime('now') WHERE user_id = ?`, [user.user_id]);

    const response = NextResponse.json({ success: true });
    response.cookies.set('sa_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60*60*8, path: '/' });
    return response;
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('sa_session');
  return response;
}
