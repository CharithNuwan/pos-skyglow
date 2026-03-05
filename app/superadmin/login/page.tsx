'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SuperAdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true); setError('');
    const res = await fetch('/api/superadmin/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const d = await res.json();
    if (d.success) router.push('/superadmin');
    else { setError(d.error || 'Invalid credentials'); setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
      <div style={{ width:'100%', maxWidth:420, padding:'0 1rem' }}>
        <div className="card shadow-lg border-0" style={{ borderRadius:'1rem', overflow:'hidden' }}>
          <div style={{ background:'linear-gradient(135deg,#667eea,#764ba2)', padding:'2rem', textAlign:'center' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>🔐</div>
            <h4 className="text-white fw-bold mb-0">Super Admin</h4>
            <p className="text-white-50 small mb-0">Platform Management Console</p>
          </div>
          <div className="card-body p-4">
            {error && <div className="alert alert-danger py-2 small">{error}</div>}
            <div className="mb-3">
              <label className="form-label fw-500">Username</label>
              <input className="form-control" value={username} onChange={e=>setUsername(e.target.value)}
                placeholder="superadmin" onKeyDown={e=>e.key==='Enter'&&login()} autoFocus/>
            </div>
            <div className="mb-4">
              <label className="form-label fw-500">Password</label>
              <input type="password" className="form-control" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="••••••••" onKeyDown={e=>e.key==='Enter'&&login()}/>
            </div>
            <button className="btn btn-primary w-100 btn-lg" onClick={login} disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm me-2"/> : <i className="bi bi-shield-lock me-2"/>}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <div className="text-center mt-3">
              <a href="/login" className="text-muted small">← Back to company login</a>
            </div>
          </div>
        </div>
        <p className="text-center text-white-50 small mt-3">Default: superadmin / superadmin123</p>
      </div>
    </div>
  );
}
