'use client';
import { useState, useEffect } from 'react';

interface Warehouse { warehouse_id: number; company_id: number; name: string; code: string | null; is_default: number; created_at: string; }

export default function WarehousesClient() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editWh, setEditWh] = useState<Partial<Warehouse> | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'danger'>('success');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/warehouses');
    const data = await res.json();
    setWarehouses(data.warehouses || []);
    setLoading(false);
  }

  async function save() {
    if (!editWh?.name?.trim()) return;
    setSaving(true);
    try {
      const method = editWh.warehouse_id ? 'PATCH' : 'POST';
      const url = editWh.warehouse_id ? `/api/warehouses/${editWh.warehouse_id}` : '/api/warehouses';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editWh) });
      const data = await res.json();
      if (data.success || data.warehouse_id) {
        setMsgType('success');
        setMsg('Saved!');
        setShowModal(false);
        load();
        setTimeout(() => setMsg(''), 3000);
      } else {
        setMsgType('danger');
        setMsg(data.error || 'Failed');
        setTimeout(() => setMsg(''), 4000);
      }
    } finally {
      setSaving(false);
    }
  }

  async function del(id: number) {
    if (!confirm('Delete this warehouse? It must have no stock.')) return;
    const res = await fetch(`/api/warehouses/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setMsgType('success');
      setMsg('Deleted');
      load();
      setTimeout(() => setMsg(''), 3000);
    } else {
      setMsgType('danger');
      setMsg(data.error || 'Delete failed');
      setTimeout(() => setMsg(''), 4000);
    }
  }

  return (
    <div>
      {msg && <div className={`alert alert-${msgType} alert-dismissible`}>{msg}<button className="btn-close" onClick={() => setMsg('')} /></div>}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span>Warehouses</span>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditWh({ is_default: 0 }); setShowModal(true); }}>
            <i className="bi bi-plus-lg me-1" />Add Warehouse
          </button>
        </div>
        <div className="card-body p-0">
          <table className="table table-hover mb-0">
            <thead><tr><th>#</th><th>Name</th><th>Code</th><th>Default</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="text-center py-4"><span className="spinner-border spinner-border-sm" /></td></tr>
                : warehouses.length === 0 ? <tr><td colSpan={5} className="text-center text-muted py-4">No warehouses yet</td></tr>
                : warehouses.map(w => (
                  <tr key={w.warehouse_id}>
                    <td className="text-muted">{w.warehouse_id}</td>
                    <td className="fw-500">{w.name}</td>
                    <td className="text-muted small">{w.code || '-'}</td>
                    <td>{w.is_default ? <span className="badge bg-primary">Default</span> : '-'}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => { setEditWh({ ...w }); setShowModal(true); }}><i className="bi bi-pencil" /></button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => del(w.warehouse_id)}><i className="bi bi-trash" /></button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && editWh && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog"><div className="modal-content">
            <div className="modal-header"><h5 className="modal-title">{editWh.warehouse_id ? 'Edit' : 'Add'} Warehouse</h5><button className="btn-close" onClick={() => setShowModal(false)} /></div>
            <div className="modal-body">
              <div className="mb-3"><label className="form-label">Name *</label><input className="form-control" value={editWh.name || ''} onChange={e => setEditWh(c => ({ ...c!, name: e.target.value }))} /></div>
              <div className="mb-3"><label className="form-label">Code</label><input className="form-control" placeholder="e.g. MAIN" value={editWh.code || ''} onChange={e => setEditWh(c => ({ ...c!, code: e.target.value }))} /></div>
              <div className="mb-3"><div className="form-check"><input className="form-check-input" type="checkbox" id="def" checked={!!editWh.is_default} onChange={e => setEditWh(c => ({ ...c!, is_default: e.target.checked ? 1 : 0 }))} /><label className="form-check-label" htmlFor="def">Default warehouse</label></div></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving || !editWh.name?.trim()}>{saving ? <span className="spinner-border spinner-border-sm" /> : 'Save'}</button></div>
          </div></div>
        </div>
      )}
    </div>
  );
}
