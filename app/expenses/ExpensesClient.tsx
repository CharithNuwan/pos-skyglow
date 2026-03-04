'use client';
import { useState, useEffect } from 'react';

const CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Salary', 'Transport', 'Marketing', 'Maintenance', 'Other'];

export default function ExpensesClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [curr, setCurr] = useState('Rs');
  const [dateFrom, setDateFrom] = useState(() => new Date(Date.now() - 30*86400000).toISOString().slice(0,10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0,10));
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: 'Supplies', description: '', amount: '', payment_method: 'cash', reference: '', expense_date: new Date().toISOString().slice(0,16) });

  useEffect(() => {
    fetch('/api/settings').then(r=>r.json()).then(s=>setCurr(s.currency_symbol||'Rs'));
  }, []);
  useEffect(() => { load(); }, [dateFrom, dateTo]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/expenses?date_from=${dateFrom}&date_to=${dateTo}`);
    setData(await res.json());
    setLoading(false);
  }

  async function save() {
    if (!form.description || !form.amount) return;
    setSaving(true);
    const res = await fetch('/api/expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    const d = await res.json();
    if (d.success) { setShowForm(false); setForm({ category: 'Supplies', description: '', amount: '', payment_method: 'cash', reference: '', expense_date: new Date().toISOString().slice(0,16) }); load(); }
    setSaving(false);
  }

  async function del(id: number) {
    if (!confirm('Delete this expense?')) return;
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    load();
  }

  const summary = data?.summary || {};
  const byCategory = data?.byCategory || [];
  const expenses = data?.expenses || [];

  return (
    <div>
      {/* Summary cards */}
      <div className="row g-3 mb-3">
        <div className="col-sm-4">
          <div className="card p-3 text-center">
            <div className="text-muted small">Total Expenses</div>
            <div className="fw-bold fs-4 text-danger">{curr} {Number(summary.total||0).toFixed(2)}</div>
          </div>
        </div>
        <div className="col-sm-4">
          <div className="card p-3 text-center">
            <div className="text-muted small">Transactions</div>
            <div className="fw-bold fs-4">{summary.count || 0}</div>
          </div>
        </div>
        <div className="col-sm-4">
          <div className="card p-3 text-center">
            <div className="text-muted small">Avg per Day</div>
            <div className="fw-bold fs-4">
              {curr} {(Number(summary.total||0) / Math.max(1, Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000 + 1))).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {/* Left - category breakdown */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header fw-bold">By Category</div>
            <div className="card-body p-0">
              {byCategory.length === 0 ? <div className="text-center text-muted py-3">No data</div> : byCategory.map((c: any) => (
                <div key={c.category} className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                  <div>
                    <div className="fw-500 small text-capitalize">{c.category}</div>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>{c.count} entries</div>
                  </div>
                  <div className="fw-bold text-danger small">{curr} {Number(c.total).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right - expenses list */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="d-flex gap-2 align-items-center flex-wrap">
                <input type="date" className="form-control form-control-sm" style={{ width: 140 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                <span className="text-muted small">to</span>
                <input type="date" className="form-control form-control-sm" style={{ width: 140 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowForm(s=>!s)}>
                <i className="bi bi-plus-lg me-1" />Add Expense
              </button>
            </div>

            {/* Add form */}
            {showForm && (
              <div className="card-body border-bottom" style={{ background: '#fffbf0' }}>
                <div className="row g-2">
                  <div className="col-md-4">
                    <label className="form-label small">Category</label>
                    <select className="form-select form-select-sm" value={form.category} onChange={e => setForm(f=>({...f, category: e.target.value}))}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="col-md-8">
                    <label className="form-label small">Description *</label>
                    <input className="form-control form-control-sm" placeholder="What was this expense for?" value={form.description} onChange={e => setForm(f=>({...f, description: e.target.value}))} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small">Amount *</label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text">{curr}</span>
                      <input type="number" className="form-control" min="0" step="0.01" value={form.amount} onChange={e => setForm(f=>({...f, amount: e.target.value}))} />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small">Payment</label>
                    <select className="form-select form-select-sm" value={form.payment_method} onChange={e => setForm(f=>({...f, payment_method: e.target.value}))}>
                      <option value="cash">Cash</option>
                      <option value="online">Online</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small">Reference</label>
                    <input className="form-control form-control-sm" placeholder="Receipt #, etc." value={form.reference} onChange={e => setForm(f=>({...f, reference: e.target.value}))} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small">Date & Time</label>
                    <input type="datetime-local" className="form-control form-control-sm" value={form.expense_date} onChange={e => setForm(f=>({...f, expense_date: e.target.value}))} />
                  </div>
                  <div className="col-12 d-flex gap-2 justify-content-end">
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
                    <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || !form.description || !form.amount}>
                      {saving ? <span className="spinner-border spinner-border-sm" /> : 'Save Expense'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="card-body p-0">
              {loading ? <div className="text-center py-4"><span className="spinner-border spinner-border-sm" /></div>
              : expenses.length === 0 ? <div className="text-center text-muted py-4">No expenses in this period</div>
              : (
                <table className="table table-hover mb-0">
                  <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Method</th><th>Amount</th><th></th></tr></thead>
                  <tbody>
                    {expenses.map((e: any) => (
                      <tr key={e.expense_id}>
                        <td className="small text-muted">{new Date(e.expense_date).toLocaleDateString()}</td>
                        <td><span className="badge bg-light text-dark text-capitalize">{e.category}</span></td>
                        <td className="small">
                          <div className="fw-500">{e.description}</div>
                          {e.reference && <div className="text-muted" style={{fontSize:'0.7rem'}}>Ref: {e.reference}</div>}
                          <div className="text-muted" style={{fontSize:'0.7rem'}}>by {e.full_name}</div>
                        </td>
                        <td className="small text-capitalize">{e.payment_method}</td>
                        <td className="fw-bold text-danger small">{curr} {Number(e.amount).toFixed(2)}</td>
                        <td><button className="btn btn-sm btn-outline-danger" onClick={() => del(e.expense_id)}><i className="bi bi-trash" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
