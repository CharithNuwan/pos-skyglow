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

    // Always update if exists, insert if not
    const existing = await queryOne<any>(`SELECT user_id FROM users WHERE username = 'superadmin'`);
    if (existing) {
      await execute(
        `UPDATE users SET password_hash=?, role='superadmin', company_id=0, is_active=1 WHERE username='superadmin'`,
        [hash]
      );
    } else {
      await execute(
        `INSERT INTO users (username,email,password_hash,full_name,role,company_id,is_active) VALUES ('superadmin','super@admin.local',?,'Super Admin','superadmin',0,1)`,
        [hash]
      );
    }

    // Fix default company slug
    try { await execute(`UPDATE companies SET slug=LOWER(REPLACE(REPLACE(company_name,' ','-'),'''','')) WHERE company_id=1 AND (slug='default' OR slug IS NULL)`); } catch {}

    // Create companies table if missing
    await execute(`CREATE TABLE IF NOT EXISTS companies (
      company_id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      slug TEXT UNIQUE,
      plan TEXT DEFAULT 'standard',
      max_users INTEGER DEFAULT 10,
      max_products INTEGER DEFAULT 500,
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`);

    // Seed company 1 from settings if missing
    try { await execute(`INSERT OR IGNORE INTO companies (company_id, company_name, slug, plan, is_active)
      VALUES (1, (SELECT COALESCE(setting_value,'My Shop') FROM settings WHERE setting_key='shop_name' LIMIT 1), 'default', 'standard', 1)`); } catch {}

    // Add company_id columns if missing (safe - errors ignored by migrate)
    const tables = ['users','products','categories','suppliers','customers','sales','expenses','cash_drawer','shifts'];
    for (const t of tables) {
      try { await execute(`ALTER TABLE ${t} ADD COLUMN company_id INTEGER DEFAULT 1`); } catch {}
    }
    // Backfill
    for (const t of tables) {
      try { await execute(`UPDATE ${t} SET company_id=1 WHERE company_id IS NULL`); } catch {}
    }

    // Create product_batches table if missing
    await execute(`CREATE TABLE IF NOT EXISTS product_batches (
      batch_id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL DEFAULT 1,
      batch_number TEXT NOT NULL,
      barcode TEXT UNIQUE,
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 0,
      received_date TEXT DEFAULT (date('now')),
      expiry_date TEXT,
      notes TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`);

    return NextResponse.json({
      success: true,
      message: 'Setup complete. Login at /superadmin/login with superadmin / superadmin123'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
