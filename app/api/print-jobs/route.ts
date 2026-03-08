import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Create a print job (called by POS after sale, test print, or font size check from Settings). */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { type = 'receipt', payload } = body;
    const isFontSizeCheck = type === 'font_size_check';
    const payloadObj = payload && typeof payload === 'object' ? payload : (isFontSizeCheck ? { shop_name: 'Shop' } : null);
    if (!payloadObj) {
      return NextResponse.json({ error: 'payload required (object)' }, { status: 400 });
    }
    // Test receipts (invoice_number starts with TEST-) and font_size_check go to company 1 so default "test" token works
    const isTestReceipt = typeof payloadObj.invoice_number === 'string' && payloadObj.invoice_number.startsWith('TEST-');
    const company_id = isTestReceipt || isFontSizeCheck ? 1 : (session.company_id ?? 1);
    const jobType = type === 'label' ? 'label' : (type === 'font_size_check' ? 'font_size_check' : 'receipt');
    await execute(
      `INSERT INTO print_jobs (company_id, type, status, payload) VALUES (?, ?, 'pending', ?)`,
      [company_id, jobType, JSON.stringify(payloadObj)]
    );
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
