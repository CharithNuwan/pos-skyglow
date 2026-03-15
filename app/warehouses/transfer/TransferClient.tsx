'use client';
import { useState, useEffect } from 'react';

interface Warehouse { warehouse_id: number; name: string; code: string | null; is_default: number; }
interface Product { product_id: number; product_name: string; barcode: string; quantity: number; category_name: string; }

export default function TransferClient() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [fromId, setFromId] = useState<number | ''>('');
  const [toId, setToId] = useState<number | ''>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'danger'>('success');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/warehouses').then(r => r.json()).then(d => setWarehouses(d.warehouses || []));
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

  useEffect(() => {
    fetch('/api/stock-logs?type=transfer').then(r => r.json()).then(d => setHistory(d.logs || []));
  }, [msg]);

  function selectProduct(p: Product) {
    setSelected(p);
    setQuantity('');
    setSearch('');
    setProducts([]);
  }

  async function transfer() {
    if (!fromId || !toId || !selected) {
      setMsg('Select from warehouse, to warehouse, and product.'); setMsgType('danger'); return;
    }
    if (fromId === toId) {
      setMsg('From and to warehouse must be different.'); setMsgType('danger'); return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      setMsg('Enter a valid quantity.'); setMsgType('danger'); return;
    }
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/warehouses/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_warehouse_id: fromId, to_warehouse_id: toId, product_id: selected.product_id, quantity: qty }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg(data.message || 'Transfer done.');
        setMsgType('success');
        setSelected(null);
        setQuantity('');
        fetch('/api/stock-logs?type=transfer').then(r => r.json()).then(d => setHistory(d.logs || []));
      } else {
        setMsg(data.error || 'Transfer failed.');
        setMsgType('danger');
      }
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 6000);
    }
  }

  return (
    <div className="row g-3">
      <div className="col-lg-5">
        {msg && <div className={`alert alert-${msgType} mb-3`}>{msg}</div>}

        <div className="card">
          <div className="card-header fw-bold"><i className="bi bi-arrow-left-right me-2" />Transfer Stock</div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label fw-600">From warehouse</label>
              <select className="form-select" value={fromId} onChange={e => setFromId(e.target.value ? parseInt(e.target.value, 10) : '')}>
                <option value="">Select...</option>
                {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}{w.is_default ? ' (default)' : ''}</option>)}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label fw-600">To warehouse</label>
              <select className="form-select" value={toId} onChange={e => setToId(e.target.value ? parseInt(e.target.value, 10) : '')}>
                <option value="">Select...</option>
                {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}{w.is_default ? ' (default)' : ''}</option>)}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label fw-600">Product</label>
              <input className="form-control" placeholder="Search product name or barcode..." value={search} onChange={e => setSearch(e.target.value)} />
              {loading && <div className="text-center mt-2"><span className="spinner-border spinner-border-sm" /></div>}
              {products.length > 0 && (
                <div className="border rounded mt-1" style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {products.map(p => (
                    <div key={p.product_id} className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center" style={{ cursor: 'pointer' }} onClick={() => selectProduct(p)}>
                      <div>
                        <div className="fw-500 small">{p.product_name}</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>{p.category_name}</div>
                      </div>
                      <span className="badge bg-secondary">{p.quantity} total</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selected && (
              <>
                <div className="alert alert-light border mb-3 py-2">
                  <div className="fw-bold">{selected.product_name}</div>
                  <div className="text-muted small">Total stock: <strong>{selected.quantity} units</strong></div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-600">Quantity to transfer</label>
                  <input type="number" className="form-control" min={1} placeholder="0" value={quantity} onChange={e => setQuantity(e.target.value)} />
                </div>
                <button className="btn btn-primary w-100" onClick={transfer} disabled={saving || !quantity || parseInt(quantity, 10) < 1}>
                  {saving ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-arrow-left-right me-2" />}
                  Transfer
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="col-lg-7">
        <div className="card">
          <div className="card-header fw-bold"><i className="bi bi-clock-history me-2" />Recent Transfers</div>
          <div className="card-body p-0">
            {history.length === 0 ? <div className="text-center text-muted py-4">No transfers yet</div> : (
              <table className="table table-hover mb-0">
                <thead><tr><th>Product</th><th>Before</th><th>Change</th><th>After</th><th>Notes</th><th>By</th><th>When</th></tr></thead>
                <tbody>
                  {history.map((h: any, i: number) => (
                    <tr key={i}>
                      <td className="small fw-500">{h.product_name}</td>
                      <td className="small text-muted">{h.quantity_before}</td>
                      <td className="small text-danger fw-bold">{h.quantity_change}</td>
                      <td className="small fw-600">{h.quantity_after}</td>
                      <td className="small text-muted" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h.notes}>{h.notes}</td>
                      <td className="small">{h.full_name}</td>
                      <td className="small text-muted">{new Date(h.created_at).toLocaleString()}</td>
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
