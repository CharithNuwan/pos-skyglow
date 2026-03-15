import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const company_id = session.company_id || 1;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'adjustment';
    const logs = await query(
      `SELECT sl.*, p.product_name, u.full_name FROM stock_logs sl
       JOIN products p ON sl.product_id = p.product_id
       LEFT JOIN users u ON sl.user_id = u.user_id
       WHERE sl.movement_type = ? AND (p.company_id = ? OR p.company_id IS NULL)
       ORDER BY sl.created_at DESC LIMIT 50`,
      [type, company_id]
    );
    return NextResponse.json({ logs });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
