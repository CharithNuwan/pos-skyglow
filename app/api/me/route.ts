import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Returns the current user's company_id (for display in Settings / Print Bridge). */
export async function GET() {
  try {
    const session = await requireSession();
    return NextResponse.json({
      company_id: session.company_id ?? 1,
      company_name: session.company_name,
    });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
