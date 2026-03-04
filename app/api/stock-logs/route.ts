import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'adjustment';
    const logs = await query(
      `SELECT sl.*, p.product_name, u.full_name FROM stock_logs sl
       JOIN products p ON sl.product_id = p.product_id
       JOIN users u ON sl.user_id = u.user_id
       WHERE sl.movement_type = ?
       ORDER BY sl.created_at DESC LIMIT 50`,
      [type]
    );
    return NextResponse.json({ logs });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
