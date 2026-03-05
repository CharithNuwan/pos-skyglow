import { NextRequest, NextResponse } from 'next/server';
import { execute, queryOne } from '@/lib/db';
import bcrypt from 'bcryptjs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    const setupKey = process.env.SETUP_KEY || 'setup-superadmin-now';
    if (key !== setupKey) return NextResponse.json({ error: 'Invalid key. Add ?key=setup-superadmin-now' }, { status: 403 });

    const hash = await bcrypt.hash('superadmin123', 10);
    const existing = await queryOne<any>(`SELECT user_id FROM users WHERE username = 'superadmin'`);

    if (existing) {
      await execute(`UPDATE users SET password_hash=?, role='superadmin', company_id=0, is_active=1 WHERE username='superadmin'`, [hash]);
    } else {
      await execute(`INSERT INTO users (username,email,password_hash,full_name,role,company_id,is_active) VALUES ('superadmin','super@admin.local',?,'Super Admin','superadmin',0,1)`, [hash]);
    }

    // Also fix default company slug to use actual company name
    await execute(`UPDATE companies SET slug = LOWER(REPLACE(REPLACE(company_name, ' ', '-'), '''', '')) WHERE company_id = 1 AND slug = 'default'`);

    return NextResponse.json({ success: true, message: 'Superadmin ready + company slug fixed. Login at /superadmin/login' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
