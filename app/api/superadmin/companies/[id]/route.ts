import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';
import bcrypt from 'bcryptjs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const id = params.id;
    const company = await queryOne(`SELECT * FROM companies WHERE company_id = ?`, [id]);
    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const users = await query(`SELECT user_id, username, email, full_name, role, is_active, last_login FROM users WHERE company_id = ? ORDER BY role, full_name`, [id]);
    const recentSales = await query(`SELECT s.invoice_number, s.total_amount, s.payment_method, s.sale_date, u.full_name as cashier FROM sales s LEFT JOIN users u ON s.user_id=u.user_id WHERE s.company_id=? ORDER BY s.sale_date DESC LIMIT 10`, [id]);
    return NextResponse.json({ company, users, recentSales });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const id = params.id;
    const body = await req.json();
    const { action } = body;

    if (action === 'toggle_active') {
      await execute(`UPDATE companies SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END, updated_at=datetime('now') WHERE company_id=?`, [id]);
      // Also deactivate/activate all company users
      const company = await queryOne<any>(`SELECT is_active FROM companies WHERE company_id=?`, [id]);
      await execute(`UPDATE users SET is_active=? WHERE company_id=? AND role!='superadmin'`, [company?.is_active, id]);
      return NextResponse.json({ success: true });
    }

    if (action === 'reset_password') {
      const { user_id, new_password } = body;
      const hash = await bcrypt.hash(new_password, 10);
      await execute(`UPDATE users SET password_hash=? WHERE user_id=? AND company_id=?`, [hash, user_id, id]);
      return NextResponse.json({ success: true });
    }

    if (action === 'update_limits') {
      const { plan, max_users, max_products, company_name, notes } = body;
      await execute(`UPDATE companies SET plan=?, max_users=?, max_products=?, company_name=?, notes=?, updated_at=datetime('now') WHERE company_id=?`,
        [plan, max_users, max_products, company_name, notes, id]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSuperAdmin();
    const id = params.id;
    if (id === '1') return NextResponse.json({ error: 'Cannot delete default company' }, { status: 400 });
    // Soft delete - just suspend
    await execute(`UPDATE companies SET is_active=0 WHERE company_id=?`, [id]);
    await execute(`UPDATE users SET is_active=0 WHERE company_id=?`, [id]);
    return NextResponse.json({ success: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
