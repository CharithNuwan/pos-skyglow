'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ReceiptLayout from '@/components/ReceiptLayout';

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
  const widthMm = parseInt(settings?.receipt_width || '80');
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
        <div className="receipt-card">
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

          <ReceiptLayout
            mode="real"
            sale={sale}
            items={items}
            settings={settings}
            widthMm={widthMm}
            fontSize={fontSize}
          />
        </div>
      </div>
    </>
  );
}
