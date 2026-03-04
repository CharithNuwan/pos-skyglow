'use client';
import { useState, useEffect, useRef } from 'react';

interface Product {
  product_id: number; product_name: string; barcode: string;
  selling_price: number; cost_price: number; quantity: number;
  minimum_stock: number; category_name: string; category_id: number; is_active: number;
}
interface Category { category_id: number; category_name: string; }

export default function ProductsClient() {
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
  const [msgType, setMsgType] = useState<'success'|'danger'>('success');

  // Import state
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  function showMsg(text: string, type: 'success'|'danger' = 'success') {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 5000);
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
        showMsg('Product saved!'); setShowModal(false); loadProducts();
      } else { showMsg(data.error || 'Error saving', 'danger'); }
    } finally { setSaving(false); }
  }

  async function deleteProduct(id: number) {
    if (!confirm('Are you sure?')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    loadProducts();
  }

  // Export CSV
  function exportCSV() {
    window.location.href = '/api/products/export';
  }

  // Import CSV/Excel
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/products/import', { method: 'POST', body: formData });
      const data = await res.json();
      setImportResult(data);
      if (data.success) { loadProducts(); }
    } catch (err) {
      setImportResult({ error: 'Upload failed' });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // Download template
  function downloadTemplate() {
    const csv = [
      'barcode,product_name,category_name,cost_price,selling_price,quantity,minimum_stock,description',
      '1234567890123,Sample Product,Electronics,10.00,19.99,50,5,Product description here',
      '9876543210987,Another Product,Clothing,5.00,12.99,100,10,Another description',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'products-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {msg && (
        <div className={`alert alert-${msgType} alert-dismissible`}>
          {msg}<button className="btn-close" onClick={() => setMsg('')} />
        </div>
      )}

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex gap-2 flex-wrap">
            <input className="form-control form-control-sm" style={{ width: 220 }}
              placeholder="Search products..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="form-select form-select-sm" style={{ width: 170 }}
              value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
            </select>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {/* Import button */}
            <button className="btn btn-outline-success btn-sm" onClick={() => setShowImport(s => !s)}>
              <i className="bi bi-upload me-1" />Import CSV
            </button>
            {/* Export button */}
            <button className="btn btn-outline-secondary btn-sm" onClick={exportCSV}>
              <i className="bi bi-download me-1" />Export CSV
            </button>
            {/* Add product */}
            <button className="btn btn-primary btn-sm" onClick={() => {
              setEditProduct({ selling_price: 0, cost_price: 0, quantity: 0, minimum_stock: 5, is_active: 1 });
              setShowModal(true);
            }}>
              <i className="bi bi-plus-lg me-1" />Add Product
            </button>
          </div>
        </div>

        {/* Import Panel */}
        {showImport && (
          <div className="card-body border-bottom" style={{ background: '#f8fff8' }}>
            <div className="row g-3 align-items-start">
              <div className="col-md-6">
                <h6 className="fw-bold mb-2"><i className="bi bi-upload me-2 text-success" />Import Products from CSV</h6>
                <p className="text-muted small mb-2">
                  Upload a CSV file to bulk import products. Existing products with the same barcode will be <strong>updated</strong>.
                  New products will be <strong>added</strong>.
                </p>
                <div className="mb-2">
                  <label className="form-label small fw-600">Supported column names:</label>
                  <div className="small text-muted" style={{ lineHeight: 1.8 }}>
                    <code>product_name</code> or <code>name</code> &nbsp;·&nbsp;
                    <code>barcode</code> or <code>sku</code> &nbsp;·&nbsp;
                    <code>category_name</code> or <code>category</code><br/>
                    <code>cost_price</code> or <code>cost</code> &nbsp;·&nbsp;
                    <code>selling_price</code> or <code>price</code> &nbsp;·&nbsp;
                    <code>quantity</code> or <code>stock</code><br/>
                    <code>minimum_stock</code> &nbsp;·&nbsp; <code>description</code>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <label className={`btn btn-success btn-sm ${importing ? 'disabled' : ''}`}>
                    {importing
                      ? <><span className="spinner-border spinner-border-sm me-1" />Importing...</>
                      : <><i className="bi bi-file-earmark-arrow-up me-1" />Choose CSV File</>
                    }
                    <input ref={fileRef} type="file" accept=".csv,.txt" className="d-none" onChange={handleImport} disabled={importing} />
                  </label>
                  <button className="btn btn-outline-secondary btn-sm" onClick={downloadTemplate}>
                    <i className="bi bi-file-earmark-text me-1" />Download Template
                  </button>
                </div>
              </div>

              {/* Import result */}
              <div className="col-md-6">
                {importResult && (
                  <div className={`alert ${importResult.success ? 'alert-success' : 'alert-danger'} mb-0`}>
                    {importResult.error ? (
                      <><i className="bi bi-x-circle me-2" />{importResult.error}</>
                    ) : (
                      <>
                        <div className="fw-bold mb-2"><i className="bi bi-check-circle me-2" />Import Complete!</div>
                        <div className="row g-2 text-center mb-2">
                          <div className="col-4">
                            <div style={{ background: 'rgba(25,135,84,0.15)', borderRadius: 6, padding: '0.5rem' }}>
                              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#198754' }}>{importResult.inserted}</div>
                              <div style={{ fontSize: '0.75rem' }}>Added</div>
                            </div>
                          </div>
                          <div className="col-4">
                            <div style={{ background: 'rgba(13,110,253,0.1)', borderRadius: 6, padding: '0.5rem' }}>
                              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0d6efd' }}>{importResult.updated}</div>
                              <div style={{ fontSize: '0.75rem' }}>Updated</div>
                            </div>
                          </div>
                          <div className="col-4">
                            <div style={{ background: 'rgba(108,117,125,0.1)', borderRadius: 6, padding: '0.5rem' }}>
                              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6c757d' }}>{importResult.skipped}</div>
                              <div style={{ fontSize: '0.75rem' }}>Skipped</div>
                            </div>
                          </div>
                        </div>
                        {importResult.errors?.length > 0 && (
                          <details>
                            <summary className="small" style={{ cursor: 'pointer' }}>{importResult.errors.length} warning(s)</summary>
                            <ul className="small mt-1 mb-0">
                              {importResult.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                            </ul>
                          </details>
                        )}
                      </>
                    )}
                  </div>
                )}
                {!importResult && !importing && (
                  <div className="text-muted small">
                    <div className="fw-600 mb-2">💡 How to export from phpMyAdmin:</div>
                    <ol className="ps-3 mb-0" style={{ lineHeight: 2 }}>
                      <li>Open phpMyAdmin → select your products table</li>
                      <li>Click <strong>Export</strong> tab</li>
                      <li>Format: <strong>CSV</strong></li>
                      <li>Check <strong>"Put columns names in first row"</strong></li>
                      <li>Click Go → upload the downloaded file here</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Products Table */}
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr><th>Product</th><th>Barcode</th><th>Category</th><th>Cost</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
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
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => { setEditProduct({...p}); setShowModal(true); }}>
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
            <small className="text-muted">Showing {(page-1)*20+1}–{Math.min(page*20, total)} of {total}</small>
            <div className="d-flex gap-1">
              <button className="btn btn-sm btn-outline-secondary" disabled={page===1} onClick={() => setPage(p=>p-1)}>‹ Prev</button>
              <button className="btn btn-sm btn-outline-secondary" disabled={page*20>=total} onClick={() => setPage(p=>p+1)}>Next ›</button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
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
                    <label className="form-label">Barcode / SKU</label>
                    <input className="form-control" value={editProduct.barcode || ''} onChange={e => setEditProduct(p => ({ ...p!, barcode: e.target.value }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={editProduct.category_id || ''} onChange={e => setEditProduct(p => ({ ...p!, category_id: parseInt(e.target.value) }))}>
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
                    <label className="form-label">Min Stock Alert</label>
                    <input type="number" className="form-control" min="0" value={editProduct.minimum_stock || 5} onChange={e => setEditProduct(p => ({ ...p!, minimum_stock: parseInt(e.target.value) }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={editProduct.is_active ?? 1} onChange={e => setEditProduct(p => ({ ...p!, is_active: parseInt(e.target.value) }))}>
                      <option value={1}>Active</option><option value={0}>Inactive</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows={2} value={(editProduct as any).description || ''} onChange={e => setEditProduct(p => ({ ...p!, description: e.target.value } as any))} />
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
