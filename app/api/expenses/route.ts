import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('date_from') || new Date(Date.now() - 30*86400000).toISOString().slice(0,10);
    const dateTo = searchParams.get('date_to') || new Date().toISOString().slice(0,10);
    const expenses = await query(
      `SELECT e.*, u.full_name FROM expenses e JOIN users u ON e.user_id = u.user_id
       WHERE date(e.expense_date) BETWEEN ? AND ? ORDER BY e.expense_date DESC`,
      [dateFrom, dateTo]
    );
    const summary = await queryOne<any>(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM expenses WHERE date(expense_date) BETWEEN ? AND ?`,
      [dateFrom, dateTo]
    );
    const byCategory = await query(
      `SELECT category, COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM expenses
       WHERE date(expense_date) BETWEEN ? AND ? GROUP BY category ORDER BY total DESC`,
      [dateFrom, dateTo]
    );
    return NextResponse.json({ expenses, summary, byCategory });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { category, description, amount, payment_method, reference, expense_date } = await req.json();
    if (!description || !amount) return NextResponse.json({ error: 'Description and amount required' }, { status: 400 });
    await execute(
      `INSERT INTO expenses (user_id, category, description, amount, payment_method, reference, expense_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [session.user_id, category || 'general', description, amount, payment_method || 'cash', reference || null,
       expense_date || new Date().toISOString()]
    );
    return NextResponse.json({ success: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
