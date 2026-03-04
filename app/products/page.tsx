'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';

interface Product {
  product_id: number; product_name: string; barcode: string;
  selling_price: number; cost_price: number; quantity: number;
  minimum_stock: number; category_name: string; is_active: number;
}
interface Category { category_id: number; category_name: string; }

// We need a wrapper since AppLayout is server
import dynamic from 'next/dynamic';

function ProductsContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { loadProducts(); }, [search, catFilter, page]);
  useEffect(() => { loadCategories(); }, []);

  async function loadProducts() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set('search', search);
    if (catFilter) params.set('category', catFilter);
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data.products || []);
    setTotal(data.total || 0);
    setLoading(false);
  }

  async function loadCategories() {
    const res = await fetch('/api/categories');
    const data = await res.json();
    setCategories(data.categories || []);
  }

  function openAdd() {
    setEditProduct({ selling_price: 0, cost_price: 0, quantity: 0, minimum_stock: 5, is_active: 1 });
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditProduct({ ...p });
    setShowModal(true);
  }

  async function saveProduct() {
    if (!editProduct?.product_name) return;
    setSaving(true);
    try {
      const method = editProduct.product_id ? 'PUT' : 'POST';
      const url = editProduct.product_id ? `/api/products/${editProduct.product_id}` : '/api/products';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editProduct) });
      const data = await res.json();
      if (data.success || data.product_id) {
        setMsg('Product saved!');
        setShowModal(false);
        loadProducts();
        setTimeout(() => setMsg(''), 3000);
      } else {
        alert(data.error || 'Error saving');
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: number) {
    if (!confirm('Are you sure?')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    loadProducts();
  }

  return (
    <div>
      {msg && <div className="alert alert-success alert-dismissible">{msg}<button className="btn-close" onClick={() => setMsg('')} /></div>}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex gap-2 flex-wrap">
            <input className="form-control form-control-sm" style={{ width: 220 }} placeholder="Search products..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="form-select form-select-sm" style={{ width: 170 }} value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <i className="bi bi-plus-lg me-1" />Add Product
          </button>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Barcode</th>
                  <th>Category</th>
                  <th>Cost</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-4"><span className="spinner-border spinner-border-sm" /></td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">No products found</td></tr>
                ) : products.map(p => (
                  <tr key={p.product_id}>
                    <td className="fw-500">{p.product_name}</td>
                    <td className="text-muted small">{p.barcode || '-'}</td>
                    <td>{p.category_name || '-'}</td>
                    <td>${Number(p.cost_price).toFixed(2)}</td>
                    <td className="fw-600">${Number(p.selling_price).toFixed(2)}</td>
                    <td>
                      <span className={p.quantity <= p.minimum_stock ? 'text-danger fw-600' : ''}>
                        {p.quantity}
                        {p.quantity <= p.minimum_stock && <span className="low-stock-badge ms-1">Low</span>}
                      </span>
                    </td>
                    <td><span className={`badge ${p.is_active ? 'bg-success' : 'bg-secondary'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(p)}>
                        <i className="bi bi-pencil" />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => deleteProduct(p.product_id)}>
                        <i className="bi bi-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {total > 20 && (
          <div className="card-footer d-flex justify-content-between align-items-center">
            <small className="text-muted">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</small>
            <div className="d-flex gap-1">
              <button className="btn btn-sm btn-outline-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
              <button className="btn btn-sm btn-outline-secondary" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next ›</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && editProduct && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editProduct.product_id ? 'Edit Product' : 'Add Product'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label">Product Name *</label>
                    <input className="form-control" value={editProduct.product_name || ''} onChange={e => setEditProduct(p => ({ ...p!, product_name: e.target.value }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Barcode</label>
                    <input className="form-control" value={editProduct.barcode || ''} onChange={e => setEditProduct(p => ({ ...p!, barcode: e.target.value }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={editProduct.category_name ? categories.find(c => c.category_name === editProduct.category_name)?.category_id || '' : ''} onChange={e => setEditProduct(p => ({ ...p!, category_id: parseInt(e.target.value) }))}>
                      <option value="">None</option>
                      {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Cost Price</label>
                    <input type="number" className="form-control" min="0" step="0.01" value={editProduct.cost_price || 0} onChange={e => setEditProduct(p => ({ ...p!, cost_price: parseFloat(e.target.value) }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Selling Price *</label>
                    <input type="number" className="form-control" min="0" step="0.01" value={editProduct.selling_price || 0} onChange={e => setEditProduct(p => ({ ...p!, selling_price: parseFloat(e.target.value) }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Quantity</label>
                    <input type="number" className="form-control" min="0" value={editProduct.quantity || 0} onChange={e => setEditProduct(p => ({ ...p!, quantity: parseInt(e.target.value) }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Min Stock</label>
                    <input type="number" className="form-control" min="0" value={editProduct.minimum_stock || 5} onChange={e => setEditProduct(p => ({ ...p!, minimum_stock: parseInt(e.target.value) }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={editProduct.is_active ?? 1} onChange={e => setEditProduct(p => ({ ...p!, is_active: parseInt(e.target.value) }))}>
                      <option value={1}>Active</option>
                      <option value={0}>Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveProduct} disabled={saving}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</> : 'Save Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap with AppLayout on server
export default function ProductsPage() {
  return (
    <AppLayout title="Products" requiredRole="manager">
      <ProductsContent />
    </AppLayout>
  );
}
