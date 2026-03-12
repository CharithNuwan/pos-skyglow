'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import JsBarcode from 'jsbarcode';

interface Product {
  product_id: number;
  product_name: string;
  short_name: string;
  barcode: string;
  selling_price: number;
  pack_size: number;
  category_name: string;
}

// Real CODE128 barcode via JsBarcode
function BarcodeDisplay({ value, width = 160, height = 50 }: { value: string; width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!value || !canvasRef.current) return;
    try {
      JsBarcode(canvasRef.current, value, {
        format: 'CODE128',
        width: 1.5,
        height,
        displayValue: true,
        fontSize: 9,
        margin: 2,
      });
    } catch (_) {}
  }, [value, height]);
  if (!value) return <div style={{ width, height, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#999' }}>No barcode</div>;
  return (
    <div style={{ width, textAlign: 'center' }}>
      <canvas ref={canvasRef} style={{ maxWidth: '100%', height: `${height}px` }} />
    </div>
  );
}

function getBarcodeDataUrl(barcode: string, height: number = 40): string {
  if (!barcode || typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, barcode, { format: 'CODE128', width: 1.5, height, displayValue: false, margin: 0 });
    return canvas.toDataURL('image/png');
  } catch (_) {
    return '';
  }
}

function Label({ product, shopName, copies, size, showName, showShop }: {
  product: Product; shopName: string; copies: number; size: string; showName: boolean; showShop: boolean;
}) {
  const curr = 'Rs';
  const name = product.short_name || product.product_name;
  const dims = size === 'xsmall' ? { w: 102, h: 68 } : size === 'small' ? { w: 130, h: 75 } : size === 'medium' ? { w: 180, h: 95 } : { w: 230, h: 115 };
  const barcodeH = size === 'xsmall' ? 28 : size === 'small' ? 35 : size === 'medium' ? 45 : 55;
  const priceSize = size === 'xsmall' ? 12 : size === 'small' ? 15 : size === 'medium' ? 18 : 22;
  const padding = size === 'xsmall' ? '3px 4px' : '5px 6px';

  return (
    <>
      {Array.from({ length: copies }).map((_, i) => (
        <div key={i} className="label-item" style={{
          width: dims.w,
          height: dims.h,
          border: '1px dashed #aaa',
          borderRadius: 3,
          padding,
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          margin: 3,
          background: '#fff',
          pageBreakInside: 'avoid',
          fontFamily: 'Arial, sans-serif',
        }}>
          {/* Shop name - optional */}
          {showShop && shopName && (
            <div style={{ fontSize: 8, color: '#888', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {shopName}
            </div>
          )}

          {/* Product name - optional */}
          {showName && (
            <div style={{ fontSize: size === 'xsmall' ? 8 : size === 'large' ? 10 : 9, fontWeight: 600, textAlign: 'center', lineHeight: 1.2, color: '#222' }}>
              {name.length > (size === 'xsmall' ? 18 : 28) ? name.slice(0, (size === 'xsmall' ? 16 : 26)) + '…' : name}
            </div>
          )}

          {/* Barcode - always shown */}
          {product.barcode
            ? <BarcodeDisplay value={product.barcode} width={dims.w - 16} height={barcodeH} />
            : <div style={{ fontSize: 9, color: '#aaa', height: barcodeH, display: 'flex', alignItems: 'center' }}>No barcode</div>
          }

          {/* Price - always shown, prominent */}
          <div style={{
            fontSize: priceSize,
            fontWeight: 800,
            color: '#000',
            letterSpacing: 0.5,
            lineHeight: 1,
          }}>
            {curr} {Number(product.selling_price).toFixed(2)}
          </div>
        </div>
      ))}
    </>
  );
}

export default function LabelClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<Record<number,number>>({});
  const [batchSearch, setBatchSearch] = useState('');
  const [batchProduct, setBatchProduct] = useState<Product|null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [shopName, setShopName] = useState('');
  const [size, setSize] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showName, setShowName] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showKioskHelp, setShowKioskHelp] = useState(false);
  const [printViaServiceStatus, setPrintViaServiceStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => setShopName(s.shop_name || ''));
  }, []);

  useEffect(() => {
    if (search.length < 1) { setProducts([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/products?search=${encodeURIComponent(search)}&page=1`)
        .then(r => r.json())
        .then(d => { setProducts(d.products || []); setLoading(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function toggleProduct(p: Product) {
    setSelected(s => {
      const copy = { ...s };
      if (copy[p.product_id]) { delete copy[p.product_id]; }
      else { copy[p.product_id] = p.pack_size || 1; }
      return copy;
    });
  }

  function setCopies(id: number, val: number) {
    setSelected(s => ({ ...s, [id]: Math.max(1, val) }));
  }

  const selectedProducts = Object.keys(selected).map(id => products.find(p => p.product_id === parseInt(id))).filter(Boolean) as Product[];

  async function loadBatches(productId: number, product: Product) {
    setBatchProduct(product);
    const res = await fetch(`/api/batches?product_id=${productId}`);
    const d = await res.json();
    setBatches(d.batches || []);
  }

  // Build label items: products OR batches
  const batchLabelItems = Object.keys(selectedBatches).map(bid => {
    const b = batches.find((x:any) => x.batch_id === parseInt(bid));
    if (!b || !batchProduct) return null;
    return {
      product_name: batchProduct.product_name,
      short_name: batchProduct.short_name,
      barcode: b.barcode,
      selling_price: b.selling_price,
      batch_number: b.batch_number,
      expiry_date: b.expiry_date,
      qty: selectedBatches[parseInt(bid)] || 1,
    };
  }).filter(Boolean);
  const totalLabels = Object.values(selected).reduce((a, b) => a + b, 0);

  function doPrint() {
    setShowPreview(true);
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      alert('Allow popups for this site to print labels.');
      setTimeout(() => window.print(), 500);
      return;
    }
    const barcodeH = size === 'xsmall' ? 28 : size === 'small' ? 35 : size === 'medium' ? 45 : 55;
    const labelHtml = selectedProducts.flatMap(p =>
      Array.from({ length: selected[p.product_id] }, () => {
        const name = (p.short_name || p.product_name).slice(0, size === 'xsmall' ? 18 : 28);
        const dims = size === 'xsmall' ? { w: 102, h: 68 } : size === 'small' ? { w: 130, h: 75 } : size === 'medium' ? { w: 180, h: 95 } : { w: 230, h: 115 };
        const barcodeImg = p.barcode ? getBarcodeDataUrl(p.barcode, barcodeH) : '';
        return `
          <div class="label-item" style="width:${dims.w}px;height:${dims.h}px;border:1px solid #999;border-radius:3px;padding:${size === 'xsmall' ? '3px 4px' : '5px 6px'};display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;margin:3px;background:#fff;page-break-inside:avoid;font-family:Arial,sans-serif;">
            ${showShop && shopName ? `<div style="font-size:8px;color:#888;font-weight:600;">${escapeHtml(shopName.toUpperCase())}</div>` : ''}
            ${showName ? `<div style="font-size:${size === 'xsmall' ? 8 : size === 'large' ? 10 : 9}px;font-weight:600;text-align:center;">${escapeHtml(name)}</div>` : ''}
            ${barcodeImg ? `<img src="${barcodeImg}" alt="" style="max-width:${dims.w - 16}px;height:${barcodeH}px;object-fit:contain;" />` : `<div style="font-size:9px;">${escapeHtml(p.barcode || 'No barcode')}</div>`}
            <div style="font-size:${size === 'xsmall' ? 12 : size === 'small' ? 15 : size === 'medium' ? 18 : 22}px;font-weight:800;">Rs ${Number(p.selling_price).toFixed(2)}</div>
          </div>`;
      })
    ).join('');
    const doc = printWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html><html><head><title>Print Labels</title>
      <style>body{margin:0;padding:10px;background:#fff;}</style></head>
      <body>${labelHtml}</body></html>
    `);
    doc.close();
    printWindow.focus();
    // Wait for images and layout so print preview is not blank
    const tryPrint = () => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };
    if (printWindow.document.readyState === 'complete') {
      setTimeout(tryPrint, 400);
    } else {
      printWindow.onload = () => setTimeout(tryPrint, 300);
    }
  }

  function escapeHtml(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** Label payload shape for POST /api/print-jobs (type: 'label'). Used by Windows label-print service. */
  function buildLabelPayload(): { shopName: string; size: string; showName: boolean; showShop: boolean; labels: { product_name: string; short_name: string; barcode: string; selling_price: number; copies: number }[] } {
    return {
      shopName,
      size,
      showName,
      showShop,
      labels: selectedProducts.map(p => ({
        product_name: p.product_name,
        short_name: p.short_name || p.product_name,
        barcode: p.barcode || '',
        selling_price: p.selling_price,
        copies: selected[p.product_id] || 1,
      })),
    };
  }

  async function doPrintViaService() {
    if (selectedProducts.length === 0) return;
    setPrintViaServiceStatus('sending');
    try {
      const res = await fetch('/api/print-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'label', payload: buildLabelPayload() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || res.statusText);
      }
      setPrintViaServiceStatus('ok');
      setTimeout(() => setPrintViaServiceStatus('idle'), 3000);
    } catch (e) {
      setPrintViaServiceStatus('error');
      setTimeout(() => setPrintViaServiceStatus('idle'), 4000);
      alert((e instanceof Error ? e.message : 'Failed to send to label printer.') + ' Ensure the label print service is running on this PC.');
    }
  }

  // Portal: render whenever we have selected products so it's in DOM before print.
  // Hide off-screen on screen (not display:none so print dialog can show it).
  const printRootId = 'label-print-root';
  const printContent = selectedProducts.length > 0 && typeof document !== 'undefined' ? createPortal(
    <div
      id={printRootId}
      className="label-print-root"
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: '-99999px',
        top: 0,
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body > *:not(#${printRootId}) { display: none !important; }
          #${printRootId} {
            display: block !important;
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: auto !important;
            height: auto !important;
            overflow: auto !important;
            background: #fff !important;
            padding: 10px !important;
            pointer-events: auto !important;
          }
          #${printRootId} .label-item { border: 1px solid #999 !important; page-break-inside: avoid !important; }
        }
      `}} />
      {selectedProducts.map(p => (
        <Label key={p.product_id} product={p} shopName={shopName} copies={selected[p.product_id]} size={size} showName={showName} showShop={showShop} />
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div>
      {/* Batch mode toggle */}
      <div className="mb-3 d-flex gap-2 align-items-center">
        <button className={`btn btn-sm ${!batchMode?'btn-primary':'btn-outline-secondary'}`} onClick={()=>{setBatchMode(false);setSelectedBatches({});}}>
          <i className="bi bi-tag me-1"/>Product Labels
        </button>
        <button className={`btn btn-sm ${batchMode?'btn-success':'btn-outline-secondary'}`} onClick={()=>{setBatchMode(true);setSelected({});}}>
          <i className="bi bi-layers me-1"/>Batch Labels
        </button>
        {batchMode && <span className="text-muted small">Select a product, then choose which batches to print labels for</span>}
      </div>
      <div className="row g-3">
        {/* Left — search and select */}
        <div className="col-lg-5">
          <div className="card">
            <div className="card-header fw-bold">🔍 Select Products</div>
            <div className="card-body">
              <input
                className="form-control mb-3"
                placeholder={batchMode ? "Search product to load its batches..." : "Search products to add labels..."}
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
              {loading && <div className="text-center py-2"><span className="spinner-border spinner-border-sm" /></div>}
              {products.length > 0 && (
                <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                  {products.map(p => (
                    <div
                      key={p.product_id}
                      className={`d-flex align-items-center gap-2 p-2 rounded mb-1 cursor-pointer ${selected[p.product_id] ? 'bg-primary bg-opacity-10 border border-primary' : 'border'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleProduct(p)}
                    >
                      <input type="checkbox" className="form-check-input mt-0" checked={!!selected[p.product_id]} readOnly />
                      <div className="flex-grow-1">
                        <div className="fw-500 small">{p.short_name || p.product_name}</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                          {p.barcode && <span className="me-2">📦 {p.barcode}</span>}
                          <span className="fw-600 text-dark">Rs {Number(p.selling_price).toFixed(2)}</span>
                          {p.pack_size > 1 && <span className="ms-2 badge bg-warning text-dark">Pack of {p.pack_size}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {search && products.length === 0 && !loading && (
                <div className="text-center text-muted py-3">No products found</div>
              )}
            </div>
          </div>
        </div>

        {/* Right — selected + settings */}
        <div className="col-lg-7">
          <div className="card mb-3">
            <div className="card-header fw-bold">🏷️ Label Settings</div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Label Size</label>
                  <div className="d-flex flex-wrap gap-1">
                    {[['xsmall','30×20'],['small','Small'],['medium','Medium'],['large','Large']].map(([v,l]) => (
                      <button key={v} className={`btn btn-sm ${size===v?'btn-primary':'btn-outline-secondary'}`} style={{ minWidth: 56 }} onClick={() => setSize(v)}>{l}</button>
                    ))}
                  </div>
                  <div className="form-text">30×20mm (Xprinter) · Small=38×23mm · Medium=50×28mm · Large=63×33mm</div>
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Optional Info</label>
                  <div className="d-flex flex-column gap-1">
                    <div className="form-check form-switch mb-0">
                      <input className="form-check-input" type="checkbox" checked={showName} onChange={e => setShowName(e.target.checked)} id="chkName" />
                      <label className="form-check-label small" htmlFor="chkName">Show product name</label>
                    </div>
                    <div className="form-check form-switch mb-0">
                      <input className="form-check-input" type="checkbox" checked={showShop} onChange={e => setShowShop(e.target.checked)} id="chkShop" />
                      <label className="form-check-label small" htmlFor="chkShop">Show shop name</label>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-bold">Shop Name</label>
                  <input className="form-control form-control-sm" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Your shop name" disabled={!showShop} />
                </div>
              </div>
            </div>
          </div>

          {/* Selected products with copy count */}
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span className="fw-bold">Selected Products ({selectedProducts.length})</span>
              {selectedProducts.length > 0 && <span className="badge bg-primary">{totalLabels} labels total</span>}
            </div>
            <div className="card-body p-0">
              {selectedProducts.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-search fs-3 d-block mb-2" />
                  Search and select products on the left
                </div>
              ) : (
                <table className="table mb-0">
                  <thead><tr><th>Product</th><th>Price</th><th style={{width:130}}>Copies</th><th></th></tr></thead>
                  <tbody>
                    {selectedProducts.map(p => (
                      <tr key={p.product_id}>
                        <td>
                          <div className="fw-500 small">{p.short_name || p.product_name}</div>
                          {p.pack_size > 1 && <div style={{fontSize:'0.7rem'}} className="text-warning">Pack of {p.pack_size}</div>}
                        </td>
                        <td className="fw-600 small">Rs {Number(p.selling_price).toFixed(2)}</td>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            <button className="btn btn-sm btn-outline-secondary px-2" onClick={() => setCopies(p.product_id, selected[p.product_id] - 1)}>−</button>
                            <input type="number" className="form-control form-control-sm text-center" style={{width:55}} min={1} value={selected[p.product_id]} onChange={e => setCopies(p.product_id, parseInt(e.target.value)||1)} />
                            <button className="btn btn-sm btn-outline-secondary px-2" onClick={() => setCopies(p.product_id, selected[p.product_id] + 1)}>+</button>
                          </div>
                        </td>
                        <td><button className="btn btn-sm btn-outline-danger" onClick={() => toggleProduct(p)}><i className="bi bi-x" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {selectedProducts.length > 0 && (
              <div className="card-footer">
                <div className="d-flex gap-2 mb-2 flex-wrap align-items-center">
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowPreview(s => !s)}>
                    <i className="bi bi-eye me-1" />{showPreview ? 'Hide' : 'Preview'}
                  </button>
                  <button className="btn btn-primary" onClick={doPrint}>
                    <i className="bi bi-printer me-2" />Print {totalLabels} Labels
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={doPrintViaService}
                    disabled={printViaServiceStatus === 'sending'}
                  >
                    {printViaServiceStatus === 'sending' && <span className="spinner-border spinner-border-sm me-1" role="status" />}
                    {printViaServiceStatus === 'ok' && <i className="bi bi-check me-1" />}
                    {printViaServiceStatus === 'error' && <i className="bi bi-exclamation-triangle me-1" />}
                    Print via service
                  </button>
                  {printViaServiceStatus === 'ok' && <span className="small text-success">Sent to label printer</span>}
                  {printViaServiceStatus === 'error' && <span className="small text-danger">Send failed</span>}
                </div>
                <div className="small text-muted">
                  One-click (no dialog): Use Chrome with kiosk-printing and set the Xprinter as default, or use <strong>Print via service</strong> with the Windows label print service running on this PC.{' '}
                  <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={() => setShowKioskHelp(s => !s)}>
                    {showKioskHelp ? 'Hide' : 'How to enable'}
                  </button>
                </div>
                {showKioskHelp && (
                  <div className="small mt-2 p-2 bg-light rounded">
                    <div className="fw-600 mb-1">Print without the dialog:</div>
                    <ol className="mb-0 ps-3">
                      <li>Set <strong>Xprinter XP-T202UA</strong> as the default printer in Windows (Settings → Printers).</li>
                      <li>Run Chrome with <code>--kiosk-printing</code>: create a shortcut with Target <code>&quot;C:\...\chrome.exe&quot; --kiosk-printing</code>, or run from command line.</li>
                      <li>Open the POS in that Chrome window; the same Print button will send labels straight to the printer.</li>
                    </ol>
                    <Link href="/docs/label-printing" className="d-block mt-2">Full guide</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* On-screen preview (print uses portal to body so dialog shows labels) */}
      {showPreview && selectedProducts.length > 0 && (
        <div className="card mt-3">
          <div className="card-header fw-bold">Preview</div>
          <div className="card-body">
            {selectedProducts.map(p => (
              <Label key={p.product_id} product={p} shopName={shopName} copies={selected[p.product_id]} size={size} showName={showName} showShop={showShop} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
