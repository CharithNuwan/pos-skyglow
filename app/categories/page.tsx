'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';

interface Category { category_id: number; category_name: string; description: string; is_active: number; }

function CategoriesContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState<Partial<Category> | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/categories');
    const data = await res.json();
    setCategories(data.categories || []);
    setLoading(false);
  }

  async function save() {
    if (!editCat?.category_name) return;
    setSaving(true);
    try {
      const method = editCat.category_id ? 'PUT' : 'POST';
      const url = editCat.category_id ? `/api/categories/${editCat.category_id}` : '/api/categories';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editCat) });
      const data = await res.json();
      if (data.success || data.category_id) {
        setMsg('Category saved!');
        setShowModal(false);
        load();
        setTimeout(() => setMsg(''), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  async function del(id: number) {
    if (!confirm('Delete this category?')) return;
    await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span>All Categories</span>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditCat({ is_active: 1 }); setShowModal(true); }}>
            <i className="bi bi-plus-lg me-1" />Add Category
          </button>
        </div>
        <div className="card-body p-0">
          <table className="table table-hover mb-0">
            <thead><tr><th>#</th><th>Name</th><th>Description</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-4"><span className="spinner-border spinner-border-sm" /></td></tr>
              ) : categories.map(c => (
                <tr key={c.category_id}>
                  <td className="text-muted">{c.category_id}</td>
                  <td className="fw-500">{c.category_name}</td>
                  <td className="text-muted small">{c.description || '-'}</td>
                  <td><span className={`badge ${c.is_active ? 'bg-success' : 'bg-secondary'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-1" onClick={() => { setEditCat({ ...c }); setShowModal(true); }}>
                      <i className="bi bi-pencil" />
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => del(c.category_id)}>
                      <i className="bi bi-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && editCat && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editCat.category_id ? 'Edit' : 'Add'} Category</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Category Name *</label>
                  <input className="form-control" value={editCat.category_name || ''} onChange={e => setEditCat(c => ({ ...c!, category_name: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows={2} value={editCat.description || ''} onChange={e => setEditCat(c => ({ ...c!, description: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={editCat.is_active ?? 1} onChange={e => setEditCat(c => ({ ...c!, is_active: parseInt(e.target.value) }))}>
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={save} disabled={saving || !editCat.category_name}>
                  {saving ? <span className="spinner-border spinner-border-sm" /> : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CategoriesPage() {
  return <AppLayout title="Categories" requiredRole="manager"><CategoriesContent /></AppLayout>;
}
