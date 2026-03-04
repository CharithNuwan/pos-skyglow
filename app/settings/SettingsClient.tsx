'use client';
import { useState, useEffect } from 'react';

export default function SettingsClient() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { fetch('/api/settings').then(r=>r.json()).then(setSettings); }, []);

  async function save() {
    setSaving(true);
    const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    const data = await res.json();
    if (data.success) { setMsg('Settings saved!'); setTimeout(() => setMsg(''), 3000); }
    setSaving(false);
  }

  const fields = [
    { group: 'Shop Info', items: [
      { key: 'shop_name', label: 'Shop Name', type: 'text' },
      { key: 'shop_address', label: 'Address', type: 'text' },
      { key: 'shop_phone', label: 'Phone', type: 'text' },
      { key: 'shop_email', label: 'Email', type: 'email' },
    ]},
    { group: 'Currency & Tax', items: [
      { key: 'currency_symbol', label: 'Currency Symbol', type: 'text' },
      { key: 'currency_code', label: 'Currency Code', type: 'text' },
      { key: 'tax_rate', label: 'Tax Rate (%)', type: 'number' },
    ]},
    { group: 'Receipt', items: [
      { key: 'receipt_header', label: 'Receipt Header', type: 'text' },
      { key: 'receipt_footer', label: 'Receipt Footer', type: 'text' },
    ]},
  ];

  return (
    <div>
      {msg && <div className="alert alert-success">{msg}</div>}
      {fields.map(group => (
        <div key={group.group} className="card mb-3">
          <div className="card-header">{group.group}</div>
          <div className="card-body"><div className="row g-3">
            {group.items.map(f => (
              <div key={f.key} className="col-md-6">
                <label className="form-label">{f.label}</label>
                <input type={f.type} className="form-control" value={settings[f.key]||''} onChange={e => setSettings(s=>({...s, [f.key]:e.target.value}))} />
              </div>
            ))}
          </div></div>
        </div>
      ))}
      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? <><span className="spinner-border spinner-border-sm me-2"/>Saving...</> : <><i className="bi bi-save me-2"/>Save Settings</>}
      </button>
    </div>
  );
}
