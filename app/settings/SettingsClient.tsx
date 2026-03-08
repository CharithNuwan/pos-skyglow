'use client';
import { useState, useEffect } from 'react';

export default function SettingsClient() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [testPrintMsg, setTestPrintMsg] = useState('');
  const [companyId, setCompanyId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings);
    fetch('/api/me').then(r => r.json()).then((d: { company_id?: number }) => setCompanyId(d.company_id ?? 1));
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (data.success) { setMsg('Settings saved!'); setTimeout(() => setMsg(''), 3000); }
    setSaving(false);
  }

  function update(key: string, val: string) {
    setSettings(s => ({ ...s, [key]: val }));
  }

  async function testPrint() {
    setTestPrintMsg('Sending…');
    try {
      const res = await fetch('/api/print-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          type: 'receipt',
          payload: {
            invoice_number: 'TEST-' + Date.now(),
            sale_id: 0,
            items: [{ name: 'Test item', qty: 1, unit_price: 9.99, total: 9.99 }],
            subtotal: 9.99,
            tax_amount: 0,
            discount_amount: 0,
            total_amount: 9.99,
            payment_method: 'cash',
            sale_date: new Date().toISOString(),
            shop_name: settings.shop_name || 'My Shop',
            shop_address: settings.shop_address || '',
            shop_phone: settings.shop_phone || '',
            currency_symbol: settings.currency_symbol || '$',
            receipt_header: settings.receipt_header || '',
            receipt_footer: settings.receipt_footer || '',
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestPrintMsg('Test print job sent. If Print Bridge is running, the receipt will print shortly.');
        setTimeout(() => setTestPrintMsg(''), 5000);
      } else {
        setTestPrintMsg(data.error || 'Failed');
      }
    } catch (e) {
      setTestPrintMsg('Error: ' + (e instanceof Error ? e.message : 'Request failed'));
    }
  }

  return (
    <div>
      {msg && <div className="alert alert-success"><i className="bi bi-check-circle me-2" />{msg}</div>}

      {/* Shop Info */}
      <div className="card mb-3">
        <div className="card-header">🏪 Shop Info</div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Shop Name</label>
              <input className="form-control" value={settings.shop_name || ''} onChange={e => update('shop_name', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Address</label>
              <input className="form-control" value={settings.shop_address || ''} onChange={e => update('shop_address', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Phone</label>
              <input className="form-control" value={settings.shop_phone || ''} onChange={e => update('shop_phone', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={settings.shop_email || ''} onChange={e => update('shop_email', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Currency & Tax */}
      <div className="card mb-3">
        <div className="card-header">💰 Currency & Tax</div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Currency Symbol</label>
              <input className="form-control" value={settings.currency_symbol || ''} onChange={e => update('currency_symbol', e.target.value)} placeholder="$ or Rs or €" />
            </div>
            <div className="col-md-4">
              <label className="form-label">Currency Code</label>
              <input className="form-control" value={settings.currency_code || ''} onChange={e => update('currency_code', e.target.value)} placeholder="USD, LKR, EUR" />
            </div>
            <div className="col-md-4">
              <label className="form-label">Tax Rate (%)</label>
              <div className="input-group">
                <input type="number" className="form-control" min="0" max="100" step="0.1" value={settings.tax_rate || '0'} onChange={e => update('tax_rate', e.target.value)} />
                <span className="input-group-text">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thermal Printer / Receipt */}
      <div className="card mb-3">
        <div className="card-header">🖨️ Thermal Printer & Receipt</div>
        <div className="card-body">
          <div className="row g-3">
            {/* Receipt Width - most important */}
            <div className="col-md-4">
              <label className="form-label fw-600">
                Paper Width (mm)
                <span className="ms-1 text-muted" style={{ fontSize: '0.75rem' }}>Match your printer</span>
              </label>
              <div className="d-flex gap-2 mb-2">
                {['58', '72', '80'].map(w => (
                  <button
                    key={w}
                    type="button"
                    className={`btn btn-sm flex-fill ${settings.receipt_width === w ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => update('receipt_width', w)}
                  >
                    {w}mm
                  </button>
                ))}
              </div>
              <div className="input-group input-group-sm">
                <input
                  type="number"
                  className="form-control"
                  min="40"
                  max="120"
                  value={settings.receipt_width || '80'}
                  onChange={e => update('receipt_width', e.target.value)}
                />
                <span className="input-group-text">mm</span>
              </div>
              <div className="mt-1" style={{ fontSize: '0.72rem', color: '#6c757d' }}>
                Common sizes: 58mm (small/mobile), 80mm (standard POS)
              </div>
            </div>

            {/* Font Size */}
            <div className="col-md-4">
              <label className="form-label fw-600">
                Font Size (px)
                <span className="ms-1 text-muted" style={{ fontSize: '0.75rem' }}>Receipt text size</span>
              </label>
              <div className="d-flex gap-2 mb-2">
                {['11', '13', '15'].map(s => (
                  <button
                    key={s}
                    type="button"
                    className={`btn btn-sm flex-fill ${settings.receipt_font_size === s ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => update('receipt_font_size', s)}
                  >
                    {s}px
                  </button>
                ))}
              </div>
              <div className="input-group input-group-sm">
                <input
                  type="number"
                  className="form-control"
                  min="8"
                  max="20"
                  value={settings.receipt_font_size || '13'}
                  onChange={e => update('receipt_font_size', e.target.value)}
                />
                <span className="input-group-text">px</span>
              </div>
            </div>

            {/* Live Preview */}
            <div className="col-md-4">
              <label className="form-label fw-600">Preview</label>
              <div
                style={{
                  width: `${Math.round((parseInt(settings.receipt_width || '80') / 80) * 200)}px`,
                  minWidth: 120,
                  maxWidth: 260,
                  border: '1px dashed #ccc',
                  borderRadius: 4,
                  padding: '0.5rem',
                  fontSize: `${settings.receipt_font_size || 13}px`,
                  background: '#fff',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ textAlign: 'center', fontWeight: 700 }}>{settings.shop_name || 'My Shop'}</div>
                <div style={{ textAlign: 'center', fontSize: '0.85em', color: '#666' }}>{settings.shop_phone || ''}</div>
                <hr style={{ margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Item x1</span><span>{settings.currency_symbol || '$'}9.99</span></div>
                <hr style={{ margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>TOTAL</span><span>{settings.currency_symbol || '$'}9.99</span></div>
              </div>
              <div className="mt-1 text-muted" style={{ fontSize: '0.72rem' }}>
                Width: {settings.receipt_width || '80'}mm
              </div>
            </div>

            {/* Receipt texts */}
            <div className="col-md-6">
              <label className="form-label">Receipt Header Text</label>
              <input className="form-control" value={settings.receipt_header || ''} onChange={e => update('receipt_header', e.target.value)} placeholder="Thank you for shopping with us!" />
            </div>
            <div className="col-md-6">
              <label className="form-label">Receipt Footer Text</label>
              <input className="form-control" value={settings.receipt_footer || ''} onChange={e => update('receipt_footer', e.target.value)} placeholder="Please come again!" />
            </div>

            {/* Test print — sends a test receipt job to Print Bridge */}
            <div className="col-12 mt-2">
              <hr />
              <label className="form-label fw-600">
                <i className="bi bi-printer me-1"/>Test print
              </label>
              <p className="text-muted small mb-2">
                Send a test receipt to the Print Bridge app. Make sure the app is running and polling. If the app has no token set, it uses the default &quot;test&quot; token and will receive this.
              </p>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={testPrint}
                >
                  <i className="bi bi-printer me-1"/>Send test receipt
                </button>
                {testPrintMsg && (
                  <span className="small text-muted">{testPrintMsg}</span>
                )}
              </div>
            </div>

            {/* Print Bridge — API token for Android app */}
            <div className="col-12 mt-2">
              <hr />
              {companyId != null && (
                <div className="mb-2">
                  <label className="form-label fw-600">Company ID</label>
                  <p className="text-muted small mb-1">Use this value in the Print Bridge app Settings → Company ID.</p>
                  <div className="d-flex align-items-center gap-2">
                    <code className="bg-light px-2 py-1 rounded" style={{ fontSize: '1rem' }}>{companyId}</code>
                  </div>
                </div>
              )}
              <label className="form-label fw-600">
                <i className="bi bi-phone me-1"/>Print Bridge — API Token
              </label>
              <p className="text-muted small mb-2">
                Use this token in the Android Print Bridge app to poll and print receipts. Keep it secret.
              </p>
              <div className="input-group">
                <input
                  type="password"
                  className="form-control font-monospace"
                  value={settings.print_api_token || ''}
                  onChange={e => update('print_api_token', e.target.value)}
                  placeholder="Generate or paste token"
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
                      .map(b => b.toString(16).padStart(2, '0')).join('');
                    update('print_api_token', token);
                  }}
                  title="Generate new token"
                >
                  <i className="bi bi-arrow-repeat"/> Generate
                </button>
              </div>
              <div className="form-text">Save settings after generating or changing the token.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory */}
      <div className="card mb-3">
        <div className="card-header">📦 Inventory</div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Low Stock Threshold</label>
              <input type="number" className="form-control" min="0" value={settings.low_stock_threshold || '5'} onChange={e => update('low_stock_threshold', e.target.value)} />
              <div className="form-text">Alert when stock falls below this number</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── POS Behaviour ─── */}
      <div className="card mb-3">
        <div className="card-header fw-bold"><i className="bi bi-toggles me-2"/>POS Behaviour</div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="d-flex justify-content-between align-items-center p-3 rounded border">
                <div>
                  <div className="fw-600">🔊 Barcode Scanner Sound</div>
                  <div className="text-muted small">Beep when a product is scanned successfully</div>
                </div>
                <div className="form-check form-switch mb-0">
                  <input className="form-check-input" type="checkbox" role="switch"
                    checked={settings.barcode_sound !== '0'}
                    onChange={e => update('barcode_sound', e.target.checked ? '1' : '0')}
                    style={{ width: 44, height: 24 }} />
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="d-flex justify-content-between align-items-center p-3 rounded border">
                <div>
                  <div className="fw-600">🖼️ Show Product Images on POS</div>
                  <div className="text-muted small">Display product images in POS grid</div>
                </div>
                <div className="form-check form-switch mb-0">
                  <input className="form-check-input" type="checkbox" role="switch"
                    checked={settings.show_product_images !== '0'}
                    onChange={e => update('show_product_images', e.target.checked ? '1' : '0')}
                    style={{ width: 44, height: 24 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Receipt Sharing ─── */}
      <div className="card mb-3">
        <div className="card-header fw-bold"><i className="bi bi-share me-2"/>Receipt Sharing</div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="d-flex justify-content-between align-items-center p-3 rounded border mb-3">
                <div>
                  <div className="fw-600" style={{color:'#25D366'}}><i className="bi bi-whatsapp me-1"/>WhatsApp Receipt</div>
                  <div className="text-muted small">Show WhatsApp button on receipt page</div>
                </div>
                <div className="form-check form-switch mb-0">
                  <input className="form-check-input" type="checkbox" role="switch"
                    checked={settings.whatsapp_enabled === '1'}
                    onChange={e => update('whatsapp_enabled', e.target.checked ? '1' : '0')}
                    style={{ width: 44, height: 24 }} />
                </div>
              </div>
              {settings.whatsapp_enabled === '1' && (
                <div>
                  <label className="form-label small fw-600">Default WhatsApp Number <span className="text-muted">(with country code, no +)</span></label>
                  <div className="input-group">
                    <span className="input-group-text" style={{color:'#25D366'}}><i className="bi bi-whatsapp"/></span>
                    <input className="form-control" placeholder="e.g. 94771234567" value={settings.whatsapp_number || ''}
                      onChange={e => update('whatsapp_number', e.target.value)} />
                  </div>
                  <div className="form-text">Used when customer has no phone on file</div>
                </div>
              )}
            </div>
            <div className="col-md-6">
              <div className="d-flex justify-content-between align-items-center p-3 rounded border">
                <div>
                  <div className="fw-600 text-primary"><i className="bi bi-envelope me-1"/>Email Receipt</div>
                  <div className="text-muted small">Show Email button on receipt (opens mail app)</div>
                </div>
                <div className="form-check form-switch mb-0">
                  <input className="form-check-input" type="checkbox" role="switch"
                    checked={settings.email_receipt_enabled === '1'}
                    onChange={e => update('email_receipt_enabled', e.target.checked ? '1' : '0')}
                    style={{ width: 44, height: 24 }} />
                </div>
              </div>
              <div className="form-text mt-2">Email button appears only when the customer has an email address saved in their profile.</div>
            </div>
          </div>
        </div>
      </div>

      <button className="btn btn-primary px-4" onClick={save} disabled={saving}>
        {saving
          ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</>
          : <><i className="bi bi-save me-2" />Save All Settings</>
        }
      </button>

      {/* Danger Zone */}
      <div className="card mt-4 border-danger">
        <div className="card-header fw-bold text-danger" style={{background:'#fff5f5'}}>
          <i className="bi bi-exclamation-triangle me-2"/>Danger Zone — Reset Data
        </div>
        <div className="card-body">
          <p className="text-muted small mb-3">Permanently delete data. <strong>Cannot be undone.</strong> Settings and user accounts are kept.</p>
          <div className="row g-3">
            <div className="col-md-4">
              <div className="border rounded p-3 h-100" style={{borderColor:'#ffc107'}}>
                <div className="fw-bold mb-1 text-warning">Clear Sales Only</div>
                <div className="text-muted small mb-3">Deletes all sales &amp; receipts. Keeps products, customers, stock levels.</div>
                <button className="btn btn-sm btn-outline-warning w-100" onClick={async()=>{
                  if(!confirm('Delete all sales history? This cannot be undone.')) return;
                  const d = await fetch('/api/admin/reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope:'sales_only'})}).then(r=>r.json());
                  alert(d.success ? '✅ ' + d.message : '❌ ' + d.error);
                }}><i className="bi bi-trash me-1"/>Clear Sales History</button>
              </div>
            </div>
            <div className="col-md-4">
              <div className="border rounded p-3 h-100" style={{borderColor:'#fd7e14'}}>
                <div className="fw-bold mb-1" style={{color:'#fd7e14'}}>Clear Products &amp; Sales</div>
                <div className="text-muted small mb-3">Deletes all products, categories, sales and stock logs.</div>
                <button className="btn btn-sm w-100" style={{color:'#fd7e14',borderColor:'#fd7e14',background:'none'}} onClick={async()=>{
                  if(!confirm('Delete all products and sales? This cannot be undone.')) return;
                  const d = await fetch('/api/admin/reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope:'products_only'})}).then(r=>r.json());
                  alert(d.success ? '✅ ' + d.message : '❌ ' + d.error);
                }}><i className="bi bi-trash me-1"/>Clear Products &amp; Sales</button>
              </div>
            </div>
            <div className="col-md-4">
              <div className="border border-danger rounded p-3 h-100">
                <div className="fw-bold mb-1 text-danger">Clear Everything</div>
                <div className="text-muted small mb-3">Deletes ALL data: products, categories, suppliers, customers, sales, shifts, expenses.</div>
                <button className="btn btn-sm btn-outline-danger w-100" onClick={async()=>{
                  if(!confirm('⚠️ Delete ALL data? This cannot be undone.')) return;
                  if(!confirm('Final warning: this deletes everything including customers and suppliers. Continue?')) return;
                  const d = await fetch('/api/admin/reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope:'all'})}).then(r=>r.json());
                  alert(d.success ? '✅ ' + d.message : '❌ ' + d.error);
                }}><i className="bi bi-trash me-1"/>Clear Everything</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
