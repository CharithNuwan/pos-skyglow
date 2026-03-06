import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';

export async function GET() {
  try {
    await requireSession();
    const categories = await query(`SELECT * FROM categories WHERE is_active = 1 AND company_id = ? ORDER BY category_name`);
    return NextResponse.json({ categories });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const company_id = session.company_id || 1;
    if (!hasRole(session.role, 'manager')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { category_name, description } = await req.json();
    if (!category_name) return NextResponse.json({ error: 'Category name required' }, { status: 400 });
    const result = await execute(
      `INSERT INTO categories (category_name, description, is_active, created_at, updated_at) VALUES (?, ?, 1, datetime('now'), datetime('now'))`,
      [category_name, description || null]
    );
    return NextResponse.json({ success: true, category_id: Number(result.lastInsertRowid) });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
