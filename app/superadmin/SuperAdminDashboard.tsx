'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [view, setView] = useState<'list'|'detail'>('list');
  const [form, setForm] = useState({ company_name:'', slug:'', plan:'standard', max_users:10, max_products:500, admin_username:'', admin_email:'', admin_password:'', admin_name:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [detailData, setDetailData] = useState<any>(null);
  const [resetPw, setResetPw] = useState<{user_id:number,name:string}|null>(null);
  const [newPw, setNewPw] = useState('');

  useEffect(() => { loadCompanies(); }, []);

  async function loadCompanies() {
    setLoading(true);
    const res = await fetch('/api/superadmin/companies');
    const d = await res.json();
    if (d.companies) setCompanies(d.companies);
    setLoading(false);
  }

  async function loadDetail(id: number) {
    const res = await fetch(`/api/superadmin/companies/${id}`);
    const d = await res.json();
    setDetailData(d);
    setSelectedCompany(d.company);
    setView('detail');
  }

  async function createCompany() {
    setSaving(true);
    const res = await fetch('/api/superadmin/companies', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
    const d = await res.json();
    if (d.success) { setMsg('✅ Company created!'); setShowCreate(false); setForm({company_name:'',slug:'',plan:'standard',max_users:10,max_products:500,admin_username:'',admin_email:'',admin_password:'',admin_name:'',notes:''}); loadCompanies(); }
    else setMsg('❌ ' + d.error);
    setSaving(false);
  }

  async function toggleActive(id: number) {
    await fetch(`/api/superadmin/companies/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'toggle_active'}) });
    loadCompanies(); if (view==='detail') loadDetail(id);
  }

  async function resetPassword() {
    if (!resetPw || !newPw) return;
    const res = await fetch(`/api/superadmin/companies/${selectedCompany.company_id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({action:'reset_password', user_id: resetPw.user_id, new_password: newPw})
    });
    const d = await res.json();
    if (d.success) { alert(`✅ Password reset for ${resetPw.name}`); setResetPw(null); setNewPw(''); }
    else alert('❌ ' + d.error);
  }

  async function logout() {
    await fetch('/api/superadmin/auth', { method:'DELETE' });
    router.push('/superadmin/login');
  }

  const totalRevenue = companies.reduce((s,c)=>s+Number(c.total_revenue||0),0);
  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c=>c.is_active).length;
  const todaySales = companies.reduce((s,c)=>s+Number(c.today_sales||0),0);

  return (
    <div style={{minHeight:'100vh',background:'#f0f2f5'}}>
      {/* Top Bar */}
      <div style={{background:'linear-gradient(135deg,#667eea,#764ba2)',padding:'0 1.5rem',height:60,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div className="d-flex align-items-center gap-3">
          {view==='detail' && <button className="btn btn-sm btn-light btn-outline" onClick={()=>setView('list')} style={{background:'rgba(255,255,255,0.2)',border:'none',color:'#fff',borderRadius:6}}><i className="bi bi-arrow-left me-1"/>Back</button>}
          <span style={{color:'#fff',fontWeight:700,fontSize:'1.1rem'}}>🔐 Super Admin Console</span>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <span style={{color:'rgba(255,255,255,0.8)',fontSize:'0.85rem'}}>superadmin</span>
          <button className="btn btn-sm" style={{background:'rgba(255,255,255,0.2)',color:'#fff',border:'none'}} onClick={logout}>
            <i className="bi bi-box-arrow-right me-1"/>Logout
          </button>
        </div>
      </div>

      <div className="container-fluid py-4 px-4">
        {msg && <div className="alert alert-info alert-dismissible mb-3">{msg}<button className="btn-close" onClick={()=>setMsg('')}/></div>}

        {view === 'list' && (
          <>
            {/* Stats */}
            <div className="row g-3 mb-4">
              {[
                ['Total Companies', totalCompanies, 'bi-building', '#667eea'],
                ['Active', activeCompanies, 'bi-check-circle', '#198754'],
                ['Today\'s Sales', todaySales, 'bi-cart', '#0d6efd'],
                ['All-time Revenue', `Rs ${totalRevenue.toLocaleString('en',{minimumFractionDigits:2})}`, 'bi-currency-dollar', '#fd7e14'],
              ].map(([l,v,icon,color]:any)=>(
                <div key={l} className="col-6 col-lg-3">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body d-flex align-items-center gap-3">
                      <div style={{width:48,height:48,borderRadius:12,background:color+'20',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <i className={`bi ${icon}`} style={{color,fontSize:'1.4rem'}}/>
                      </div>
                      <div><div style={{fontSize:'1.4rem',fontWeight:700,lineHeight:1}}>{v}</div><div className="text-muted small">{l}</div></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Company list */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white d-flex justify-content-between align-items-center border-0 py-3">
                <h6 className="fw-bold mb-0">Companies</h6>
                <button className="btn btn-primary btn-sm" onClick={()=>setShowCreate(true)}>
                  <i className="bi bi-plus-lg me-1"/>New Company
                </button>
              </div>
              <div className="card-body p-0">
                {loading ? <div className="text-center py-5"><span className="spinner-border"/></div> : (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead><tr><th>Company</th><th>Plan</th><th>Users</th><th>Products</th><th>Sales</th><th>Revenue</th><th>Today</th><th>Status</th><th></th></tr></thead>
                      <tbody>
                        {companies.map((c:any)=>(
                          <tr key={c.company_id} style={{cursor:'pointer'}} onClick={()=>loadDetail(c.company_id)}>
                            <td>
                              <div className="fw-600">{c.company_name}</div>
                              <div className="text-muted small">/{c.slug}</div>
                            </td>
                            <td><span className="badge bg-primary bg-opacity-10 text-primary">{c.plan}</span></td>
                            <td className="small">{c.user_count} / {c.max_users}</td>
                            <td className="small">{c.product_count} / {c.max_products}</td>
                            <td className="small">{c.sale_count}</td>
                            <td className="small fw-500">Rs {Number(c.total_revenue).toFixed(2)}</td>
                            <td className="small">{c.today_sales} sales</td>
                            <td><span className={`badge ${c.is_active?'bg-success':'bg-secondary'}`}>{c.is_active?'Active':'Suspended'}</span></td>
                            <td onClick={e=>e.stopPropagation()}>
                              <button className={`btn btn-sm ${c.is_active?'btn-outline-warning':'btn-outline-success'}`}
                                onClick={()=>toggleActive(c.company_id)}>
                                {c.is_active?'Suspend':'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {view === 'detail' && detailData && selectedCompany && (
          <div className="row g-3">
            {/* Company info card */}
            <div className="col-lg-4">
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-body">
                  <h5 className="fw-bold">{selectedCompany.company_name}</h5>
                  <div className="text-muted small mb-3">/{selectedCompany.slug} · {selectedCompany.plan}</div>
                  <div className="row g-2 text-center mb-3">
                    {[['Users',`${detailData.users?.length||0}/${selectedCompany.max_users}`,'#0d6efd'],
                      ['Products',`${selectedCompany.product_count||0}/${selectedCompany.max_products}`,'#198754'],
                      ['Sales',selectedCompany.sale_count||0,'#fd7e14']].map(([l,v,c]:any)=>(
                      <div key={l} className="col-4"><div style={{background:'#f8f9fa',borderRadius:8,padding:'0.5rem'}}>
                        <div style={{fontWeight:700,color:c}}>{v}</div><div style={{fontSize:'0.7rem',color:'#6c757d'}}>{l}</div>
                      </div></div>
                    ))}
                  </div>
                  <button className={`btn w-100 ${selectedCompany.is_active?'btn-outline-warning':'btn-success'}`}
                    onClick={()=>toggleActive(selectedCompany.company_id)}>
                    <i className={`bi bi-${selectedCompany.is_active?'pause':'play'}-circle me-1`}/>
                    {selectedCompany.is_active?'Suspend Company':'Activate Company'}
                  </button>
                </div>
              </div>

              {/* Update limits */}
              <div className="card border-0 shadow-sm">
                <div className="card-header border-0 fw-bold">Update Limits</div>
                <div className="card-body">
                  {[['Plan','plan','text'],['Max Users','max_users','number'],['Max Products','max_products','number']].map(([l,k,t]:any)=>(
                    <div key={k} className="mb-2">
                      <label className="form-label small fw-500">{l}</label>
                      {k==='plan' ? (
                        <select className="form-select form-select-sm" value={selectedCompany[k]} onChange={e=>setSelectedCompany((s:any)=>({...s,[k]:e.target.value}))}>
                          {['free','standard','premium','enterprise'].map(p=><option key={p} value={p}>{p}</option>)}
                        </select>
                      ) : (
                        <input type={t} className="form-control form-control-sm" value={selectedCompany[k]||''} onChange={e=>setSelectedCompany((s:any)=>({...s,[k]:e.target.value}))}/>
                      )}
                    </div>
                  ))}
                  <button className="btn btn-primary btn-sm w-100 mt-2" onClick={async()=>{
                    const res = await fetch(`/api/superadmin/companies/${selectedCompany.company_id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update_limits',...selectedCompany})});
                    const d = await res.json();
                    if(d.success){alert('✅ Updated!');loadCompanies();}else alert('❌ '+d.error);
                  }}>Save Changes</button>
                </div>
              </div>
            </div>

            {/* Users + recent sales */}
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-header border-0 fw-bold">Users</div>
                <div className="card-body p-0">
                  <table className="table mb-0">
                    <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Last Login</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {detailData.users?.map((u:any)=>(
                        <tr key={u.user_id}>
                          <td className="fw-500 small">{u.full_name}</td>
                          <td className="text-muted small">{u.username}</td>
                          <td><span className="badge bg-secondary bg-opacity-15 text-dark">{u.role}</span></td>
                          <td className="small text-muted">{u.last_login?new Date(u.last_login).toLocaleString():'Never'}</td>
                          <td><span className={`badge ${u.is_active?'bg-success':'bg-secondary'}`}>{u.is_active?'Active':'Inactive'}</span></td>
                          <td>
                            <button className="btn btn-sm btn-outline-primary" onClick={()=>{setResetPw({user_id:u.user_id,name:u.full_name});setNewPw('');}}>
                              <i className="bi bi-key me-1"/>Reset PW
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card border-0 shadow-sm">
                <div className="card-header border-0 fw-bold">Recent Sales</div>
                <div className="card-body p-0">
                  {!detailData.recentSales?.length ? <div className="text-muted text-center py-3 small">No sales yet</div> : (
                    <table className="table mb-0">
                      <thead><tr><th>Invoice</th><th>Cashier</th><th>Method</th><th>Amount</th><th>Date</th></tr></thead>
                      <tbody>
                        {detailData.recentSales.map((s:any)=>(
                          <tr key={s.invoice_number}>
                            <td className="small fw-500">{s.invoice_number}</td>
                            <td className="small">{s.cashier}</td>
                            <td className="small">{s.payment_method}</td>
                            <td className="small fw-500">Rs {Number(s.total_amount).toFixed(2)}</td>
                            <td className="small text-muted">{new Date(s.sale_date).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Company Modal */}
      {showCreate && (
        <div className="modal show d-block" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header" style={{background:'linear-gradient(135deg,#667eea,#764ba2)'}}>
                <h5 className="modal-title text-white fw-bold"><i className="bi bi-building-add me-2"/>New Company</h5>
                <button className="btn-close btn-close-white" onClick={()=>setShowCreate(false)}/>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12"><h6 className="fw-bold text-muted border-bottom pb-2">Company Details</h6></div>
                  <div className="col-md-6">
                    <label className="form-label fw-500">Company Name *</label>
                    <input className="form-control" value={form.company_name} onChange={e=>setForm(f=>({...f,company_name:e.target.value,slug:e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'-')}))} placeholder="Green Gift Shop"/>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-500">Slug</label>
                    <input className="form-control" value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))} placeholder="green-gift-shop"/>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-500">Plan</label>
                    <select className="form-select" value={form.plan} onChange={e=>setForm(f=>({...f,plan:e.target.value}))}>
                      {['free','standard','premium','enterprise'].map(p=><option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-500">Max Users</label>
                    <input type="number" className="form-control" value={form.max_users} onChange={e=>setForm(f=>({...f,max_users:+e.target.value}))}/>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-500">Max Products</label>
                    <input type="number" className="form-control" value={form.max_products} onChange={e=>setForm(f=>({...f,max_products:+e.target.value}))}/>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-500">Notes</label>
                    <input className="form-control" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional notes"/>
                  </div>
                  <div className="col-12 mt-2"><h6 className="fw-bold text-muted border-bottom pb-2">Admin Account</h6></div>
                  <div className="col-md-4">
                    <label className="form-label fw-500">Admin Name</label>
                    <input className="form-control" value={form.admin_name} onChange={e=>setForm(f=>({...f,admin_name:e.target.value}))} placeholder="John Smith"/>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-500">Username *</label>
                    <input className="form-control" value={form.admin_username} onChange={e=>setForm(f=>({...f,admin_username:e.target.value}))} placeholder="johnsmith"/>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-500">Password *</label>
                    <input type="password" className="form-control" value={form.admin_password} onChange={e=>setForm(f=>({...f,admin_password:e.target.value}))} placeholder="min 8 chars"/>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-500">Admin Email</label>
                    <input type="email" className="form-control" value={form.admin_email} onChange={e=>setForm(f=>({...f,admin_email:e.target.value}))} placeholder="admin@shop.com"/>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={()=>setShowCreate(false)}>Cancel</button>
                <button className="btn btn-primary px-4" onClick={createCompany} disabled={saving}>
                  {saving?<><span className="spinner-border spinner-border-sm me-2"/>Creating...</>:<><i className="bi bi-plus-lg me-1"/>Create Company</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPw && (
        <div className="modal show d-block" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">Reset Password — {resetPw.name}</h5><button className="btn-close" onClick={()=>setResetPw(null)}/></div>
              <div className="modal-body">
                <label className="form-label fw-500">New Password</label>
                <input type="password" className="form-control" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Enter new password" autoFocus/>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={()=>setResetPw(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={resetPassword} disabled={!newPw}>Reset Password</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
