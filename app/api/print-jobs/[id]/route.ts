import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function validatePrintToken(token: string): Promise<number | null> {
  if (!token?.trim()) return null;
  const row = await queryOne<{ company_id: number }>(
    `SELECT company_id FROM settings WHERE setting_key = 'print_api_token' AND setting_value = ? LIMIT 1`,
    [token.trim()]
  );
  return row ? Number(row.company_id) : null;
}

/** Mark a print job as done or failed (called by Android after printing). */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.headers.get('x-print-token') || new URL(req.url).searchParams.get('token') || '';
    const allowedCompany = await validatePrintToken(token);
    if (allowedCompany == null) {
      return NextResponse.json({ error: 'Invalid or missing token' }, { status: 401 });
    }

    const jobId = parseInt(params.id, 10);
    if (isNaN(jobId)) {
      return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const status = body.status === 'failed' ? 'failed' : 'done';

    const updated = await execute(
      `UPDATE print_jobs SET status = ?, printed_at = datetime('now')
       WHERE job_id = ? AND company_id = ?`,
      [status, jobId, allowedCompany]
    );

    if (updated.rowsAffected === 0) {
      return NextResponse.json({ error: 'Job not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
