'use client';
import { useState, useEffect } from 'react';
interface User { user_id: number; username: string; email: string; full_name: string; phone: string; role: string; is_active: number; last_login: string; }

export default function UsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<Partial<User> & { password?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(data.users || []); setLoading(false);
  }
  async function save() {
    if (!editUser?.username || !editUser?.email || !editUser?.full_name) return;
    if (!editUser.user_id && !editUser.password) { alert('Password required'); return; }
    setSaving(true);
    try {
      const method = editUser.user_id ? 'PUT' : 'POST';
      const url = editUser.user_id ? `/api/users/${editUser.user_id}` : '/api/users';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editUser) });
      const data = await res.json();
      if (data.success || data.user_id) { setMsg('Saved!'); setShowModal(false); load(); setTimeout(() => setMsg(''), 3000); }
      else { alert(data.error || 'Error'); }
    } finally { setSaving(false); }
  }
  const roleColors: Record<string, string> = { admin: 'bg-danger', manager: 'bg-warning text-dark', cashier: 'bg-info text-dark' };
  return (
    <div>
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span>{users.length} Users</span>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditUser({ role: 'cashier', is_active: 1 }); setShowModal(true); }}><i className="bi bi-person-plus me-1" />Add User</button>
        </div>
        <div className="card-body p-0">
          <table className="table table-hover mb-0">
            <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Last Login</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="text-center py-4"><span className="spinner-border spinner-border-sm" /></td></tr>
              : users.map(u => (
                <tr key={u.user_id}>
                  <td className="fw-500">{u.full_name}</td>
                  <td className="text-muted">@{u.username}</td>
                  <td>{u.email}</td>
                  <td><span className={`badge ${roleColors[u.role]||'bg-secondary'}`}>{u.role}</span></td>
                  <td className="text-muted small">{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
                  <td><span className={`badge ${u.is_active ? 'bg-success' : 'bg-secondary'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td><button className="btn btn-sm btn-outline-primary" onClick={() => { setEditUser({...u, password:''}); setShowModal(true); }}><i className="bi bi-pencil" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && editUser && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog"><div className="modal-content">
            <div className="modal-header"><h5 className="modal-title">{editUser.user_id ? 'Edit' : 'Add'} User</h5><button className="btn-close" onClick={() => setShowModal(false)} /></div>
            <div className="modal-body"><div className="row g-3">
              <div className="col-12"><label className="form-label">Full Name *</label><input className="form-control" value={editUser.full_name||''} onChange={e => setEditUser(u=>({...u!, full_name:e.target.value}))} /></div>
              <div className="col-md-6"><label className="form-label">Username *</label><input className="form-control" value={editUser.username||''} onChange={e => setEditUser(u=>({...u!, username:e.target.value}))} /></div>
              <div className="col-md-6"><label className="form-label">Email *</label><input type="email" className="form-control" value={editUser.email||''} onChange={e => setEditUser(u=>({...u!, email:e.target.value}))} /></div>
              <div className="col-md-6"><label className="form-label">Role</label><select className="form-select" value={editUser.role||'cashier'} onChange={e => setEditUser(u=>({...u!, role:e.target.value}))}><option value="cashier">Cashier</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>
              <div className="col-md-6"><label className="form-label">{editUser.user_id ? 'New Password (optional)' : 'Password *'}</label><input type="password" className="form-control" value={editUser.password||''} onChange={e => setEditUser(u=>({...u!, password:e.target.value}))} /></div>
              <div className="col-md-6"><label className="form-label">Status</label><select className="form-select" value={editUser.is_active??1} onChange={e => setEditUser(u=>({...u!, is_active:parseInt(e.target.value)}))}><option value={1}>Active</option><option value={0}>Inactive</option></select></div>
            </div></div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<span className="spinner-border spinner-border-sm"/>:'Save'}</button></div>
          </div></div>
        </div>
      )}
    </div>
  );
}
