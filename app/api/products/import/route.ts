import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { requireSession, hasRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  // Parse header - handle BOM
  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const headers = parseCSVLine(headerLine).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i]?.trim() ?? ''; });
    return row;
  }).filter(row => Object.values(row).some(v => v)); // skip empty rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current);
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!hasRole(session.role, 'manager')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) return NextResponse.json({ error: 'No data rows found in file' }, { status: 400 });

    // Get existing categories to map names to IDs
    const categories = await query(`SELECT category_id, category_name FROM categories WHERE is_active = 1`);
    const catMap: Record<string, number> = {};
    (categories as any[]).forEach((c: any) => {
      catMap[c.category_name.toLowerCase()] = c.category_id;
    });

    let inserted = 0, updated = 0, skipped = 0, errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header

      // Support multiple column name variations
      const productName = row.product_name || row.name || row.item_name || row.product || '';
      if (!productName) { skipped++; continue; }

      const barcode = row.barcode || row.sku || row.code || null;
      const categoryName = row.category_name || row.category || '';
      const categoryId = categoryName ? (catMap[categoryName.toLowerCase()] || null) : null;
      const costPrice = parseFloat(row.cost_price || row.cost || '0') || 0;
      const sellingPrice = parseFloat(row.selling_price || row.price || row.sale_price || '0') || 0;
      const quantity = parseInt(row.quantity || row.stock || row.qty || '0') || 0;
      const minStock = parseInt(row.minimum_stock || row.min_stock || row.reorder || '5') || 5;
      const description = row.description || row.desc || '';
      const isActive = row.is_active === '0' ? 0 : 1;

      if (sellingPrice <= 0) {
        errors.push(`Row ${rowNum}: "${productName}" skipped — selling price is 0 or missing`);
        skipped++; continue;
      }

      try {
        // Check if barcode already exists
        if (barcode) {
          const existing = await query(`SELECT product_id FROM products WHERE barcode = ?`, [barcode]);
          if ((existing as any[]).length > 0) {
            // Update existing
            await execute(
              `UPDATE products SET product_name=?, category_id=?, cost_price=?, selling_price=?, quantity=?, minimum_stock=?, description=?, is_active=?, updated_at=datetime('now') WHERE barcode=?`,
              [productName, categoryId, costPrice, sellingPrice, quantity, minStock, description || null, isActive, barcode]
            );
            updated++; continue;
          }
        }

        // Insert new
        await execute(
          `INSERT INTO products (barcode, product_name, category_id, cost_price, selling_price, quantity, minimum_stock, description, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [barcode || null, productName, categoryId, costPrice, sellingPrice, quantity, minStock, description || null, isActive]
        );
        inserted++;
      } catch (err: any) {
        errors.push(`Row ${rowNum}: "${productName}" — ${err.message}`);
        skipped++;
      }
    }

    return NextResponse.json({ success: true, inserted, updated, skipped, errors, total: rows.length });
  } catch (e: unknown) {
    if ((e as Error).message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
