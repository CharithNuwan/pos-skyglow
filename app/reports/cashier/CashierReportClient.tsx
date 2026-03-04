'use client';
import { useState, useEffect } from 'react';

export default function CashierReportClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [curr, setCurr] = useState('Rs');
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now() - 30*86400000).toISOString().slice(0,10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0,10));

  useEffect(() => { fetch('/api/settings').then(r=>r.json()).then(s=>setCurr(s.currency_symbol||'Rs')); }, []);
  useEffect(() => { load(); }, [dateFrom, dateTo]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/reports/cashier?date_from=${dateFrom}&date_to=${dateTo}`);
    setData(await res.json());
    setLoading(false);
  }

  const fmt = (n: any) => `${curr} ${Number(n||0).toFixed(2)}`;
  const stats: any[] = data?.cashierStats || [];
  const shifts: any[] = data?.shiftStats || [];
  const topCashier = stats.reduce((a: any, b: any) => (b.total_revenue > (a?.total_revenue || 0) ? b : a), null);
  const totalRevenue = stats.reduce((sum: number, s: any) => sum + Number(s.total_revenue), 0);

  const COLORS = ['#0d6efd','#198754','#fd7e14','#dc3545','#6f42c1','#20c997'];

  return (
    <div>
      {/* Date filter */}
      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="d-flex gap-3 align-items-center flex-wrap">
            <label className="form-label mb-0 fw-bold small">Period:</label>
            <input type="date" className="form-control form-control-sm" style={{width:140}} value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
            <span className="text-muted">to</span>
            <input type="date" className="form-control form-control-sm" style={{width:140}} value={dateTo} onChange={e=>setDateTo(e.target.value)} />
            {[['Today',0],['7 Days',7],['30 Days',30],['90 Days',90]].map(([l,d]:any) => (
              <button key={l} className="btn btn-sm btn-outline-secondary" onClick={()=>{
                setDateFrom(new Date(Date.now()-d*86400000).toISOString().slice(0,10));
                setDateTo(new Date().toISOString().slice(0,10));
              }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? <div className="text-center py-5"><span className="spinner-border" /></div> : (
        <>
          {/* Summary bar chart */}
          <div className="card mb-3">
            <div className="card-header fw-bold">Revenue by Cashier</div>
            <div className="card-body">
              {stats.filter((s:any) => s.total_sales > 0).length === 0
                ? <div className="text-center text-muted py-3">No sales in this period</div>
                : stats.filter((s:any) => s.total_sales > 0).map((s: any, i: number) => (
                  <div key={s.user_id} className="mb-3">
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="fw-600">{s.full_name} <span className="badge bg-light text-muted ms-1">{s.role}</span></span>
                      <span className="fw-bold">{fmt(s.total_revenue)} <span className="text-muted">({s.total_sales} sales)</span></span>
                    </div>
                    <div className="progress" style={{height:22, borderRadius:4}}>
                      <div className="progress-bar" style={{
                        width: totalRevenue > 0 ? `${(s.total_revenue/totalRevenue*100).toFixed(1)}%` : '0%',
                        background: COLORS[i % COLORS.length], fontSize:'0.75rem', lineHeight:'22px'
                      }}>
                        {totalRevenue > 0 ? `${(s.total_revenue/totalRevenue*100).toFixed(1)}%` : ''}
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Cashier detail cards */}
          <div className="row g-3 mb-3">
            {stats.map((s: any, i: number) => (
              <div key={s.user_id} className="col-md-6 col-lg-4">
                <div className="card h-100">
                  <div className="card-header d-flex align-items-center gap-2">
                    <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                      style={{width:32, height:32, background: COLORS[i%COLORS.length], fontSize:'0.85rem', flexShrink:0}}>
                      {s.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="fw-bold small">{s.full_name}</div>
                      <div className="text-muted" style={{fontSize:'0.7rem'}}>{s.username} · {s.role}</div>
                    </div>
                  </div>
                  <div className="card-body p-2">
                    <div className="row g-2 text-center">
                      {[
                        ['Sales', s.total_sales, '#0d6efd'],
                        ['Revenue', fmt(s.total_revenue), COLORS[i%COLORS.length]],
                        ['Avg Sale', fmt(s.avg_sale), '#20c997'],
                        ['Discounts', fmt(s.total_discounts), '#fd7e14'],
                        ['Cash', fmt(s.cash_sales), '#198754'],
                        ['Online', fmt(s.online_sales), '#6f42c1'],
                      ].map(([label, val, color]: any) => (
                        <div key={label} className="col-4">
                          <div style={{background:'#f8f9fa', borderRadius:6, padding:'6px 4px'}}>
                            <div style={{fontWeight:700, color, fontSize:'0.85rem'}}>{val}</div>
                            <div style={{fontSize:'0.65rem', color:'#888'}}>{label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Shifts table */}
          {shifts.length > 0 && (
            <div className="card">
              <div className="card-header fw-bold">Shifts in Period</div>
              <div className="card-body p-0">
                <table className="table table-hover mb-0 small">
                  <thead><tr><th>Staff</th><th>Date</th><th>Start</th><th>End</th><th>Hours</th><th>Sales</th><th>Revenue</th><th>Cash Diff</th></tr></thead>
                  <tbody>
                    {shifts.map((h: any) => (
                      <tr key={h.shift_id}>
                        <td className="fw-500">{h.full_name}</td>
                        <td>{new Date(h.started_at).toLocaleDateString()}</td>
                        <td>{new Date(h.started_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
                        <td>{h.ended_at ? new Date(h.ended_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : <span className="badge bg-success">Active</span>}</td>
                        <td>{h.hours_worked ? `${h.hours_worked}h` : '-'}</td>
                        <td>{h.total_sales_count}</td>
                        <td className="fw-600">{fmt(h.total_sales_amount)}</td>
                        <td className={Number(h.cash_difference||0) >= 0 ? 'text-success' : 'text-danger'}>
                          {h.cash_difference !== null ? `${Number(h.cash_difference)>=0?'+':''}${fmt(h.cash_difference)}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
