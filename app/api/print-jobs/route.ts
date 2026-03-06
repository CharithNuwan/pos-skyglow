import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Create a print job (called by POS after sale). */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const company_id = session.company_id ?? 1;
    const body = await req.json();
    const { type = 'receipt', payload } = body;
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'payload required (object)' }, { status: 400 });
    }
    await execute(
      `INSERT INTO print_jobs (company_id, type, status, payload) VALUES (?, ?, 'pending', ?)`,
      [company_id, type === 'label' ? 'label' : 'receipt', JSON.stringify(payload)]
    );
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
