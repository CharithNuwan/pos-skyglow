import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireSession();
    const company_id = session.company_id || 1;
    const settings = await query(
      `SELECT setting_key, setting_value FROM settings WHERE company_id = ?`,
      [company_id]
    );
    const map = Object.fromEntries((settings as any[]).map((s: any) => [s.setting_key, s.setting_value]));
    return NextResponse.json(map);
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const company_id = session.company_id || 1;
    if (!hasRole(session.role, 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const updates = await req.json();
    for (const [key, value] of Object.entries(updates)) {
      const existing = await queryOne<{ setting_id: number }>(
        `SELECT setting_id FROM settings WHERE company_id = ? AND setting_key = ?`,
        [company_id, key]
      );
      if (existing) {
        await execute(
          `UPDATE settings SET setting_value = ?, updated_at = datetime('now') WHERE company_id = ? AND setting_key = ?`,
          [String(value), company_id, key]
        );
      } else {
        try {
          await execute(
            `INSERT INTO settings (company_id, setting_key, setting_value, updated_at) VALUES (?, ?, ?, datetime('now'))`,
            [company_id, key, String(value)]
          );
        } catch (insertErr: unknown) {
          const msg = String((insertErr as Error).message || '').toLowerCase();
          if (msg.includes('unique') && msg.includes('setting')) {
            await execute(
              `UPDATE settings SET setting_value = ?, company_id = ? WHERE setting_key = ?`,
              [String(value), company_id, key]
            );
          } else {
            throw insertErr;
          }
        }
      }
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
