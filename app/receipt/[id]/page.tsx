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

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: 400, margin: '0 auto', background: '#fff', padding: '2rem', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div className="no-print mb-3 d-flex gap-2">
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
            <i className="bi bi-printer me-1" />Print Receipt
          </button>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => window.close()}>
            Close
          </button>
        </div>

        <div className="text-center mb-3">
          <h4 className="fw-bold mb-1">{settings?.shop_name || 'POS System'}</h4>
          {settings?.shop_address && <div className="small text-muted">{settings.shop_address}</div>}
          {settings?.shop_phone && <div className="small text-muted">{settings.shop_phone}</div>}
          {settings?.receipt_header && <div className="small mt-2 fst-italic">{settings.receipt_header}</div>}
        </div>

        <hr />
        <div className="d-flex justify-content-between small mb-1">
          <span className="fw-600">Invoice:</span>
          <span>{sale.invoice_number}</span>
        </div>
        <div className="d-flex justify-content-between small mb-1">
          <span>Date:</span>
          <span>{new Date(sale.sale_date).toLocaleString()}</span>
        </div>
        <div className="d-flex justify-content-between small mb-1">
          <span>Cashier:</span>
          <span>{sale.cashier_name}</span>
        </div>
        {sale.customer_name && (
          <div className="d-flex justify-content-between small mb-1">
            <span>Customer:</span>
            <span>{sale.customer_name}</span>
          </div>
        )}
        <hr />

        <table style={{ width: '100%', fontSize: '0.85rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingBottom: '0.5rem' }}>Item</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => (
              <tr key={item.sale_item_id}>
                <td style={{ paddingBottom: '0.25rem' }}>{item.product_name}</td>
                <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>{curr}{Number(item.unit_price).toFixed(2)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{curr}{Number(item.total_price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr />
        <div className="d-flex justify-content-between small mb-1"><span>Subtotal</span><span>{curr}{Number(sale.subtotal).toFixed(2)}</span></div>
        {sale.discount_amount > 0 && <div className="d-flex justify-content-between small mb-1 text-success"><span>Discount</span><span>-{curr}{Number(sale.discount_amount).toFixed(2)}</span></div>}
        {sale.tax_amount > 0 && <div className="d-flex justify-content-between small mb-1"><span>Tax</span><span>{curr}{Number(sale.tax_amount).toFixed(2)}</span></div>}
        <div className="d-flex justify-content-between fw-bold" style={{ fontSize: '1.1rem', marginTop: '0.5rem', borderTop: '2px solid #000', paddingTop: '0.5rem' }}>
          <span>TOTAL</span>
          <span>{curr}{Number(sale.total_amount).toFixed(2)}</span>
        </div>

        {sale.payment_method === 'cash' && (
          <>
            <div className="d-flex justify-content-between small mt-2"><span>Cash Received</span><span>{curr}{Number(sale.cash_received).toFixed(2)}</span></div>
            <div className="d-flex justify-content-between small"><span>Change</span><span>{curr}{Number(sale.change_amount).toFixed(2)}</span></div>
          </>
        )}

        <div className="text-center mt-3 small">
          <div><strong>Payment:</strong> {sale.payment_method?.charAt(0).toUpperCase() + sale.payment_method?.slice(1)}</div>
          {settings?.receipt_footer && <div className="mt-2 text-muted fst-italic">{settings.receipt_footer}</div>}
          <div className="mt-2 text-muted" style={{ fontSize: '0.75rem' }}>*** Thank you for your business ***</div>
        </div>
      </div>
    </div>
  );
}
