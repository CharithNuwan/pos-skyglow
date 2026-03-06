import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';
import bcrypt from 'bcryptjs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireSuperAdmin();
    // Auto-create companies table if missing
    try { await execute(`CREATE TABLE IF NOT EXISTS companies (company_id INTEGER PRIMARY KEY AUTOINCREMENT, company_name TEXT NOT NULL, slug TEXT UNIQUE, plan TEXT DEFAULT 'standard', max_users INTEGER DEFAULT 10, max_products INTEGER DEFAULT 500, is_active INTEGER DEFAULT 1, notes TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`); } catch {}
    // Seed company 1 if missing
    try { await execute(`INSERT OR IGNORE INTO companies (company_id,company_name,slug,plan,is_active) VALUES (1,(SELECT COALESCE(setting_value,'My Shop') FROM settings WHERE setting_key='shop_name' LIMIT 1),'default','standard',1)`); } catch {}

    const companies = await query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM users u WHERE u.company_id = c.company_id AND u.role != 'superadmin') as user_count,
        (SELECT COUNT(*) FROM products p WHERE p.company_id = c.company_id) as product_count,
        (SELECT COUNT(*) FROM sales s WHERE s.company_id = c.company_id AND s.payment_status='completed') as sale_count,
        (SELECT COALESCE(SUM(s.total_amount),0) FROM sales s WHERE s.company_id = c.company_id AND s.payment_status='completed') as total_revenue,
        (SELECT COUNT(*) FROM sales s WHERE s.company_id = c.company_id AND date(s.sale_date)=date('now')) as today_sales
      FROM companies c ORDER BY c.created_at DESC`);
    return NextResponse.json({ companies });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const { company_name, slug, plan, max_users, max_products, admin_username, admin_email, admin_password, admin_name, notes } = await req.json();
    if (!company_name || !admin_username || !admin_password) return NextResponse.json({ error: 'Company name, admin username and password required' }, { status: 400 });

    // Check slug uniqueness
    const cleanSlug = (slug || company_name).toLowerCase().replace(/[^a-z0-9]/g, '-');
    const existing = await queryOne(`SELECT company_id FROM companies WHERE slug = ?`, [cleanSlug]);
    if (existing) return NextResponse.json({ error: 'Slug already taken' }, { status: 400 });

    // Create company
    const companyResult = await execute(
      `INSERT INTO companies (company_name, slug, plan, max_users, max_products, notes) VALUES (?,?,?,?,?,?)`,
      [company_name, cleanSlug, plan||'standard', max_users||10, max_products||500, notes||null]
    );
    const company_id = Number(companyResult.lastInsertRowid);

    // Create default settings for company
    const settingPairs = [
      ['shop_name', company_name], ['currency_symbol', 'Rs'], ['tax_rate', '0'],
      ['receipt_header', company_name], ['barcode_sound', '1'],
    ];
    for (const [k, v] of settingPairs) {
      await execute(`INSERT OR IGNORE INTO settings (company_id, setting_key, setting_value) VALUES (?,?,?)`, [company_id, k, v]);
    }

    // Create admin user for this company
    const hash = await bcrypt.hash(admin_password, 10);
    await execute(
      `INSERT INTO users (company_id, username, email, password_hash, full_name, role, is_active) VALUES (?,?,?,?,?,?,1)`,
      [company_id, admin_username, admin_email||`${admin_username}@${cleanSlug}.local`, hash, admin_name||admin_username, 'admin']
    );

    return NextResponse.json({ success: true, company_id });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
