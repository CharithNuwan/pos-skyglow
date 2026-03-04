'use client';
import { useState, useEffect } from 'react';

export default function SettingsClient() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setSettings);
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

      <button className="btn btn-primary px-4" onClick={save} disabled={saving}>
        {saving
          ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</>
          : <><i className="bi bi-save me-2" />Save All Settings</>
        }
      </button>
    </div>
  );
}
