'use client';
import { useState, useEffect } from 'react';

export default function DrawerClient() {
  const [drawerData, setDrawerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [closeResult, setCloseResult] = useState<any>(null);
  const [curr, setCurr] = useState('Rs');

  useEffect(() => {
    load();
    fetch('/api/settings').then(r => r.json()).then(s => setCurr(s.currency_symbol || 'Rs'));
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/drawer');
    const data = await res.json();
    setDrawerData(data);
    setLoading(false);
  }

  async function openDrawer() {
    setProcessing(true);
    const res = await fetch('/api/drawer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'open', opening_cash: parseFloat(openingCash) || 0 }),
    });
    const data = await res.json();
    if (data.success) { setOpeningCash(''); load(); }
    else alert(data.error);
    setProcessing(false);
  }

  async function closeDrawer() {
    if (!closingCash && closingCash !== '0') { alert('Enter closing cash amount'); return; }
    setProcessing(true);
    const res = await fetch('/api/drawer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close', closing_cash: parseFloat(closingCash) || 0, notes }),
    });
    const data = await res.json();
    if (data.success) { setCloseResult(data.summary); setClosingCash(''); setNotes(''); load(); }
    else alert(data.error);
    setProcessing(false);
  }

  if (loading) return <div className="text-center py-5"><span className="spinner-border" /></div>;

  const { open, history } = drawerData || {};

  return (
    <div className="row g-3">
      {/* Left panel - current status */}
      <div className="col-lg-5">

        {/* Close result flash */}
        {closeResult && (
          <div className="alert alert-success alert-dismissible mb-3">
            <button className="btn-close" onClick={() => setCloseResult(null)} />
            <div className="fw-bold mb-2">✅ Drawer Closed Successfully</div>
            <div className="row g-2 text-center">
              {[
                ['Cash Sales', `${curr} ${Number(closeResult.cash_sales||0).toFixed(2)}`, '#198754'],
                ['Online Sales', `${curr} ${Number(closeResult.online_sales||0).toFixed(2)}`, '#0d6efd'],
                ['Total Orders', closeResult.total_sales || 0, '#fd7e14'],
              ].map(([l,v,c]: any) => (
                <div key={l} className="col-4">
                  <div style={{ background: 'rgba(0,0,0,0.05)', borderRadius: 6, padding: '0.5rem' }}>
                    <div style={{ fontWeight: 700, color: c, fontSize: '1.1rem' }}>{v}</div>
                    <div style={{ fontSize: '0.72rem' }}>{l}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 small">
              Expected cash: <strong>{curr} {Number(closeResult.expectedCash||0).toFixed(2)}</strong> ·
              Actual: <strong>{curr} {Number(closeResult.closing_cash||0).toFixed(2)}</strong> ·
              Difference: <strong className={closeResult.diff >= 0 ? 'text-success' : 'text-danger'}>
                {closeResult.diff >= 0 ? '+' : ''}{curr} {Number(closeResult.diff||0).toFixed(2)}
              </strong>
            </div>
          </div>
        )}

        {open ? (
          /* Drawer is OPEN */
          <div className="card">
            <div className="card-header d-flex align-items-center gap-2">
              <span className="badge bg-success">● OPEN</span>
              <span className="fw-bold">Current Session</span>
            </div>
            <div className="card-body">
              <div className="mb-3 p-3 rounded" style={{ background: '#f0fff4', border: '1px solid #c3e6cb' }}>
                <div className="text-muted small">Opened by</div>
                <div className="fw-bold">{open.full_name}</div>
                <div className="text-muted small mt-1">Opened at</div>
                <div className="fw-500">{new Date(open.opened_at).toLocaleString()}</div>
                <div className="text-muted small mt-1">Opening Cash</div>
                <div className="fw-bold fs-5">{curr} {Number(open.opening_cash).toFixed(2)}</div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold">Closing Cash (count the drawer)</label>
                <div className="input-group input-group-lg">
                  <span className="input-group-text">{curr}</span>
                  <input type="number" className="form-control" min="0" step="0.01"
                    placeholder="0.00" value={closingCash}
                    onChange={e => setClosingCash(e.target.value)} />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Notes (optional)</label>
                <textarea className="form-control" rows={2} value={notes}
                  onChange={e => setNotes(e.target.value)} placeholder="Any notes about this session..." />
              </div>
              <button className="btn btn-danger w-100" onClick={closeDrawer} disabled={processing}>
                {processing ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-lock me-2" />}
                Close Drawer & Generate Summary
              </button>
            </div>
          </div>
        ) : (
          /* Drawer is CLOSED */
          <div className="card">
            <div className="card-header d-flex align-items-center gap-2">
              <span className="badge bg-secondary">● CLOSED</span>
              <span className="fw-bold">Open New Session</span>
            </div>
            <div className="card-body">
              <p className="text-muted small">Count your cash drawer and enter the opening amount before starting sales.</p>
              <div className="mb-3">
                <label className="form-label fw-bold">Opening Cash Amount</label>
                <div className="input-group input-group-lg">
                  <span className="input-group-text">{curr}</span>
                  <input type="number" className="form-control" min="0" step="0.01"
                    placeholder="0.00" value={openingCash}
                    onChange={e => setOpeningCash(e.target.value)} />
                </div>
                <div className="form-text">Enter 0 if starting with empty drawer</div>
              </div>
              <button className="btn btn-success w-100 btn-lg" onClick={openDrawer} disabled={processing}>
                {processing ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-unlock me-2" />}
                Open Drawer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right panel - history */}
      <div className="col-lg-7">
        <div className="card">
          <div className="card-header fw-bold">Recent Sessions</div>
          <div className="card-body p-0">
            {!history?.length ? (
              <div className="text-center text-muted py-4">No closed sessions yet</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead><tr><th>Date</th><th>Opened By</th><th>Sales</th><th>Cash</th><th>Online</th><th>Diff</th></tr></thead>
                  <tbody>
                    {history.map((h: any) => (
                      <tr key={h.drawer_id}>
                        <td className="small">
                          <div>{new Date(h.opened_at).toLocaleDateString()}</div>
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {new Date(h.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                            {new Date(h.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="small">{h.full_name}</td>
                        <td className="small">{h.total_sales}</td>
                        <td className="small fw-500">{curr} {Number(h.total_cash_sales).toFixed(2)}</td>
                        <td className="small">{curr} {Number(h.total_online_sales).toFixed(2)}</td>
                        <td className="small">
                          <span className={Number(h.cash_difference) >= 0 ? 'text-success' : 'text-danger'}>
                            {Number(h.cash_difference) >= 0 ? '+' : ''}{curr} {Number(h.cash_difference).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
