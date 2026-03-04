'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';

interface Sale {
  sale_id: number; invoice_number: string; cashier_name: string; customer_name: string;
  total_amount: number; payment_method: string; payment_status: string; sale_date: string;
}

function SalesContent() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [refunding, setRefunding] = useState<number | null>(null);

  useEffect(() => { load(); }, [page, dateFrom, dateTo, status, search]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), date_from: dateFrom, date_to: dateTo });
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    const res = await fetch(`/api/sales?${params}`);
    const data = await res.json();
    setSales(data.sales || []);
    setTotal(data.total || 0);
    setLoading(false);
  }

  async function refund(saleId: number) {
    if (!confirm('Refund this sale? Stock will be restored.')) return;
    setRefunding(saleId);
    const res = await fetch(`/api/sales/${saleId}/refund`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      load();
    } else {
      alert(data.error || 'Refund failed');
    }
    setRefunding(null);
  }

  return (
    <div>
      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="row g-2 align-items-end">
            <div className="col-md-2">
              <label className="form-label small mb-1">From</label>
              <input type="date" className="form-control form-control-sm" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
            </div>
            <div className="col-md-2">
              <label className="form-label small mb-1">To</label>
              <input type="date" className="form-control form-control-sm" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
            </div>
            <div className="col-md-2">
              <label className="form-label small mb-1">Status</label>
              <select className="form-select form-select-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
                <option value="">All</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small mb-1">Search</label>
              <input className="form-control form-control-sm" placeholder="Invoice or customer..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span>{total} sales found</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Cashier</th>
                  <th>Method</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-4"><span className="spinner-border spinner-border-sm" /></td></tr>
                ) : sales.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">No sales found</td></tr>
                ) : sales.map(s => (
                  <tr key={s.sale_id}>
                    <td className="fw-500 text-primary">{s.invoice_number}</td>
                    <td>{s.customer_name || <span className="text-muted">Walk-in</span>}</td>
                    <td>{s.cashier_name}</td>
                    <td className="text-capitalize"><span className="badge bg-light text-dark">{s.payment_method}</span></td>
                    <td className="fw-700">${Number(s.total_amount).toFixed(2)}</td>
                    <td><span className={`badge status-${s.payment_status}`}>{s.payment_status}</span></td>
                    <td className="text-muted small">{new Date(s.sale_date).toLocaleString()}</td>
                    <td>
                      <Link href={`/receipt/${s.sale_id}`} target="_blank" className="btn btn-sm btn-outline-secondary me-1">
                        <i className="bi bi-receipt" />
                      </Link>
                      {s.payment_status === 'completed' && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => refund(s.sale_id)} disabled={refunding === s.sale_id}>
                          {refunding === s.sale_id ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-arrow-counterclockwise" />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {total > 20 && (
          <div className="card-footer d-flex justify-content-between align-items-center">
            <small className="text-muted">Page {page} of {Math.ceil(total / 20)}</small>
            <div className="d-flex gap-1">
              <button className="btn btn-sm btn-outline-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
              <button className="btn btn-sm btn-outline-secondary" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next ›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SalesPage() {
  return <AppLayout title="Sales" requiredRole="manager"><SalesContent /></AppLayout>;
}
