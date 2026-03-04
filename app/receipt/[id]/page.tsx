'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function ReceiptPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sales/${params.id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [params.id]);

  if (loading) return <div className="text-center py-5"><span className="spinner-border" /></div>;
  if (!data || data.error) return <div className="text-center py-5 text-danger">Receipt not found</div>;

  const { sale, items, settings } = data;
  const curr = settings?.currency_symbol || '$';

  // Receipt width: convert mm to px (96dpi: 1mm ≈ 3.78px)
  const widthMm = parseInt(settings?.receipt_width || '80');
  const widthPx = Math.round(widthMm * 3.78);
  const fontSize = parseInt(settings?.receipt_font_size || '13');

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; margin: 0; padding: 0; }
          .receipt-wrapper { padding: 0 !important; background: #fff !important; }
          .receipt-card { box-shadow: none !important; border-radius: 0 !important; }
          @page { size: ${widthMm}mm auto; margin: 0; }
        }
      `}</style>

      <div className="receipt-wrapper" style={{ background: '#f5f5f5', minHeight: '100vh', padding: '2rem' }}>
        <div
          className="receipt-card"
          style={{
            width: widthPx,
            minWidth: 200,
            margin: '0 auto',
            background: '#fff',
            padding: '1.25rem',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            fontSize: fontSize,
            fontFamily: 'monospace',
          }}
        >
          {/* Action buttons - hidden on print */}
          <div className="no-print mb-3 d-flex gap-2 flex-wrap">
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
              <i className="bi bi-printer me-1" />Print Receipt
            </button>
            {settings?.whatsapp_enabled === '1' && (
              <button className="btn btn-success btn-sm" onClick={() => {
                const phone = sale.customer_phone || '';
                const text = encodeURIComponent(
                  `*Receipt - ${sale.invoice_number}*\n` +
                  `Shop: ${settings?.shop_name || ''}\n` +
                  `Date: ${new Date(sale.sale_date).toLocaleString()}\n` +
                  `─────────────────\n` +
                  items.map((i: any) => `${i.short_name||i.product_name} x${i.quantity}  ${settings?.currency_symbol||'Rs'} ${Number(i.total_price).toFixed(2)}`).join('\n') +
                  `\n─────────────────\n` +
                  `*Total: ${settings?.currency_symbol||'Rs'} ${Number(sale.total_amount).toFixed(2)}*\n` +
                  `Payment: ${sale.payment_method}\n` +
                  `Thank you! 🙏`
                );
                const waNum = phone.replace(/\D/g,'') || settings?.whatsapp_number || '';
                window.open(`https://wa.me/${waNum}?text=${text}`, '_blank');
              }}>
                <i className="bi bi-whatsapp me-1" />WhatsApp
              </button>
            )}
            {settings?.email_receipt_enabled === '1' && sale.customer_email && (
              <button className="btn btn-outline-primary btn-sm" onClick={() => {
                const subject = encodeURIComponent(`Receipt ${sale.invoice_number} - ${settings?.shop_name||''}`);
                const body = encodeURIComponent(
                  `Dear Customer,\n\nThank you for your purchase!\n\n` +
                  `Invoice: ${sale.invoice_number}\nDate: ${new Date(sale.sale_date).toLocaleString()}\n\n` +
                  items.map((i: any) => `${i.short_name||i.product_name} x${i.quantity} - ${settings?.currency_symbol||'Rs'} ${Number(i.total_price).toFixed(2)}`).join('\n') +
                  `\n\nTotal: ${settings?.currency_symbol||'Rs'} ${Number(sale.total_amount).toFixed(2)}\nPayment: ${sale.payment_method}\n\n` +
                  `${settings?.receipt_footer||'Thank you for shopping with us!'}\n\n${settings?.shop_name||''}`
                );
                window.open(`mailto:${sale.customer_email}?subject=${subject}&body=${body}`);
              }}>
                <i className="bi bi-envelope me-1" />Email
              </button>
            )}
            <button className="btn btn-outline-secondary btn-sm" onClick={() => window.close()}>
              Close
            </button>
            <span className="ms-auto text-muted small d-flex align-items-center">
              Paper: {widthMm}mm · Font: {fontSize}px
            </span>
          </div>

          {/* Shop Header */}
          <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontWeight: 700, fontSize: fontSize + 4 }}>{settings?.shop_name || 'POS System'}</div>
            {settings?.shop_address && <div style={{ color: '#555', marginTop: 2 }}>{settings.shop_address}</div>}
            {settings?.shop_phone && <div style={{ color: '#555' }}>{settings.shop_phone}</div>}
            {settings?.shop_email && <div style={{ color: '#555' }}>{settings.shop_email}</div>}
            {settings?.receipt_header && <div style={{ marginTop: 6, fontStyle: 'italic' }}>{settings.receipt_header}</div>}
          </div>

          <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />

          {/* Sale Info */}
          <div style={{ marginBottom: 8 }}>
            {[
              ['Invoice', sale.invoice_number],
              ['Date', new Date(sale.sale_date).toLocaleString()],
              ['Cashier', sale.cashier_name],
              ...(sale.customer_name ? [['Customer', sale.customer_name]] : []),
              ...(sale.customer_phone ? [['Phone', sale.customer_phone]] : []),
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
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
              {items.map((item: any) => (
                <tr key={item.sale_item_id}>
                  <td style={{ paddingTop: 3, paddingBottom: 3, wordBreak: 'break-word' }}>{item.short_name || item.product_name}</td>
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
            ...(sale.discount_amount > 0 ? [['Discount', `-${curr}${Number(sale.discount_amount).toFixed(2)}`, false, true]] : []),
            ...(sale.tax_amount > 0 ? [[`Tax`, `${curr}${Number(sale.tax_amount).toFixed(2)}`, false]] : []),
          ].map(([label, value, bold, green]: any) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, color: green ? '#198754' : 'inherit', fontWeight: bold ? 700 : 400 }}>
              <span>{label}</span><span>{value}</span>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: fontSize + 3, borderTop: '2px solid #000', paddingTop: 6, marginTop: 4 }}>
            <span>TOTAL</span>
            <span>{curr}{Number(sale.total_amount).toFixed(2)}</span>
          </div>

          {sale.payment_method === 'cash' && (
            <div style={{ marginTop: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cash Received</span><span>{curr}{Number(sale.cash_received).toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Change</span><span>{curr}{Number(sale.change_amount).toFixed(2)}</span></div>
            </div>
          )}

          <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />

          {/* Footer */}
          <div style={{ textAlign: 'center' }}>
            <div><strong>Payment:</strong> {sale.payment_method?.charAt(0).toUpperCase() + sale.payment_method?.slice(1)}</div>
            {settings?.receipt_footer && <div style={{ marginTop: 6, fontStyle: 'italic' }}>{settings.receipt_footer}</div>}
            <div style={{ marginTop: 6, color: '#888', fontSize: fontSize - 2 }}>*** Thank you for your business ***</div>
          </div>
        </div>
      </div>
    </>
  );
}
