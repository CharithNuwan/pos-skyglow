'use client';

/** Shared receipt layout: same design for receipt page (real) and Settings preview (sample data). */
export interface ReceiptSale {
  invoice_number: string;
  sale_date: string;
  cashier_name?: string;
  customer_name?: string;
  customer_phone?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount?: number;
  total_amount: number;
  payment_method: string;
  cash_received?: number;
  change_amount?: number;
}

export interface ReceiptItem {
  product_name?: string;
  short_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ReceiptSettings {
  shop_name?: string;
  shop_address?: string;
  shop_phone?: string;
  shop_email?: string;
  receipt_header?: string;
  receipt_footer?: string;
  currency_symbol?: string;
  receipt_width?: string;
  receipt_font_size?: string;
  /** Title (shop name) font size in px */
  receipt_title_size?: string;
  /** Header block (address, phone, receipt header line) font size in px */
  receipt_header_size?: string;
  /** Footer block (payment, footer text, thank you) font size in px */
  receipt_footer_size?: string;
}

const SAMPLE_SALE: ReceiptSale = {
  invoice_number: 'INV20260306NGG4',
  sale_date: '2026-03-06T06:32:35.000Z',
  cashier_name: 'System Administrator',
  subtotal: 400,
  tax_amount: 32,
  discount_amount: 0,
  total_amount: 432,
  payment_method: 'card',
};

const SAMPLE_ITEMS: ReceiptItem[] = [
  { product_name: 'asd', short_name: 'asd', quantity: 2, unit_price: 200, total_price: 400 },
];

export default function ReceiptLayout({
  mode,
  sale: saleProp,
  items: itemsProp,
  settings,
  widthMm: widthMmProp,
  fontSize: fontSizeProp,
  className = '',
  style = {},
}: {
  mode: 'real' | 'preview';
  sale?: ReceiptSale | null;
  items?: ReceiptItem[] | null;
  settings: ReceiptSettings;
  widthMm?: number;
  fontSize?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const sale = mode === 'preview' ? SAMPLE_SALE : (saleProp ?? SAMPLE_SALE);
  const items = mode === 'preview' ? SAMPLE_ITEMS : (itemsProp ?? []);
  const widthMm = widthMmProp ?? parseInt(settings?.receipt_width || '80', 10);
  const widthPx = Math.round(widthMm * 3.78);
  const bodySize = fontSizeProp ?? parseInt(settings?.receipt_font_size || '13', 10);
  const titleSize = parseInt(settings?.receipt_title_size || '18', 10);
  const headerSize = parseInt(settings?.receipt_header_size || '13', 10);
  const footerSize = parseInt(settings?.receipt_footer_size || '12', 10);
  const curr = settings?.currency_symbol || '$';

  return (
    <div
      className={className}
      style={{
        width: widthPx,
        minWidth: 200,
        margin: mode === 'preview' ? 0 : '0 auto',
        background: '#fff',
        padding: '1.25rem',
        borderRadius: 8,
        boxShadow: mode === 'preview' ? '0 1px 4px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.1)',
        fontSize: bodySize,
        fontFamily: 'monospace',
        ...style,
      }}
    >
      {/* Shop Header — title + header block */}
      <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
        <div style={{ fontWeight: 700, fontSize: titleSize }}>{settings?.shop_name || 'POS System'}</div>
        <div style={{ fontSize: headerSize, color: '#555', marginTop: 2 }}>
          {settings?.shop_address && <div>{settings.shop_address}</div>}
          {settings?.shop_phone && <div>{settings.shop_phone}</div>}
          {settings?.shop_email && <div>{settings.shop_email}</div>}
        </div>
        {settings?.receipt_header && <div style={{ fontSize: headerSize, marginTop: 6, fontStyle: 'italic' }}>{settings.receipt_header}</div>}
      </div>

      <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />

      {/* Sale Info */}
      <div style={{ marginBottom: 8 }}>
        {[
          ['Invoice', sale.invoice_number],
          ['Date', new Date(sale.sale_date).toLocaleString()],
          ...(sale.cashier_name ? [['Cashier', sale.cashier_name]] : []),
          ...(sale.customer_name ? [['Customer', sale.customer_name]] : []),
          ...(sale.customer_phone ? [['Phone', sale.customer_phone]] : []),
        ].map(([label, value]) => (
          <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ color: '#555' }}>{label}:</span>
            <span style={{ fontWeight: 500 }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />

      {/* Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #eee' }}>
            <th style={{ textAlign: 'left', paddingBottom: 4 }}>Item</th>
            <th style={{ textAlign: 'center', width: 30 }}>Qty</th>
            <th style={{ textAlign: 'right', width: 60 }}>Price</th>
            <th style={{ textAlign: 'right', width: 65 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: ReceiptItem, idx: number) => (
            <tr key={idx}>
              <td style={{ paddingTop: 3, paddingBottom: 3, wordBreak: 'break-word' }}>
                {item.short_name || item.product_name || 'Item'}
              </td>
              <td style={{ textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ textAlign: 'right' }}>{curr}{Number(item.unit_price).toFixed(2)}</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{curr}{Number(item.total_price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />

      {/* Totals */}
      {[
        ['Subtotal', `${curr}${Number(sale.subtotal).toFixed(2)}`, false],
        ...(sale.discount_amount && sale.discount_amount > 0
          ? [['Discount', `-${curr}${Number(sale.discount_amount).toFixed(2)}`, false, true]]
          : []),
        ...(sale.tax_amount > 0 ? [['Tax', `${curr}${Number(sale.tax_amount).toFixed(2)}`, false]] : []),
      ].map(([label, value, bold, green]: any) => (
        <div
          key={String(label)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 2,
            color: green ? '#198754' : 'inherit',
            fontWeight: bold ? 700 : 400,
          }}
        >
          <span>{label}</span>
          <span>{value}</span>
        </div>
      ))}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 700,
          fontSize: bodySize + 2,
          borderTop: '2px solid #000',
          paddingTop: 6,
          marginTop: 4,
        }}
      >
        <span>TOTAL</span>
        <span>{curr}{Number(sale.total_amount).toFixed(2)}</span>
      </div>

      {sale.payment_method === 'cash' && sale.cash_received != null && (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Cash Received</span>
            <span>{curr}{Number(sale.cash_received).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Change</span>
            <span>{curr}{Number(sale.change_amount ?? 0).toFixed(2)}</span>
          </div>
        </div>
      )}

      <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: footerSize }}>
        <div>
          <strong>Payment:</strong>{' '}
          {sale.payment_method?.charAt(0).toUpperCase() + sale.payment_method?.slice(1)}
        </div>
        {settings?.receipt_footer && (
          <div style={{ marginTop: 6, fontStyle: 'italic' }}>{settings.receipt_footer}</div>
        )}
        <div style={{ marginTop: 6, color: '#888', fontSize: footerSize - 1 }}>
          *** Thank you for your business ***
        </div>
      </div>
    </div>
  );
}
