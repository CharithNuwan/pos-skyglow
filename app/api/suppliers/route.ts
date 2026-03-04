import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    let sql = `SELECT s.*, COUNT(p.product_id) as product_count FROM suppliers s LEFT JOIN products p ON p.supplier_id = s.supplier_id WHERE s.is_active = 1`;
    const args: any[] = [];
    if (search) { sql += ` AND (s.supplier_name LIKE ? OR s.phone LIKE ?)`; args.push(`%${search}%`, `%${search}%`); }
    sql += ` GROUP BY s.supplier_id ORDER BY s.supplier_name`;
    const suppliers = await query(sql, args);
    return NextResponse.json({ suppliers });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!hasRole(session.role, 'manager')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { supplier_name, contact_person, phone, email, address, notes } = await req.json();
    if (!supplier_name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const result = await execute(
      `INSERT INTO suppliers (supplier_name, contact_person, phone, email, address, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [supplier_name, contact_person || null, phone || null, email || null, address || null, notes || null]
    );
    return NextResponse.json({ success: true, supplier_id: result.lastInsertRowid });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
