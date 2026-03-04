import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireSession();
    const saleId = parseInt(params.id);
    const sale = await queryOne(`SELECT s.*, u.full_name as cashier_name FROM sales s JOIN users u ON s.user_id = u.user_id WHERE s.sale_id = ?`, [saleId]);
    if (!sale) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const items = await query(`SELECT si.*, p.product_name, p.short_name, p.barcode FROM sale_items si JOIN products p ON si.product_id = p.product_id WHERE si.sale_id = ?`, [saleId]);
    const settings = await query(`SELECT setting_key, setting_value FROM settings`);
    const settingsMap = Object.fromEntries((settings as any[]).map((s: any) => [s.setting_key, s.setting_value]));
    return NextResponse.json({ sale, items, settings: settingsMap });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
