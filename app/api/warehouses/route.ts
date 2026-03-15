import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireSession();
    const company_id = session.company_id ?? 1;
    const warehouses = await query(
      `SELECT * FROM warehouses WHERE company_id = ? ORDER BY is_default DESC, name`,
      [company_id]
    );
    return NextResponse.json({ warehouses });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const company_id = session.company_id ?? 1;
    if (!hasRole(session.role, 'manager')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { name, code, is_default } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    if (is_default) {
      await execute(`UPDATE warehouses SET is_default = 0 WHERE company_id = ?`, [company_id]);
    }
    const result = await execute(
      `INSERT INTO warehouses (company_id, name, code, is_default, created_at) VALUES (?, ?, ?, ?, datetime('now'))`,
      [company_id, name.trim(), (code || '').trim() || null, is_default ? 1 : 0]
    );
    return NextResponse.json({ success: true, warehouse_id: Number(result.lastInsertRowid) });
  } catch (e: unknown) {
    const msg = (e as Error).message || '';
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('UNIQUE') || msg.includes('unique constraint')) return NextResponse.json({ error: 'A warehouse with this name already exists' }, { status: 400 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
