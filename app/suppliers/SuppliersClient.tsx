'use client';
import { useState, useEffect } from 'react';

interface Supplier { supplier_id: number; supplier_name: string; contact_person: string; phone: string; email: string; address: string; notes: string; product_count: number; is_active: number; }

export default function SuppliersClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSup, setEditSup] = useState<Partial<Supplier> | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, [search]);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    const res = await fetch(`/api/suppliers?${p}`);
    const data = await res.json();
    setSuppliers(data.suppliers || []);
    setLoading(false);
  }

  async function save() {
    if (!editSup?.supplier_name) return;
    setSaving(true);
    try {
      const method = editSup.supplier_id ? 'PUT' : 'POST';
      const url = editSup.supplier_id ? `/api/suppliers/${editSup.supplier_id}` : '/api/suppliers';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editSup) });
      const data = await res.json();
      if (data.success || data.supplier_id) { setMsg('Saved!'); setShowModal(false); load(); setTimeout(() => setMsg(''), 3000); }
    } finally { setSaving(false); }
  }

  return (
    <div>
      {msg && <div className="alert alert-success alert-dismissible">{msg}<button className="btn-close" onClick={() => setMsg('')}/></div>}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center gap-2 flex-wrap">
          <input className="form-control form-control-sm" style={{ width: 220 }} placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={() => { setEditSup({ is_active: 1 }); setShowModal(true); }}>
            <i className="bi bi-plus-lg me-1"/>Add Supplier
          </button>
        </div>
        <div className="card-body p-0">
          <table className="table table-hover mb-0">
            <thead><tr><th>Supplier</th><th>Contact</th><th>Phone</th><th>Products</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="text-center py-4"><span className="spinner-border spinner-border-sm"/></td></tr>
              : suppliers.length === 0 ? <tr><td colSpan={5} className="text-center text-muted py-4">No suppliers yet</td></tr>
              : suppliers.map(s => (
                <tr key={s.supplier_id}>
                  <td>
                    <div className="fw-500">{s.supplier_name}</div>
                    {s.email && <div className="text-muted small">{s.email}</div>}
                  </td>
                  <td className="small">{s.contact_person || '-'}</td>
                  <td className="small">{s.phone || '-'}</td>
                  <td><span className="badge bg-light text-dark">{s.product_count} products</span></td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary" onClick={() => { setEditSup({ ...s }); setShowModal(true); }}>
                      <i className="bi bi-pencil"/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && editSup && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog"><div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{editSup.supplier_id ? 'Edit' : 'Add'} Supplier</h5>
              <button className="btn-close" onClick={() => setShowModal(false)}/>
            </div>
            <div className="modal-body"><div className="row g-3">
              <div className="col-12"><label className="form-label">Supplier Name *</label><input className="form-control" value={editSup.supplier_name || ''} onChange={e => setEditSup(s => ({ ...s!, supplier_name: e.target.value }))}/></div>
              <div className="col-md-6"><label className="form-label">Contact Person</label><input className="form-control" value={editSup.contact_person || ''} onChange={e => setEditSup(s => ({ ...s!, contact_person: e.target.value }))}/></div>
              <div className="col-md-6"><label className="form-label">Phone</label><input className="form-control" value={editSup.phone || ''} onChange={e => setEditSup(s => ({ ...s!, phone: e.target.value }))}/></div>
              <div className="col-md-6"><label className="form-label">Email</label><input type="email" className="form-control" value={editSup.email || ''} onChange={e => setEditSup(s => ({ ...s!, email: e.target.value }))}/></div>
              <div className="col-md-6"><label className="form-label">Address</label><input className="form-control" value={editSup.address || ''} onChange={e => setEditSup(s => ({ ...s!, address: e.target.value }))}/></div>
              <div className="col-12"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={editSup.notes || ''} onChange={e => setEditSup(s => ({ ...s!, notes: e.target.value }))}/></div>
            </div></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <span className="spinner-border spinner-border-sm"/> : 'Save'}</button>
            </div>
          </div></div>
        </div>
      )}
    </div>
  );
}
