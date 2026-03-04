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
  const [suppliers, setSuppliers] = useState<{supplier_id:number;supplier_name:string}[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success'|'danger'>('success');

  // Restock state
  const [showRestock, setShowRestock] = useState(false);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState(1);
  const [restockNote, setRestockNote] = useState('');
  const [restocking, setRestocking] = useState(false);

  // Import state
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadProducts(); }, [search, catFilter, page]);
  useEffect(() => { loadCategories(); loadSuppliers(); }, []);

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

  async function loadSuppliers() {
    const res = await fetch('/api/suppliers');
    const data = await res.json();
    setSuppliers(data.suppliers || []);
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

  async function uploadImage(productId: number, file: File) {
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const res = await fetch('/api/products/image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, image_data: base64 }),
      });
      const data = await res.json();
      if (!data.success) showMsg(data.error || 'Image upload failed', 'danger');
      else { showMsg('Image uploaded!'); loadProducts(); }
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  }

  async function removeImage(productId: number) {
    await fetch('/api/products/image', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: productId }) });
    showMsg('Image removed'); loadProducts();
    if (editProduct) setEditProduct(p => ({ ...p!, image_url: undefined } as any));
  }

  async function uploadImage(file: File, productId: number) {
    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        // Resize to max 400px before storing
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const max = 400;
          const ratio = Math.min(max/img.width, max/img.height, 1);
          canvas.width = img.width * ratio; canvas.height = img.height * ratio;
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          await fetch('/api/products/image', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({product_id: productId, image_base64: compressed}) });
          setUploadingImage(false); loadProducts();
        };
        img.src = base64;
      };
      reader.readAsDataURL(file);
    } catch { setUploadingImage(false); }
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

  // Restock product
  async function doRestock() {
    if (!restockProduct || restockQty <= 0) return;
    setRestocking(true);
    try {
      const res = await fetch('/api/products/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: restockProduct.product_id, quantity: restockQty, note: restockNote }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg(`✓ Restocked "${data.product_name}" — ${data.quantity_before} → ${data.quantity_after} units`);
        setShowRestock(false);
        setRestockQty(1);
        setRestockNote('');
        loadProducts();
      } else {
        showMsg(data.error || 'Restock failed', 'danger');
      }
    } finally {
      setRestocking(false);
    }
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
                    <td className="fw-500">
                      <div className="d-flex align-items-center gap-2">
                        {(p as any).image_url
                          ? <img src={(p as any).image_url} alt="" style={{width:32,height:32,objectFit:'cover',borderRadius:4,flexShrink:0}}/>
                          : <div style={{width:32,height:32,background:'#f0f0f0',borderRadius:4,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.6rem',color:'#aaa'}}>IMG</div>
                        }
                        {p.product_name}
                      </div>
                    </td>
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
                      <button className="btn btn-sm btn-outline-success me-1" title="Restock" onClick={() => { setRestockProduct(p); setRestockQty(1); setRestockNote(''); setShowRestock(true); }}>
                        <i className="bi bi-plus-square" />
                      </button>
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
                  <div className="col-md-6">
                    <label className="form-label">Product Name *</label>
                    <input className="form-control" value={editProduct.product_name || ''} onChange={e => setEditProduct(p => ({ ...p!, product_name: e.target.value }))} placeholder="Full product name" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">
                      Short Name
                      <span className="ms-1 text-muted small">(shown on receipt)</span>
                    </label>
                    <input
                      className="form-control"
                      value={(editProduct as any).short_name || ''}
                      onChange={e => setEditProduct(p => ({ ...p!, short_name: e.target.value } as any))}
                      placeholder="e.g. Wireless Mouse"
                      maxLength={30}
                    />
                    <div className="form-text">Max 30 chars. Leave blank to use full name.</div>
                  </div>
                  <div className="col-md-8">
                    <label className="form-label">Barcode / SKU</label>
                    <div className="input-group">
                      <input
                        className="form-control"
                        value={editProduct.barcode || ''}
                        onChange={e => setEditProduct(p => ({ ...p!, barcode: e.target.value }))}
                        placeholder="Scan or type barcode"
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        title="Generate random barcode"
                        onClick={() => {
                          const ts = Date.now().toString().slice(-8);
                          const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                          setEditProduct(p => ({ ...p!, barcode: ts + rand }));
                        }}
                      >
                        <i className="bi bi-upc-scan me-1" />Generate
                      </button>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={editProduct.category_id || ''} onChange={e => setEditProduct(p => ({ ...p!, category_id: parseInt(e.target.value) }))}>
                      <option value="">None</option>
                      {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Supplier</label>
                    <select className="form-select" value={(editProduct as any).supplier_id || ''} onChange={e => setEditProduct(p => ({ ...p!, supplier_id: parseInt(e.target.value) } as any))}>
                      <option value="">None</option>
                      {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}
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
                    <label className="form-label">
                      Pack Size
                      <span className="ms-1 text-muted small">(items per pack)</span>
                    </label>
                    <div className="d-flex gap-1">
                      {[1,6,12,24].map(n => (
                        <button key={n} type="button"
                          className={`btn btn-sm flex-fill ${((editProduct as any).pack_size||1)===n?'btn-primary':'btn-outline-secondary'}`}
                          onClick={() => setEditProduct(p => ({...p!, pack_size: n} as any))}>
                          {n===1?'Single':`×${n}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={editProduct.is_active ?? 1} onChange={e => setEditProduct(p => ({ ...p!, is_active: parseInt(e.target.value) }))}>
                      <option value={1}>Active</option><option value={0}>Inactive</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Product Image <span className="text-muted small">(optional, shown on POS grid)</span></label>
                    <div className="d-flex gap-3 align-items-start">
                      {(editProduct as any).image_url ? (
                        <div className="position-relative">
                          <img src={(editProduct as any).image_url} alt="product" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #dee2e6' }} />
                          <button type="button" className="btn btn-danger btn-sm position-absolute top-0 end-0" style={{ padding: '1px 5px', fontSize: '0.7rem' }}
                            onClick={() => editProduct.product_id && removeImage(editProduct.product_id)}>✕</button>
                        </div>
                      ) : (
                        <div style={{ width: 80, height: 80, border: '2px dashed #dee2e6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '0.75rem', textAlign: 'center' }}>
                          No image
                        </div>
                      )}
                      <div>
                        {editProduct.product_id ? (
                          <>
                            <label className={`btn btn-outline-secondary btn-sm ${uploadingImage ? 'disabled' : ''}`}>
                              {uploadingImage ? <><span className="spinner-border spinner-border-sm me-1"/>Uploading...</> : <><i className="bi bi-image me-1"/>Upload Image</>}
                              <input type="file" className="d-none" accept="image/*"
                                onChange={e => { const f = e.target.files?.[0]; if (f && editProduct.product_id) uploadImage(editProduct.product_id, f); }} />
                            </label>
                            <div className="form-text">Max ~500KB · JPG, PNG, WebP</div>
                          </>
                        ) : (
                          <div className="text-muted small">Save product first, then add image</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows={2} value={(editProduct as any).description || ''} onChange={e => setEditProduct(p => ({ ...p!, description: e.target.value } as any))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Product Image <span className="text-muted small">(optional)</span></label>
                    <div className="d-flex align-items-center gap-3">
                      {(editProduct as any).image_url && (
                        <img src={(editProduct as any).image_url} style={{width:80,height:80,objectFit:'cover',borderRadius:8,border:'1px solid #dee2e6'}} alt=""/>
                      )}
                      <div>
                        <label className={`btn btn-outline-secondary btn-sm ${uploadingImage?'disabled':''}`}>
                          {uploadingImage ? <><span className="spinner-border spinner-border-sm me-1"/>Uploading...</> : <><i className="bi bi-image me-1"/>{(editProduct as any).image_url ? 'Change Image' : 'Upload Image'}</>}
                          <input type="file" className="d-none" accept="image/*" disabled={!editProduct.product_id || uploadingImage}
                            onChange={e => { const f = e.target.files?.[0]; if (f && editProduct.product_id) uploadImage(f, editProduct.product_id); }}/>
                        </label>
                        {!editProduct.product_id && <div className="form-text text-warning">Save product first, then upload image</div>}
                        {(editProduct as any).image_url && (
                          <button className="btn btn-outline-danger btn-sm ms-2" onClick={async()=>{ await fetch('/api/products/image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product_id:editProduct.product_id,image_base64:null})}); setEditProduct(p=>({...p!,image_url:null} as any)); loadProducts(); }}>
                            <i className="bi bi-trash me-1"/>Remove
                          </button>
                        )}
                      </div>
                    </div>
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

      {/* Restock Modal */}
      {showRestock && restockProduct && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="bi bi-plus-square me-2 text-success" />Restock Product</h5>
                <button className="btn-close" onClick={() => setShowRestock(false)} />
              </div>
              <div className="modal-body">
                {/* Product info */}
                <div className="alert alert-light border mb-3 py-2">
                  <div className="fw-bold">{restockProduct.product_name}</div>
                  <div className="text-muted small">
                    {restockProduct.barcode && <span className="me-3"><i className="bi bi-upc me-1" />{restockProduct.barcode}</span>}
                    Current stock: <span className={restockProduct.quantity <= restockProduct.minimum_stock ? 'text-danger fw-bold' : 'fw-bold'}>{restockProduct.quantity} units</span>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-600">Quantity to Add *</label>
                  <div className="d-flex align-items-center gap-2">
                    <button className="btn btn-outline-secondary" onClick={() => setRestockQty(q => Math.max(1, q - 1))}>−</button>
                    <input
                      type="number"
                      className="form-control text-center fw-bold fs-5"
                      style={{ width: 100 }}
                      min={1}
                      value={restockQty}
                      onChange={e => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <button className="btn btn-outline-secondary" onClick={() => setRestockQty(q => q + 1)}>+</button>
                    <div className="ms-2 text-muted">
                      → New stock: <span className="fw-bold text-success">{restockProduct.quantity + restockQty}</span>
                    </div>
                  </div>
                  {/* Quick amount buttons */}
                  <div className="d-flex gap-2 mt-2">
                    {[5, 10, 20, 50, 100].map(n => (
                      <button key={n} type="button" className={`btn btn-sm ${restockQty === n ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => setRestockQty(n)}>+{n}</button>
                    ))}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Note <span className="text-muted small">(optional)</span></label>
                  <input
                    className="form-control"
                    placeholder="e.g. Supplier delivery, Purchase order #123"
                    value={restockNote}
                    onChange={e => setRestockNote(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowRestock(false)}>Cancel</button>
                <button className="btn btn-success px-4" onClick={doRestock} disabled={restocking || restockQty <= 0}>
                  {restocking
                    ? <><span className="spinner-border spinner-border-sm me-2" />Restocking...</>
                    : <><i className="bi bi-plus-square me-2" />Add {restockQty} Units</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
