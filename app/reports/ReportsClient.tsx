'use client';
import { useState, useEffect } from 'react';

export default function ReportsClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => { load(); }, [dateFrom, dateTo]);
  async function load() {
    setLoading(true);
    const res = await fetch(`/api/reports?date_from=${dateFrom}&date_to=${dateTo}`);
    setData(await res.json()); setLoading(false);
  }

  const s = data?.summary || {};
  const curr = '$';
  return (
    <div>
      <div className="card mb-3"><div className="card-body py-2"><div className="d-flex gap-3 align-items-end flex-wrap">
        <div><label className="form-label small mb-1">From</label><input type="date" className="form-control form-control-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
        <div><label className="form-label small mb-1">To</label><input type="date" className="form-control form-control-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
      </div></div></div>

      {loading ? <div className="text-center py-5"><span className="spinner-border" /></div> : (
        <>
          <div className="row g-3 mb-4">
            {[
              { label: 'Total Orders', value: s.total_orders || 0, icon: 'bi-bag-check', color: '#0d6efd' },
              { label: 'Total Revenue', value: `${curr}${Number(s.total_revenue||0).toFixed(2)}`, icon: 'bi-currency-dollar', color: '#198754' },
              { label: 'Avg Order Value', value: `${curr}${Number(s.avg_order||0).toFixed(2)}`, icon: 'bi-graph-up', color: '#fd7e14' },
              { label: 'Total Discounts', value: `${curr}${Number(s.total_discount||0).toFixed(2)}`, icon: 'bi-tag', color: '#dc3545' },
            ].map(item => (
              <div key={item.label} className="col-sm-6 col-xl-3">
                <div className="card p-3"><div className="d-flex justify-content-between align-items-start">
                  <div><div className="stat-label">{item.label}</div><div className="stat-value">{item.value}</div></div>
                  <i className={`bi ${item.icon} fs-3`} style={{ color: item.color }} />
                </div></div>
              </div>
            ))}
          </div>
          <div className="row g-3">
            <div className="col-lg-6"><div className="card"><div className="card-header">Top Products</div><div className="card-body p-0">
              <table className="table mb-0"><thead><tr><th>#</th><th>Product</th><th>Sold</th><th>Revenue</th></tr></thead>
              <tbody>{(data?.topProducts||[]).length===0?<tr><td colSpan={4} className="text-center text-muted py-3">No data</td></tr>:(data?.topProducts||[]).map((p:any,i:number)=>(
                <tr key={p.product_name}><td className="text-muted">{i+1}</td><td className="fw-500">{p.product_name}</td><td>{p.quantity_sold}</td><td>{curr}{Number(p.revenue).toFixed(2)}</td></tr>
              ))}</tbody></table>
            </div></div></div>
            <div className="col-lg-6"><div className="card"><div className="card-header">Payment Methods</div><div className="card-body p-0">
              <table className="table mb-0"><thead><tr><th>Method</th><th>Count</th><th>Total</th></tr></thead>
              <tbody>{(data?.paymentMethods||[]).map((pm:any)=>(
                <tr key={pm.payment_method}><td className="text-capitalize fw-500">{pm.payment_method}</td><td>{pm.count}</td><td className="fw-600">{curr}{Number(pm.amount).toFixed(2)}</td></tr>
              ))}</tbody></table>
            </div></div></div>
            <div className="col-12"><div className="card"><div className="card-header">Daily Sales</div><div className="card-body p-0" style={{ maxHeight: 300, overflow: 'auto' }}>
              <table className="table mb-0"><thead><tr><th>Date</th><th>Orders</th><th>Revenue</th></tr></thead>
              <tbody>{(data?.dailySales||[]).length===0?<tr><td colSpan={3} className="text-center text-muted py-3">No data</td></tr>:[...(data?.dailySales||[])].reverse().map((d:any)=>(
                <tr key={d.date}><td>{d.date}</td><td>{d.orders}</td><td className="fw-600">{curr}{Number(d.revenue).toFixed(2)}</td></tr>
              ))}</tbody></table>
            </div></div></div>
          </div>
        </>
      )}
    </div>
  );
}
