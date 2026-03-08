import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Validate token against settings. Returns company_id or null. */
async function validatePrintToken(token: string): Promise<number | null> {
  if (!token?.trim()) return null;
  const t = token.trim();
  // Built-in test token: only valid for company_id 1, so test print from web works without saving a token.
  if (t === 'test') return 1;
  const row = await queryOne<{ company_id: number }>(
    `SELECT company_id FROM settings WHERE setting_key = 'print_api_token' AND setting_value = ? LIMIT 1`,
    [t]
  );
  return row ? Number(row.company_id) : null;
}

/**
 * Polled by Android. Returns pending jobs and atomically marks them as 'printing'
 * so only one device can process each job.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || '';
    const companyIdParam = searchParams.get('company_id');
    const company_id = companyIdParam ? parseInt(companyIdParam, 10) : 1;

    const allowedCompany = await validatePrintToken(token);
    if (allowedCompany == null) {
      return NextResponse.json({ error: 'Invalid or missing token' }, { status: 401 });
    }
    // Test token is only allowed for company_id 1
    if (token.trim() === 'test' && company_id !== 1) {
      return NextResponse.json({ error: 'Test token only allowed for company_id 1' }, { status: 403 });
    }
    if (company_id !== allowedCompany) {
      return NextResponse.json({ error: 'Company not allowed for this token' }, { status: 403 });
    }

    // Atomic claim: update pending -> printing (limit 10 per poll)
    await execute(
      `UPDATE print_jobs SET status = 'printing'
       WHERE job_id IN (
         SELECT job_id FROM print_jobs
         WHERE status = 'pending' AND company_id = ?
         ORDER BY job_id ASC LIMIT 10
       )`,
      [company_id]
    );

    const jobs = await query<{ job_id: number; type: string; payload: string }>(
      `SELECT job_id, type, payload FROM print_jobs
       WHERE status = 'printing' AND company_id = ? AND printed_at IS NULL
       ORDER BY job_id ASC`,
      [company_id]
    );

    const result = jobs.map((j) => ({
      job_id: j.job_id,
      type: j.type,
      payload: typeof j.payload === 'string' ? JSON.parse(j.payload) : j.payload,
    }));

    return NextResponse.json({ jobs: result });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
