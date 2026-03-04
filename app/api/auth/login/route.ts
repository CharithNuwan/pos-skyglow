import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { createSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const field = username.includes('@') ? 'email' : 'username';
    const user = await queryOne<{
      user_id: number; username: string; email: string;
      password_hash: string; full_name: string; role: string; is_active: number;
    }>(
      `SELECT user_id, username, email, password_hash, full_name, role, is_active FROM users WHERE ${field} = ? AND is_active = 1`,
      [username]
    );

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const sessionUser = {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role as 'admin' | 'manager' | 'cashier',
    };

    const token = await createSession(sessionUser);

    // Update last login
    await execute(`UPDATE users SET last_login = datetime('now') WHERE user_id = ?`, [user.user_id]);

    const response = NextResponse.json({ success: true, user: sessionUser });
    response.cookies.set('pos_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    });
    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
