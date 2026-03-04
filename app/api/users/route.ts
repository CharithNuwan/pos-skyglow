import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const session = await requireSession();
    if (!hasRole(session.role, 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const users = await query(`SELECT user_id, username, email, full_name, phone, role, is_active, last_login, created_at FROM users ORDER BY created_at DESC`);
    return NextResponse.json({ users });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!hasRole(session.role, 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { username, email, password, full_name, phone, role } = await req.json();
    if (!username || !email || !password || !full_name) return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    const hash = await bcrypt.hash(password, 10);
    const result = await execute(
      `INSERT INTO users (username, email, password_hash, full_name, phone, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      [username, email, hash, full_name, phone || null, role || 'cashier']
    );
    return NextResponse.json({ success: true, user_id: result.lastInsertRowid });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
