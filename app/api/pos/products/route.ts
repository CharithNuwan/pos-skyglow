import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Returns sellable rows for POS: one row per product (if no batches) or one row per batch (if product has batches).
 * So same product with 2 batches appears as 2 items, identifiable by price.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const company_id = session.company_id || 1;
    const { searchParams } = new URL(req.url);
    const inStock = searchParams.get('inStock') === 'true';

    let productSql = `SELECT p.product_id, p.product_name, p.barcode, p.selling_price, p.cost_price, p.quantity, p.category_id, c.category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.is_active = 1 AND (p.company_id = ? OR p.company_id IS NULL)`;
    const productArgs: (string | number)[] = [company_id];
    if (inStock) {
      productSql += ` AND (p.quantity > 0 OR EXISTS (SELECT 1 FROM product_batches b WHERE b.product_id = p.product_id AND b.company_id = ? AND b.status = 'active' AND b.quantity > 0))`;
      productArgs.push(company_id);
    }
    productSql += ` ORDER BY p.product_name`;

    const products = await query(productSql, productArgs) as any[];

    let batches: any[] = [];
    try {
      const batchSql = `SELECT b.batch_id, b.product_id, b.batch_number, b.selling_price, b.cost_price, b.quantity, b.expiry_date
        FROM product_batches b
        WHERE b.company_id = ? AND b.status = 'active' AND b.quantity > 0
        ORDER BY b.product_id, b.batch_id`;
      batches = await query(batchSql, [company_id]) as any[];
    } catch {
      // product_batches table may not exist yet
    }

    const batchesByProduct = new Map<number, any[]>();
    for (const b of batches) {
      if (!batchesByProduct.has(b.product_id)) batchesByProduct.set(b.product_id, []);
      batchesByProduct.get(b.product_id)!.push(b);
    }

    const items: any[] = [];
    for (const p of products) {
      const productBatches = batchesByProduct.get(p.product_id);
      if (productBatches && productBatches.length > 0) {
        for (const b of productBatches) {
          items.push({
            product_id: p.product_id,
            product_name: p.product_name,
            barcode: p.barcode,
            selling_price: b.selling_price,
            cost_price: b.cost_price,
            quantity: b.quantity,
            category_id: p.category_id,
            category_name: p.category_name,
            batch_id: b.batch_id,
            batch_number: b.batch_number,
            expiry_date: b.expiry_date,
          });
        }
      } else {
        items.push({
          product_id: p.product_id,
          product_name: p.product_name,
          barcode: p.barcode,
          selling_price: p.selling_price,
          cost_price: p.cost_price,
          quantity: p.quantity,
          category_id: p.category_id,
          category_name: p.category_name,
          batch_id: null,
          batch_number: null,
          expiry_date: null,
        });
      }
    }

    return NextResponse.json({ products: items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
