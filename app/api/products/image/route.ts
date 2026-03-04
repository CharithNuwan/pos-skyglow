import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!hasRole(session.role, 'manager')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { product_id, image_base64 } = await req.json();
    if (!product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 });
    // Store as data URL directly in DB (works perfectly for small product images)
    await execute(`UPDATE products SET image_url = ?, updated_at = datetime('now') WHERE product_id = ?`, [image_base64 || null, product_id]);
    return NextResponse.json({ success: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
