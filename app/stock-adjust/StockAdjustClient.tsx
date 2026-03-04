'use client';
import { useState, useEffect } from 'react';

interface Product { product_id: number; product_name: string; short_name: string; barcode: string; quantity: number; minimum_stock: number; category_name: string; }

const REASONS = ['Stock count correction', 'Damaged goods', 'Theft / loss', 'Returned to supplier', 'Expired items', 'Found extra stock', 'Other'];

export default function StockAdjustClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [newQty, setNewQty] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success'|'danger'>('success');

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (search.length < 1) { setProducts([]); return; }
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/products?search=${encodeURIComponent(search)}&page=1`)
        .then(r => r.json()).then(d => { setProducts(d.products || []); setLoading(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function loadHistory() {
    const res = await fetch('/api/stock-logs');
    const data = await res.json();
    setHistory(data.logs || []);
  }

  function selectProduct(p: Product) {
    setSelected(p);
    setNewQty(String(p.quantity));
    setSearch('');
    setProducts([]);
  }

  async function adjust() {
    if (!selected || newQty === '') return;
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 0) { setMsg('Invalid quantity'); setMsgType('danger'); return; }
    setSaving(true);
    try {
      const finalReason = reason === 'Other' ? customReason : reason;
      const res = await fetch('/api/products/adjust', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: selected.product_id, new_quantity: qty, reason: finalReason }),
      });
      const data = await res.json();
      if (data.success) {
        const diff = data.diff;
        setMsg(`✓ "${selected.product_name}" adjusted: ${data.quantity_before} → ${data.quantity_after} (${diff >= 0 ? '+' : ''}${diff})`);
        setMsgType('success');
        setSelected(null); setNewQty(''); setSearch('');
        loadHistory();
      } else { setMsg(data.error || 'Failed'); setMsgType('danger'); }
    } finally { setSaving(false); setTimeout(() => setMsg(''), 6000); }
  }

  const diff = selected ? (parseInt(newQty || '0') - selected.quantity) : 0;

  return (
    <div className="row g-3">
      <div className="col-lg-5">
        {msg && <div className={`alert alert-${msgType} mb-3`}>{msg}</div>}

        <div className="card">
          <div className="card-header fw-bold"><i className="bi bi-sliders me-2"/>Adjust Stock</div>
          <div className="card-body">
            {/* Step 1 - search product */}
            <div className="mb-3">
              <label className="form-label fw-600">1. Search Product</label>
              <input className="form-control" placeholder="Type product name or barcode..." value={search} onChange={e => setSearch(e.target.value)} />
              {loading && <div className="text-center mt-2"><span className="spinner-border spinner-border-sm"/></div>}
              {products.length > 0 && (
                <div className="border rounded mt-1" style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {products.map(p => (
                    <div key={p.product_id} className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center" style={{ cursor: 'pointer' }}
                      onClick={() => selectProduct(p)}>
                      <div>
                        <div className="fw-500 small">{p.product_name}</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>{p.category_name}</div>
                      </div>
                      <span className={`badge ${p.quantity <= p.minimum_stock ? 'bg-danger' : 'bg-secondary'}`}>{p.quantity} in stock</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2 - adjust */}
            {selected && (
              <>
                <div className="alert alert-light border mb-3 py-2">
                  <div className="fw-bold">{selected.product_name}</div>
                  <div className="text-muted small">Current stock: <strong className={selected.quantity <= selected.minimum_stock ? 'text-danger' : ''}>{selected.quantity} units</strong></div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-600">2. Set Correct Quantity</label>
                  <div className="d-flex align-items-center gap-3">
                    <input type="number" className="form-control form-control-lg text-center fw-bold" style={{ width: 120 }} min="0"
                      value={newQty} onChange={e => setNewQty(e.target.value)} />
                    {newQty !== '' && parseInt(newQty) !== selected.quantity && (
                      <div className={`fs-5 fw-bold ${diff > 0 ? 'text-success' : 'text-danger'}`}>
                        {diff > 0 ? '▲' : '▼'} {Math.abs(diff)} units
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-600">3. Reason</label>
                  <select className="form-select mb-2" value={reason} onChange={e => setReason(e.target.value)}>
                    {REASONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                  {reason === 'Other' && (
                    <input className="form-control" placeholder="Describe reason..." value={customReason} onChange={e => setCustomReason(e.target.value)} />
                  )}
                </div>

                <div className="d-flex gap-2">
                  <button className="btn btn-secondary" onClick={() => { setSelected(null); setNewQty(''); }}>Cancel</button>
                  <button className="btn btn-warning flex-fill fw-bold" onClick={adjust} disabled={saving || newQty === '' || parseInt(newQty) === selected.quantity}>
                    {saving ? <span className="spinner-border spinner-border-sm me-2"/> : <i className="bi bi-sliders me-2"/>}
                    Apply Adjustment
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Adjustment history */}
      <div className="col-lg-7">
        <div className="card">
          <div className="card-header fw-bold"><i className="bi bi-clock-history me-2"/>Recent Adjustments</div>
          <div className="card-body p-0">
            {history.length === 0 ? <div className="text-center text-muted py-4">No adjustments yet</div> : (
              <table className="table table-hover mb-0">
                <thead><tr><th>Product</th><th>Before</th><th>Change</th><th>After</th><th>Reason</th><th>By</th><th>When</th></tr></thead>
                <tbody>
                  {history.map((h: any, i: number) => (
                    <tr key={i}>
                      <td className="small fw-500">{h.product_name}</td>
                      <td className="small text-muted">{h.quantity_before}</td>
                      <td className="small">
                        <span className={h.quantity_change > 0 ? 'text-success fw-bold' : h.quantity_change < 0 ? 'text-danger fw-bold' : 'text-muted'}>
                          {h.quantity_change > 0 ? '+' : ''}{h.quantity_change}
                        </span>
                      </td>
                      <td className="small fw-600">{h.quantity_after}</td>
                      <td className="small text-muted" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.notes}</td>
                      <td className="small">{h.full_name}</td>
                      <td className="small text-muted">{new Date(h.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
