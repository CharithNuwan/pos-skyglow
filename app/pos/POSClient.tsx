'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

interface Product {
  product_id: number;
  product_name: string;
  barcode: string;
  selling_price: number;
  cost_price: number;
  quantity: number;
  category_id: number;
  category_name: string;
}

interface Category { category_id: number; category_name: string; }
interface CartItem extends Product { cartQty: number; }

export default function POSClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [barcodeSound, setBarcodeSound] = useState(true);
  const [currentShiftId, setCurrentShiftId] = useState<number|null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState(0);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lastSale, setLastSale] = useState<{ invoice_number: string; sale_id: number } | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [barcodeSound, setBarcodeSound] = useState(true);
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [prodRes, catRes, settingsRes] = await Promise.all([
      fetch('/api/products?inStock=true&perPage=100'),
      fetch('/api/categories'),
      fetch('/api/settings'),
    ]);
    const prodData = await prodRes.json();
    const catData = await catRes.json();
    const settingsData = await settingsRes.json();
    setProducts(prodData.products || []);
    setCategories(catData.categories || []);
    setSettings(settingsData || {});
    setBarcodeSound(settingsData?.barcode_sound !== '0');
  }

  const filtered = products.filter(p => {
    const matchSearch = !search || p.product_name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search);
    const matchCat = !catFilter || String(p.category_id) === catFilter;
    return matchSearch && matchCat;
  });

  function addToCart(product: Product) {
    if (product.quantity <= 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.product_id);
      if (existing) {
        if (existing.cartQty >= product.quantity) return prev;
        return prev.map(i => i.product_id === product.product_id ? { ...i, cartQty: i.cartQty + 1 } : i);
      }
      return [...prev, { ...product, cartQty: 1 }];
    });
  }

  function updateQty(productId: number, qty: number) {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.product_id !== productId));
    } else {
      setCart(prev => prev.map(i => i.product_id === productId ? { ...i, cartQty: Math.min(qty, i.quantity) } : i));
    }
  }

  function processBarcode() {
    if (!barcodeInput) return;
    const product = products.find(p => p.barcode === barcodeInput);
    if (product) {
      addToCart(product);
      // Beep on successful scan
      if (barcodeSound) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine'; o.frequency.value = 1800; g.gain.value = 0.2;
          o.start(); o.stop(ctx.currentTime + 0.07);
        } catch {}
      }
    } else {
      // Error beep - different tone for not found
      if (barcodeSound) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'square'; o.frequency.value = 400; g.gain.value = 0.15;
          o.start(); o.stop(ctx.currentTime + 0.15);
        } catch {}
      }
    }
    setBarcodeInput('');
  }

  const taxRate = parseFloat(settings.tax_rate || '0') / 100;
  const currencySymbol = settings.currency_symbol || '$';
  // Customer search
  const searchCustomer = async (q: string) => {
    setCustomerSearch(q);
    if (q.length < 2) { setCustomerResults([]); return; }
    const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}&page=1`);
    const data = await res.json();
    setCustomerResults(data.customers?.slice(0, 5) || []);
  };

  // Barcode beep
  function playBeep() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 1200; osc.type = 'square';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1);
    } catch {}
  }

  const subtotal = cart.reduce((sum, i) => sum + i.selling_price * i.cartQty, 0);
  const discountAmt = discountType === 'percentage' ? subtotal * (discountValue / 100) : Math.min(discountValue, subtotal);
  const taxableAmount = subtotal - discountAmt;
  const taxAmt = taxableAmount * taxRate;
  const total = taxableAmount + taxAmt;
  const change = paymentMethod === 'cash' ? Math.max(0, cashReceived - total) : 0;

  async function processSale() {
    if (cart.length === 0) return;
    if (paymentMethod === 'cash' && cashReceived < total) {
      alert('Insufficient cash received');
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({
            product_id: i.product_id,
            quantity: i.cartQty,
            unit_price: i.selling_price,
            cost_price: i.cost_price,
            total_price: i.selling_price * i.cartQty,
          })),
          customer_name: customerName,
          customer_phone: customerPhone,
          subtotal, tax_amount: taxAmt, discount_amount: discountAmt,
          discount_type: discountType, discount_value: discountValue,
          total_amount: total, payment_method: paymentMethod,
          customer_id: selectedCustomer?.customer_id || null,
          shift_id: currentShiftId || null,
          cash_received: cashReceived, change_amount: change, notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLastSale({ invoice_number: data.invoice_number, sale_id: data.sale_id });
        clearCart();
        loadData();
      } else {
        alert(data.error || 'Sale failed');
      }
    } finally {
      setProcessing(false);
    }
  }

  function clearCart() {
    setCart([]);
    setDiscountValue(0);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCustomerName('');
    setCustomerPhone('');
    setCashReceived(0);
    setNotes('');
  }

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      {/* Top bar */}
      <div className="topbar" style={{ justifyContent: 'space-between' }}>
        <div className="d-flex align-items-center gap-3">
          <Link href="/dashboard" className="btn btn-sm btn-outline-secondary">
            <i className="bi bi-arrow-left" />
          </Link>
          <h5 className="mb-0 fw-bold">Point of Sale</h5>
        </div>
        {lastSale && (
          <div className="alert alert-success py-1 px-3 mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-check-circle-fill" />
            Sale {lastSale.invoice_number} completed!
            <a href={`/receipt/${lastSale.sale_id}`} target="_blank" className="btn btn-sm btn-success ms-2">
              <i className="bi bi-printer" /> Receipt
            </a>
          </div>
        )}
      </div>

      <div className="pos-layout" style={{ flex: 1, padding: '1rem', overflow: 'hidden' }}>
        {/* Products Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card-header">
            <div className="row g-2">
              <div className="col-md-4">
                <input
                  className="form-control"
                  placeholder="🔍 Search products..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <select className="form-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                </select>
              </div>
              <div className="col-md-5">
                <div className="input-group">
                  <span className="input-group-text bg-primary text-white"><i className="bi bi-upc-scan" /></span>
                  <input
                    ref={barcodeRef}
                    className="form-control"
                    placeholder="Scan barcode..."
                    value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && processBarcode()}
                  />
                  <button className="btn btn-primary" onClick={processBarcode}>Add</button>
                </div>
              </div>
            </div>
          </div>
          <div className="card-body p-2" style={{ overflow: 'auto' }}>
            <div className="product-grid">
              {filtered.map(p => (
                <div
                  key={p.product_id}
                  className={`product-card ${p.quantity === 0 ? 'out-of-stock' : ''}`}
                  onClick={() => addToCart(p)}
                >
                  {(p as any).image_url && settings.show_product_images !== '0'
                    ? <img src={(p as any).image_url} alt={p.product_name} style={{ width: '100%', height: '4.5rem', objectFit: 'cover', borderRadius: 6, marginBottom: '0.4rem' }} />
                    : <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>📦</div>
                  }
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.product_name}>
                    {p.product_name}
                  </div>
                  <div className="price">{currencySymbol}{p.selling_price.toFixed(2)}</div>
                  <div className={`stock ${p.quantity <= 5 ? 'text-danger' : ''}`}>
                    {p.quantity === 0 ? 'Out of stock' : `${p.quantity} in stock`}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
                  <i className="bi bi-search fs-2 d-block mb-2" />
                  No products found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cart Panel */}
        <div className="cart-panel">
          <div className="cart-header">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold"><i className="bi bi-cart3 me-2" />Cart ({cart.length} items)</h6>
              {cart.length > 0 && (
                <button className="btn btn-sm btn-outline-danger" onClick={clearCart}>
                  <i className="bi bi-trash" /> Clear
                </button>
              )}
            </div>
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="text-center text-muted py-4">
                <i className="bi bi-cart-x fs-2 d-block mb-2" />
                Cart is empty
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product_id} className="cart-item">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>{currencySymbol}{item.selling_price.toFixed(2)} each</div>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <button className="btn btn-sm btn-outline-secondary" style={{ width: 28, padding: 0 }} onClick={() => updateQty(item.product_id, item.cartQty - 1)}>-</button>
                    <span style={{ width: 30, textAlign: 'center', fontWeight: 600 }}>{item.cartQty}</span>
                    <button className="btn btn-sm btn-outline-secondary" style={{ width: 28, padding: 0 }} onClick={() => updateQty(item.product_id, item.cartQty + 1)}>+</button>
                  </div>
                  <div style={{ minWidth: 60, textAlign: 'right', fontWeight: 700, color: '#0d6efd' }}>
                    {currencySymbol}{(item.selling_price * item.cartQty).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="cart-footer">
            {/* Customer */}
            <div className="mb-2 position-relative">
              {selectedCustomer ? (
                <div className="d-flex align-items-center gap-2 px-2 py-1 rounded" style={{ background: '#e8f5e9', border: '1px solid #a5d6a7' }}>
                  <i className="bi bi-person-check text-success" />
                  <div className="flex-fill" style={{ minWidth: 0 }}>
                    <div className="fw-600 small text-truncate">{selectedCustomer.full_name}</div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                      {selectedCustomer.phone && <span className="me-2">{selectedCustomer.phone}</span>}
                      <span>⭐ {selectedCustomer.loyalty_points} pts</span>
                    </div>
                  </div>
                  <button className="btn btn-sm btn-link text-danger p-0" title="Remove customer" onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); setCustomerResults([]); }}>
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text"><i className="bi bi-person" /></span>
                    <input
                      className="form-control"
                      placeholder="Search customer by name or phone..."
                      value={customerSearch}
                      onChange={e => searchCustomer(e.target.value)}
                    />
                    {customerSearch && <button className="btn btn-outline-secondary" onClick={() => { setCustomerSearch(''); setCustomerResults([]); }}><i className="bi bi-x" /></button>}
                  </div>
                  {customerResults.length > 0 && (
                    <div className="position-absolute w-100 bg-white border rounded shadow" style={{ zIndex: 200, top: '100%', left: 0 }}>
                      {customerResults.map((c: any) => (
                        <div key={c.customer_id} className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center"
                          style={{ cursor: 'pointer' }}
                          onMouseDown={() => { setSelectedCustomer(c); setCustomerSearch(''); setCustomerResults([]); }}>
                          <div>
                            <div className="fw-500 small">{c.full_name}</div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>{c.phone}</div>
                          </div>
                          <span className="badge bg-warning text-dark">⭐ {c.loyalty_points}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Discount */}
            <div className="input-group input-group-sm mb-2">
              <span className="input-group-text">Discount</span>
              <input type="number" className="form-control" min="0" step="0.01" value={discountValue || ''} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)} />
              <select className="form-select" style={{ maxWidth: 70 }} value={discountType} onChange={e => setDiscountType(e.target.value as 'fixed' | 'percentage')}>
                <option value="fixed">{currencySymbol}</option>
                <option value="percentage">%</option>
              </select>
            </div>

            {/* Totals */}
            <div className="totals-row"><span>Subtotal</span><span>{currencySymbol}{subtotal.toFixed(2)}</span></div>
            {discountAmt > 0 && <div className="totals-row text-success"><span>Discount</span><span>-{currencySymbol}{discountAmt.toFixed(2)}</span></div>}
            {taxRate > 0 && <div className="totals-row"><span>Tax ({settings.tax_rate}%)</span><span>{currencySymbol}{taxAmt.toFixed(2)}</span></div>}
            <div className="totals-row total"><span>TOTAL</span><span>{currencySymbol}{total.toFixed(2)}</span></div>

            {/* Payment method */}
            <div className="mb-2 mt-2">
              <div className="btn-group w-100">
                {['cash','card','online'].map(m => (
                  <button key={m} className={`btn btn-sm ${paymentMethod === m ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPaymentMethod(m)}>
                    {m === 'cash' ? '💵' : m === 'card' ? '💳' : '📱'} {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'cash' && (
              <div className="input-group input-group-sm mb-2">
                <span className="input-group-text">Cash Received</span>
                <input type="number" className="form-control" min={total} step="0.01" value={cashReceived || ''} onChange={e => setCashReceived(parseFloat(e.target.value) || 0)} />
              </div>
            )}
            {paymentMethod === 'cash' && cashReceived > 0 && (
              <div className="totals-row text-success fw-600 mb-2"><span>Change</span><span>{currencySymbol}{change.toFixed(2)}</span></div>
            )}

            <button
              className="btn btn-success w-100"
              onClick={processSale}
              disabled={cart.length === 0 || processing}
            >
              {processing ? (
                <><span className="spinner-border spinner-border-sm me-2" />Processing...</>
              ) : (
                <><i className="bi bi-check-circle me-2" />Complete Sale {currencySymbol}{total.toFixed(2)}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
