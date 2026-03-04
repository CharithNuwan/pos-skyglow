'use client';
import { useState, useEffect } from 'react';

interface Customer { customer_id: number; full_name: string; phone: string; email: string; address: string; loyalty_points: number; total_spent: number; visit_count: number; notes: string; is_active: number; }

export default function CustomersClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [curr, setCurr] = useState('Rs');
  const [showModal, setShowModal] = useState(false);
  const [editCust, setEditCust] = useState<Partial<Customer> | null>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchLoading, setPurchLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { fetch('/api/settings').then(r=>r.json()).then(s=>setCurr(s.currency_symbol||'Rs')); }, []);
  useEffect(() => { load(); }, [search, page]);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page) });
    if (search) p.set('search', search);
    const res = await fetch(`/api/customers?${p}`);
    const data = await res.json();
    setCustomers(data.customers || []); setTotal(data.total || 0); setLoading(false);
  }

  async function viewCustomer(c: Customer) {
    setSelected(c); setPurchLoading(true);
    const res = await fetch(`/api/customers/${c.customer_id}`);
    const data = await res.json();
    setPurchases(data.purchases || []); setPurchLoading(false);
  }

  async function save() {
    if (!editCust?.full_name) return;
    setSaving(true);
    try {
      const method = editCust.customer_id ? 'PUT' : 'POST';
      const url = editCust.customer_id ? `/api/customers/${editCust.customer_id}` : '/api/customers';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editCust) });
      const data = await res.json();
      if (data.success || data.customer_id) { setMsg('Saved!'); setShowModal(false); load(); setTimeout(()=>setMsg(''),3000); }
    } finally { setSaving(false); }
  }

  return (
    <div className="row g-3">
      <div className={selected ? 'col-lg-7' : 'col-12'}>
        {msg && <div className="alert alert-success">{msg}</div>}
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center gap-2 flex-wrap">
            <input className="form-control form-control-sm" style={{width:220}} placeholder="Search by name, phone..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
            <button className="btn btn-primary btn-sm" onClick={()=>{setEditCust({is_active:1});setShowModal(true);}}>
              <i className="bi bi-person-plus me-1"/>Add Customer
            </button>
          </div>
          <div className="card-body p-0">
            <table className="table table-hover mb-0">
              <thead><tr><th>Name</th><th>Phone</th><th>Visits</th><th>Total Spent</th><th>Points</th><th></th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className="text-center py-4"><span className="spinner-border spinner-border-sm"/></td></tr>
                : customers.length === 0 ? <tr><td colSpan={6} className="text-center text-muted py-4">No customers yet</td></tr>
                : customers.map(c => (
                  <tr key={c.customer_id} className={selected?.customer_id === c.customer_id ? 'table-primary' : ''}>
                    <td>
                      <div className="fw-500">{c.full_name}</div>
                      {c.email && <div className="text-muted small">{c.email}</div>}
                    </td>
                    <td className="small">{c.phone || '-'}</td>
                    <td className="small">{c.visit_count}</td>
                    <td className="small fw-600">{curr} {Number(c.total_spent).toFixed(2)}</td>
                    <td><span className="badge bg-warning text-dark">⭐ {c.loyalty_points}</span></td>
                    <td>
                      <button className="btn btn-sm btn-outline-info me-1" onClick={()=>viewCustomer(c)} title="View history"><i className="bi bi-clock-history"/></button>
                      <button className="btn btn-sm btn-outline-primary" onClick={()=>{setEditCust({...c});setShowModal(true);}}><i className="bi bi-pencil"/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > 20 && (
            <div className="card-footer d-flex justify-content-between">
              <small className="text-muted">{total} customers</small>
              <div className="d-flex gap-1">
                <button className="btn btn-sm btn-outline-secondary" disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button>
                <button className="btn btn-sm btn-outline-secondary" disabled={page*20>=total} onClick={()=>setPage(p=>p+1)}>›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Purchase history panel */}
      {selected && (
        <div className="col-lg-5">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-bold">{selected.full_name}</div>
                <div className="text-muted small">{selected.phone} · {curr} {Number(selected.total_spent).toFixed(2)} spent · {selected.visit_count} visits</div>
              </div>
              <button className="btn btn-sm btn-outline-secondary" onClick={()=>setSelected(null)}>✕</button>
            </div>
            <div className="card-body p-0">
              {purchLoading ? <div className="text-center py-3"><span className="spinner-border spinner-border-sm"/></div>
              : purchases.length === 0 ? <div className="text-center text-muted py-4">No purchases yet</div>
              : (
                <table className="table table-sm mb-0">
                  <thead><tr><th>Invoice</th><th>Amount</th><th>Method</th><th>Date</th></tr></thead>
                  <tbody>
                    {purchases.map((p:any) => (
                      <tr key={p.sale_id}>
                        <td className="small fw-500">{p.invoice_number}</td>
                        <td className="small fw-600">{curr} {Number(p.total_amount).toFixed(2)}</td>
                        <td className="small text-capitalize">{p.payment_method}</td>
                        <td className="small text-muted">{new Date(p.sale_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && editCust && (
        <div className="modal show d-block" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog"><div className="modal-content">
            <div className="modal-header"><h5 className="modal-title">{editCust.customer_id?'Edit':'Add'} Customer</h5><button className="btn-close" onClick={()=>setShowModal(false)}/></div>
            <div className="modal-body"><div className="row g-3">
              <div className="col-12"><label className="form-label">Full Name *</label><input className="form-control" value={editCust.full_name||''} onChange={e=>setEditCust(c=>({...c!,full_name:e.target.value}))}/></div>
              <div className="col-md-6"><label className="form-label">Phone</label><input className="form-control" value={editCust.phone||''} onChange={e=>setEditCust(c=>({...c!,phone:e.target.value}))}/></div>
              <div className="col-md-6"><label className="form-label">Email</label><input type="email" className="form-control" value={editCust.email||''} onChange={e=>setEditCust(c=>({...c!,email:e.target.value}))}/></div>
              <div className="col-12"><label className="form-label">Address</label><input className="form-control" value={editCust.address||''} onChange={e=>setEditCust(c=>({...c!,address:e.target.value}))}/></div>
              <div className="col-12"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={editCust.notes||''} onChange={e=>setEditCust(c=>({...c!,notes:e.target.value}))}/></div>
            </div></div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<span className="spinner-border spinner-border-sm"/>:'Save'}</button></div>
          </div></div>
        </div>
      )}
    </div>
  );
}
