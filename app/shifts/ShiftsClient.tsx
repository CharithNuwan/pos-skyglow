'use client';
import { useState, useEffect } from 'react';

export default function ShiftsClient() {
  const [tab, setTab] = useState<'shift'|'report'>('shift');
  const [shiftData, setShiftData] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [curr, setCurr] = useState('Rs');
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [endResult, setEndResult] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now()-30*86400000).toISOString().slice(0,10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0,10));

  useEffect(() => { fetch('/api/settings').then(r=>r.json()).then(s=>setCurr(s.currency_symbol||'Rs')); }, []);
  useEffect(() => { if (tab==='shift') loadShift(); else loadReport(); }, [tab, dateFrom, dateTo]);

  async function loadShift() {
    setLoading(true);
    const res = await fetch('/api/shifts?view=current');
    setShiftData(await res.json()); setLoading(false);
  }
  async function loadReport() {
    setLoading(true);
    const res = await fetch(`/api/shifts?view=report&date_from=${dateFrom}&date_to=${dateTo}`);
    setReport(await res.json()); setLoading(false);
  }

  async function startShift() {
    setProcessing(true);
    const res = await fetch('/api/shifts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'start', opening_cash: parseFloat(openingCash)||0}) });
    const d = await res.json();
    if (d.success) { setOpeningCash(''); loadShift(); } else alert(d.error);
    setProcessing(false);
  }

  async function endShift() {
    if (!closingCash && closingCash!=='0') { alert('Enter closing cash amount'); return; }
    setProcessing(true);
    const res = await fetch('/api/shifts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'end', closing_cash:parseFloat(closingCash)||0, notes}) });
    const d = await res.json();
    if (d.success) { setEndResult(d.summary); setClosingCash(''); setNotes(''); loadShift(); } else alert(d.error);
    setProcessing(false);
  }

  const { myShift, allOpen } = shiftData || {};

  return (
    <div>
      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"><button className={`nav-link ${tab==='shift'?'active':''}`} onClick={()=>setTab('shift')}><i className="bi bi-person-badge me-1"/>My Shift</button></li>
        <li className="nav-item"><button className={`nav-link ${tab==='report'?'active':''}`} onClick={()=>setTab('report')}><i className="bi bi-bar-chart-line me-1"/>Cashier Report</button></li>
      </ul>

      {tab === 'shift' && (
        <div className="row g-3">
          <div className="col-lg-5">
            {endResult && (
              <div className="alert alert-success alert-dismissible mb-3">
                <button className="btn-close" onClick={()=>setEndResult(null)}/>
                <div className="fw-bold mb-2">✅ Shift Ended</div>
                <div className="row g-2 text-center">
                  {[['Sales',endResult.cnt||0,'#0d6efd'],[`Revenue`,`${curr} ${Number(endResult.rev||0).toFixed(2)}`,'#198754'],['Difference',`${endResult.diff>=0?'+':''}${curr} ${Number(endResult.diff||0).toFixed(2)}`,endResult.diff>=0?'#198754':'#dc3545']].map(([l,v,c]:any)=>(
                    <div key={l} className="col-4"><div style={{background:'rgba(0,0,0,0.05)',borderRadius:6,padding:'0.5rem'}}>
                      <div style={{fontWeight:700,color:c,fontSize:'1rem'}}>{v}</div>
                      <div style={{fontSize:'0.72rem'}}>{l}</div>
                    </div></div>
                  ))}
                </div>
                <div className="mt-2 small">Expected cash: <strong>{curr} {Number(endResult.expectedCash||0).toFixed(2)}</strong> · Actual: <strong>{curr} {Number(endResult.closing_cash||0).toFixed(2)}</strong></div>
              </div>
            )}

            <div className="card">
              <div className="card-header d-flex align-items-center gap-2">
                <span className={`badge ${myShift ? 'bg-success' : 'bg-secondary'}`}>● {myShift ? 'ON SHIFT' : 'OFF SHIFT'}</span>
                <span className="fw-bold">My Shift</span>
              </div>
              <div className="card-body">
                {myShift ? (
                  <>
                    <div className="mb-3 p-3 rounded" style={{background:'#f0fff4',border:'1px solid #c3e6cb'}}>
                      <div className="text-muted small">Started at</div>
                      <div className="fw-500">{new Date(myShift.started_at).toLocaleString()}</div>
                      <div className="text-muted small mt-1">Opening Cash</div>
                      <div className="fw-bold fs-5">{curr} {Number(myShift.opening_cash).toFixed(2)}</div>
                      <div className="text-muted small mt-1">Duration</div>
                      <div className="fw-500">{Math.round((Date.now()-new Date(myShift.started_at).getTime())/60000)} minutes</div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-bold">Closing Cash (count drawer)</label>
                      <div className="input-group input-group-lg"><span className="input-group-text">{curr}</span>
                        <input type="number" className="form-control" min="0" step="0.01" placeholder="0.00" value={closingCash} onChange={e=>setClosingCash(e.target.value)}/>
                      </div>
                    </div>
                    <div className="mb-3"><label className="form-label">Notes</label>
                      <textarea className="form-control" rows={2} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any notes..."/>
                    </div>
                    <button className="btn btn-danger w-100" onClick={endShift} disabled={processing}>
                      {processing?<span className="spinner-border spinner-border-sm me-2"/>:<i className="bi bi-stop-circle me-2"/>}End Shift
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-muted small">Start your shift before making sales so your performance is tracked.</p>
                    <div className="mb-3">
                      <label className="form-label fw-bold">Opening Cash</label>
                      <div className="input-group input-group-lg"><span className="input-group-text">{curr}</span>
                        <input type="number" className="form-control" min="0" step="0.01" placeholder="0.00" value={openingCash} onChange={e=>setOpeningCash(e.target.value)}/>
                      </div>
                    </div>
                    <button className="btn btn-success w-100 btn-lg" onClick={startShift} disabled={processing}>
                      {processing?<span className="spinner-border spinner-border-sm me-2"/>:<i className="bi bi-play-circle me-2"/>}Start Shift
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* All open shifts */}
          <div className="col-lg-7">
            <div className="card">
              <div className="card-header fw-bold">Currently Active Shifts ({allOpen?.length||0})</div>
              <div className="card-body p-0">
                {!allOpen?.length ? <div className="text-center text-muted py-4">No active shifts</div> : (
                  <table className="table mb-0">
                    <thead><tr><th>Staff</th><th>Started</th><th>Duration</th><th>Opening Cash</th></tr></thead>
                    <tbody>
                      {allOpen.map((s:any)=>(
                        <tr key={s.shift_id}>
                          <td className="fw-500">{s.full_name}</td>
                          <td className="small">{new Date(s.started_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
                          <td className="small">{Math.round((Date.now()-new Date(s.started_at).getTime())/60000)} min</td>
                          <td className="small">{curr} {Number(s.opening_cash).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'report' && (
        <div>
          {/* Date filter */}
          <div className="card mb-3">
            <div className="card-body py-2 d-flex gap-2 align-items-center flex-wrap">
              <span className="fw-500 small">Period:</span>
              {[['Today',0],['7 Days',7],['30 Days',30],['90 Days',90]].map(([l,d]:any)=>(
                <button key={l} className="btn btn-sm btn-outline-secondary" onClick={()=>{
                  const from=new Date(Date.now()-d*86400000).toISOString().slice(0,10);
                  setDateFrom(from); setDateTo(new Date().toISOString().slice(0,10));
                }}>{l}</button>
              ))}
              <input type="date" className="form-control form-control-sm ms-2" style={{width:140}} value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
              <span className="small text-muted">to</span>
              <input type="date" className="form-control form-control-sm" style={{width:140}} value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
            </div>
          </div>

          {loading ? <div className="text-center py-5"><span className="spinner-border"/></div> : (
            <>
              {/* Cashier performance cards */}
              <div className="row g-3 mb-3">
                {(report?.byCashier||[]).filter((c:any)=>c.total_sales>0||c.total_shifts>0).map((c:any)=>(
                  <div key={c.user_id} className="col-md-6 col-lg-4">
                    <div className="card h-100">
                      <div className="card-body">
                        <div className="d-flex align-items-center gap-2 mb-3">
                          <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white" style={{width:40,height:40,background:'#0d6efd',fontSize:'1.1rem',flexShrink:0}}>
                            {c.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div><div className="fw-bold">{c.full_name}</div><div className="text-muted small">{c.total_shifts} shifts · {c.total_sales} sales</div></div>
                        </div>
                        <div className="row g-2 text-center">
                          {[['Revenue',`${curr} ${Number(c.total_revenue).toFixed(2)}`,'#198754'],['Avg Sale',`${curr} ${Number(c.avg_sale).toFixed(2)}`,'#0d6efd'],['Cash',`${curr} ${Number(c.cash_revenue).toFixed(2)}`,'#fd7e14']].map(([l,v,cl]:any)=>(
                            <div key={l} className="col-4"><div style={{background:'#f8f9fa',borderRadius:6,padding:'0.4rem'}}>
                              <div style={{fontWeight:700,color:cl,fontSize:'0.85rem'}}>{v}</div>
                              <div style={{fontSize:'0.68rem',color:'#6c757d'}}>{l}</div>
                            </div></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Shift history table */}
              <div className="card">
                <div className="card-header fw-bold">Shift History</div>
                <div className="card-body p-0">
                  {!report?.shiftHistory?.length ? <div className="text-center text-muted py-3">No shifts in this period</div> : (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead><tr><th>Staff</th><th>Date</th><th>Start</th><th>End</th><th>Duration</th><th>Sales</th><th>Revenue</th><th>Cash Diff</th></tr></thead>
                        <tbody>
                          {report.shiftHistory.map((s:any)=>{
                            const dur = s.ended_at ? Math.round((new Date(s.ended_at).getTime()-new Date(s.started_at).getTime())/60000) : null;
                            return (
                              <tr key={s.shift_id}>
                                <td className="fw-500 small">{s.full_name}</td>
                                <td className="small text-muted">{new Date(s.started_at).toLocaleDateString()}</td>
                                <td className="small">{new Date(s.started_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
                                <td className="small">{s.ended_at?new Date(s.ended_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):<span className="badge bg-success">Active</span>}</td>
                                <td className="small">{dur?`${Math.floor(dur/60)}h ${dur%60}m`:'-'}</td>
                                <td className="small">{s.total_sales}</td>
                                <td className="small fw-500">{curr} {Number(s.total_revenue).toFixed(2)}</td>
                                <td className="small"><span className={Number(s.cash_difference)>=0?'text-success':'text-danger'}>{s.cash_difference!=null?`${Number(s.cash_difference)>=0?'+':''}${curr} ${Number(s.cash_difference).toFixed(2)}`:'-'}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
