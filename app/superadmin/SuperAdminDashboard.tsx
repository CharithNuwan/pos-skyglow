'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Company = {
  company_id: number; company_name: string; slug: string; plan: string;
  max_users: number; max_products: number; is_active: number; notes: string;
  user_count: number; product_count: number; sale_count: number;
  total_revenue: number; today_sales: number; created_at: string;
};

const PLANS = ['free','standard','premium','enterprise'];
const PLAN_COLORS: Record<string,string> = { free:'#6c757d', standard:'#0d6efd', premium:'#6f42c1', enterprise:'#fd7e14' };
const PLAN_BADGE: Record<string,string> = { free:'bg-secondary', standard:'bg-primary', premium:'bg-purple', enterprise:'bg-warning text-dark' };

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState<'list'|'detail'>('list');
  const [detailData, setDetailData] = useState<any>(null);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [resetPw, setResetPw] = useState<{user_id:number,name:string}|null>(null);
  const [newPw, setNewPw] = useState('');
  const [showChangePw, setShowChangePw] = useState(false);
  const [changePwForm, setChangePwForm] = useState({current:'', newPw:'', confirm:''});
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ company_name:'', slug:'', plan:'standard', max_users:10, max_products:500, admin_username:'', admin_email:'', admin_password:'', admin_name:'', notes:'' });

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
    setSelectedCompany({...d.company});
    setView('detail');
  }

  async function createCompany() {
    if (!form.company_name || !form.admin_username || !form.admin_password) {
      setMsg('❌ Company name, admin username and password are required'); return;
    }
    setSaving(true);
    const res = await fetch('/api/superadmin/companies', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
    const d = await res.json();
    if (d.success) { setMsg('✅ Company created successfully!'); setShowCreate(false); resetForm(); loadCompanies(); }
    else setMsg('❌ ' + d.error);
    setSaving(false);
  }

  function resetForm() {
    setForm({ company_name:'', slug:'', plan:'standard', max_users:10, max_products:500, admin_username:'', admin_email:'', admin_password:'', admin_name:'', notes:'' });
  }

  async function toggleActive(id: number, e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to change this company\'s status?')) return;
    await fetch(`/api/superadmin/companies/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'toggle_active'}) });
    loadCompanies();
    if (view==='detail') loadDetail(id);
  }

  async function saveLimits() {
    const res = await fetch(`/api/superadmin/companies/${selectedCompany.company_id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({action:'update_limits', ...selectedCompany})
    });
    const d = await res.json();
    if (d.success) { setMsg('✅ Company updated!'); loadCompanies(); }
    else setMsg('❌ ' + d.error);
  }

  async function doResetPw() {
    if (!resetPw || !newPw || newPw.length < 6) { alert('Password must be at least 6 characters'); return; }
    const res = await fetch(`/api/superadmin/companies/${selectedCompany.company_id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({action:'reset_password', user_id: resetPw.user_id, new_password: newPw})
    });
    const d = await res.json();
    if (d.success) { setMsg(`✅ Password reset for ${resetPw.name}`); setResetPw(null); setNewPw(''); }
    else setMsg('❌ ' + d.error);
  }

  async function logout() {
    await fetch('/api/superadmin/auth', { method:'DELETE' });
    router.push('/superadmin/login');
  }

  const filtered = companies.filter(c =>
    !search || c.company_name.toLowerCase().includes(search.toLowerCase()) || c.slug.includes(search.toLowerCase())
  );
  const totalRevenue = companies.reduce((s,c)=>s+Number(c.total_revenue||0),0);
  const activeCompanies = companies.filter(c=>c.is_active).length;
  const todaySales = companies.reduce((s,c)=>s+Number(c.today_sales||0),0);

  return (
    <div style={{minHeight:'100vh', background:'#f0f2f5', fontFamily:'system-ui,sans-serif'}}>

      {/* ── Top Bar ── */}
      <div style={{background:'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', padding:'0 1.5rem', height:58, display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 2px 8px rgba(102,126,234,0.4)'}}>
        <div className="d-flex align-items-center gap-3">
          {view==='detail' && (
            <button onClick={()=>{setView('list');setMsg('');}} style={{background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',borderRadius:8,padding:'5px 12px',cursor:'pointer',fontSize:'0.85rem'}}>
              ← Back
            </button>
          )}
          <span style={{color:'#fff',fontWeight:700,fontSize:'1.05rem'}}>🔐 Super Admin Console</span>
          {view==='detail' && selectedCompany && (
            <span style={{color:'rgba(255,255,255,0.7)',fontSize:'0.85rem'}}>/ {selectedCompany.company_name}</span>
          )}
        </div>
        <div className="d-flex gap-2 align-items-center">
          <button onClick={()=>setShowChangePw(true)} style={{background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',borderRadius:8,padding:'5px 12px',cursor:'pointer',fontSize:'0.82rem'}}>
            <i className="bi bi-key me-1"/>Change Password
          </button>
          <span style={{color:'rgba(255,255,255,0.6)',fontSize:'0.82rem',marginLeft:4}}>superadmin</span>
          <button onClick={logout} style={{background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',borderRadius:8,padding:'5px 12px',cursor:'pointer',fontSize:'0.82rem'}}>
            <i className="bi bi-box-arrow-right me-1"/>Logout
          </button>
        </div>
      </div>

      <div style={{maxWidth:1300, margin:'0 auto', padding:'1.5rem'}}>
        {msg && (
          <div className={`alert ${msg.startsWith('✅')?'alert-success':'alert-danger'} alert-dismissible mb-3 py-2`}>
            {msg}<button className="btn-close" onClick={()=>setMsg('')}/>
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <>
            {/* Stats row */}
            <div className="row g-3 mb-4">
              {[
                { label:'Total Companies', value: companies.length, icon:'bi-building', color:'#667eea', bg:'#f0edff' },
                { label:'Active',           value: activeCompanies,  icon:'bi-check-circle-fill', color:'#198754', bg:'#d1fae5' },
                { label:"Today's Sales",    value: todaySales,       icon:'bi-cart-check', color:'#0d6efd', bg:'#dbeafe' },
                { label:'All-time Revenue', value:`Rs ${totalRevenue.toLocaleString('en',{minimumFractionDigits:2})}`, icon:'bi-graph-up-arrow', color:'#fd7e14', bg:'#fff3e0' },
              ].map(({label,value,icon,color,bg})=>(
                <div key={label} className="col-6 col-lg-3">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body d-flex align-items-center gap-3 py-3">
                      <div style={{width:50,height:50,borderRadius:14,background:bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <i className={`bi ${icon}`} style={{color,fontSize:'1.4rem'}}/>
                      </div>
                      <div>
                        <div style={{fontSize:'1.5rem',fontWeight:800,lineHeight:1,color:'#1a1a2e'}}>{value}</div>
                        <div style={{fontSize:'0.78rem',color:'#6c757d',marginTop:2}}>{label}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Companies table */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3">
                  <h6 className="fw-bold mb-0">Companies</h6>
                  <input className="form-control form-control-sm" style={{width:200}} placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                <button className="btn btn-primary btn-sm px-3" onClick={()=>setShowCreate(true)}>
                  <i className="bi bi-plus-lg me-1"/>New Company
                </button>
              </div>
              <div className="card-body p-0">
                {loading ? (
                  <div className="text-center py-5"><div className="spinner-border text-primary"/></div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-building fs-1 d-block mb-2 opacity-25"/>No companies found
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead style={{background:'#f8f9fa'}}>
                        <tr>
                          <th className="ps-4 py-3" style={{fontSize:'0.75rem',color:'#6c757d',textTransform:'uppercase',letterSpacing:'0.05em'}}>Company</th>
                          <th style={{fontSize:'0.75rem',color:'#6c757d',textTransform:'uppercase',letterSpacing:'0.05em'}}>Plan</th>
                          <th style={{fontSize:'0.75rem',color:'#6c757d',textTransform:'uppercase',letterSpacing:'0.05em'}}>Users</th>
                          <th style={{fontSize:'0.75rem',color:'#6c757d',textTransform:'uppercase',letterSpacing:'0.05em'}}>Products</th>
                          <th style={{fontSize:'0.75rem',color:'#6c757d',textTransform:'uppercase',letterSpacing:'0.05em'}}>Sales</th>
                          <th style={{fontSize:'0.75rem',color:'#6c757d',textTransform:'uppercase',letterSpacing:'0.05em'}}>Revenue</th>
                          <th style={{fontSize:'0.75rem',color:'#6c757d',textTransform:'uppercase',letterSpacing:'0.05em'}}>Today</th>
                          <th style={{fontSize:'0.75rem',color:'#6c757d',textTransform:'uppercase',letterSpacing:'0.05em'}}>Status</th>
                          <th style={{fontSize:'0.75rem',color:'#6c757d',textTransform:'uppercase',letterSpacing:'0.05em'}}>Joined</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((c)=>(
                          <tr key={c.company_id} style={{cursor:'pointer'}} onClick={()=>loadDetail(c.company_id)}>
                            <td className="ps-4">
                              <div className="d-flex align-items-center gap-3">
                                <div style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${PLAN_COLORS[c.plan]||'#667eea'}33,${PLAN_COLORS[c.plan]||'#667eea'}66)`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:PLAN_COLORS[c.plan]||'#667eea',fontSize:'1rem',flexShrink:0}}>
                                  {c.company_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{fontWeight:600,fontSize:'0.9rem'}}>{c.company_name}</div>
                                  <div style={{fontSize:'0.75rem',color:'#6c757d'}}>/{c.slug}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{background:PLAN_COLORS[c.plan]+'20',color:PLAN_COLORS[c.plan],padding:'3px 10px',borderRadius:99,fontSize:'0.75rem',fontWeight:600,textTransform:'capitalize'}}>
                                {c.plan}
                              </span>
                            </td>
                            <td>
                              <div style={{display:'flex',alignItems:'center',gap:6}}>
                                <div style={{flex:1,height:5,background:'#e9ecef',borderRadius:99,width:50,overflow:'hidden'}}>
                                  <div style={{height:'100%',background:'#0d6efd',borderRadius:99,width:`${Math.min(100,(c.user_count/c.max_users)*100)}%`}}/>
                                </div>
                                <span style={{fontSize:'0.78rem',color:'#495057'}}>{c.user_count}/{c.max_users}</span>
                              </div>
                            </td>
                            <td>
                              <div style={{display:'flex',alignItems:'center',gap:6}}>
                                <div style={{flex:1,height:5,background:'#e9ecef',borderRadius:99,width:50,overflow:'hidden'}}>
                                  <div style={{height:'100%',background:'#198754',borderRadius:99,width:`${Math.min(100,(c.product_count/c.max_products)*100)}%`}}/>
                                </div>
                                <span style={{fontSize:'0.78rem',color:'#495057'}}>{c.product_count}/{c.max_products}</span>
                              </div>
                            </td>
                            <td style={{fontWeight:600,fontSize:'0.88rem'}}>{c.sale_count}</td>
                            <td style={{fontWeight:700,fontSize:'0.88rem',color:'#198754'}}>Rs {Number(c.total_revenue).toLocaleString('en',{minimumFractionDigits:2})}</td>
                            <td>
                              <span style={{background: c.today_sales>0?'#dbeafe':'#f8f9fa', color:c.today_sales>0?'#1d4ed8':'#6c757d', padding:'2px 8px',borderRadius:99,fontSize:'0.75rem',fontWeight:500}}>
                                {c.today_sales} sales
                              </span>
                            </td>
                            <td>
                              <span style={{background:c.is_active?'#d1fae5':'#f3f4f6',color:c.is_active?'#065f46':'#6b7280',padding:'3px 10px',borderRadius:99,fontSize:'0.75rem',fontWeight:600}}>
                                {c.is_active?'● Active':'○ Suspended'}
                              </span>
                            </td>
                            <td style={{fontSize:'0.78rem',color:'#6c757d'}}>{new Date(c.created_at).toLocaleDateString()}</td>
                            <td onClick={e=>e.stopPropagation()}>
                              <button
                                className={`btn btn-sm ${c.is_active?'btn-outline-warning':'btn-outline-success'}`}
                                style={{fontSize:'0.75rem',padding:'3px 10px'}}
                                onClick={e=>toggleActive(c.company_id, e)}>
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

        {/* ── DETAIL VIEW ── */}
        {view==='detail' && detailData && selectedCompany && (
          <div className="row g-3">
            {/* Left col */}
            <div className="col-lg-4">
              {/* Company card */}
              <div className="card border-0 shadow-sm mb-3" style={{overflow:'hidden'}}>
                <div style={{background:`linear-gradient(135deg,${PLAN_COLORS[selectedCompany.plan]||'#667eea'},${PLAN_COLORS[selectedCompany.plan]||'#764ba2'})`,padding:'1.5rem',textAlign:'center'}}>
                  <div style={{width:64,height:64,borderRadius:18,background:'rgba(255,255,255,0.25)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:'#fff',fontSize:'1.8rem',margin:'0 auto 0.75rem'}}>
                    {selectedCompany.company_name.charAt(0).toUpperCase()}
                  </div>
                  <h5 style={{color:'#fff',fontWeight:700,margin:0}}>{selectedCompany.company_name}</h5>
                  <div style={{color:'rgba(255,255,255,0.7)',fontSize:'0.82rem',marginTop:4}}>/{selectedCompany.slug}</div>
                  <span style={{background:'rgba(255,255,255,0.25)',color:'#fff',padding:'2px 12px',borderRadius:99,fontSize:'0.78rem',marginTop:8,display:'inline-block',textTransform:'capitalize'}}>
                    {selectedCompany.plan}
                  </span>
                </div>
                <div className="card-body">
                  <div className="row g-2 text-center mb-3">
                    {[
                      ['Users',`${detailData.users?.length||0}/${selectedCompany.max_users}`,'#0d6efd'],
                      ['Products',`${selectedCompany.product_count||0}/${selectedCompany.max_products}`,'#198754'],
                      ['Sales',selectedCompany.sale_count||0,'#fd7e14'],
                    ].map(([l,v,c]:any)=>(
                      <div key={l} className="col-4">
                        <div style={{background:'#f8f9fa',borderRadius:10,padding:'0.6rem 0.25rem'}}>
                          <div style={{fontWeight:800,color:c,fontSize:'1.05rem'}}>{v}</div>
                          <div style={{fontSize:'0.68rem',color:'#6c757d'}}>{l}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className={`btn w-100 ${selectedCompany.is_active?'btn-outline-warning':'btn-success'}`}
                    onClick={()=>toggleActive(selectedCompany.company_id)}>
                    <i className={`bi bi-${selectedCompany.is_active?'pause':'play'}-circle me-1`}/>
                    {selectedCompany.is_active?'Suspend Company':'Activate Company'}
                  </button>
                </div>
              </div>

              {/* Edit limits */}
              <div className="card border-0 shadow-sm">
                <div className="card-header border-0 py-3" style={{background:'#f8f9fa'}}>
                  <span className="fw-bold">Edit Company</span>
                </div>
                <div className="card-body">
                  <div className="mb-2">
                    <label className="form-label small fw-600">Company Name</label>
                    <input className="form-control form-control-sm" value={selectedCompany.company_name||''} onChange={e=>setSelectedCompany((s:any)=>({...s,company_name:e.target.value}))}/>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-600">Plan</label>
                    <select className="form-select form-select-sm" value={selectedCompany.plan} onChange={e=>setSelectedCompany((s:any)=>({...s,plan:e.target.value}))}>
                      {PLANS.map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label small fw-600">Max Users</label>
                      <input type="number" className="form-control form-control-sm" value={selectedCompany.max_users||''} onChange={e=>setSelectedCompany((s:any)=>({...s,max_users:+e.target.value}))}/>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-600">Max Products</label>
                      <input type="number" className="form-control form-control-sm" value={selectedCompany.max_products||''} onChange={e=>setSelectedCompany((s:any)=>({...s,max_products:+e.target.value}))}/>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-600">Notes</label>
                    <textarea className="form-control form-control-sm" rows={2} value={selectedCompany.notes||''} onChange={e=>setSelectedCompany((s:any)=>({...s,notes:e.target.value}))}/>
                  </div>
                  <button className="btn btn-primary btn-sm w-100" onClick={saveLimits}>
                    <i className="bi bi-save me-1"/>Save Changes
                  </button>
                </div>
              </div>
            </div>

            {/* Right col */}
            <div className="col-lg-8">
              {/* Users */}
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-header border-0 py-3 bg-white d-flex justify-content-between align-items-center">
                  <span className="fw-bold">Users ({detailData.users?.length||0})</span>
                </div>
                <div className="card-body p-0">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{background:'#f8f9fa'}}>
                      <tr>
                        <th className="ps-3 py-2" style={{fontSize:'0.73rem',color:'#6c757d',textTransform:'uppercase'}}>Name</th>
                        <th style={{fontSize:'0.73rem',color:'#6c757d',textTransform:'uppercase'}}>Username</th>
                        <th style={{fontSize:'0.73rem',color:'#6c757d',textTransform:'uppercase'}}>Role</th>
                        <th style={{fontSize:'0.73rem',color:'#6c757d',textTransform:'uppercase'}}>Last Login</th>
                        <th style={{fontSize:'0.73rem',color:'#6c757d',textTransform:'uppercase'}}>Status</th>
                        <th style={{fontSize:'0.73rem',color:'#6c757d',textTransform:'uppercase'}}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.users?.map((u:any)=>(
                        <tr key={u.user_id}>
                          <td className="ps-3">
                            <div className="d-flex align-items-center gap-2">
                              <div style={{width:30,height:30,borderRadius:8,background:'#667eea22',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#667eea',fontSize:'0.8rem'}}>
                                {u.full_name.charAt(0).toUpperCase()}
                              </div>
                              <span style={{fontWeight:500,fontSize:'0.85rem'}}>{u.full_name}</span>
                            </div>
                          </td>
                          <td style={{fontSize:'0.82rem',color:'#6c757d'}}>{u.username}</td>
                          <td>
                            <span style={{background:u.role==='admin'?'#ede9fe':'#f3f4f6',color:u.role==='admin'?'#6f42c1':'#374151',padding:'2px 8px',borderRadius:99,fontSize:'0.72rem',fontWeight:600,textTransform:'capitalize'}}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{fontSize:'0.78rem',color:'#6c757d'}}>{u.last_login?new Date(u.last_login).toLocaleDateString():'Never'}</td>
                          <td>
                            <span style={{background:u.is_active?'#d1fae5':'#f3f4f6',color:u.is_active?'#065f46':'#6b7280',padding:'2px 8px',borderRadius:99,fontSize:'0.72rem',fontWeight:600}}>
                              {u.is_active?'Active':'Inactive'}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-sm btn-outline-primary" style={{fontSize:'0.72rem',padding:'2px 8px'}}
                              onClick={()=>{setResetPw({user_id:u.user_id,name:u.full_name});setNewPw('');}}>
                              <i className="bi bi-key me-1"/>Reset PW
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Sales */}
              <div className="card border-0 shadow-sm">
                <div className="card-header border-0 py-3 bg-white">
                  <span className="fw-bold">Recent Sales</span>
                </div>
                <div className="card-body p-0">
                  {!detailData.recentSales?.length ? (
                    <div className="text-center py-4 text-muted"><i className="bi bi-receipt fs-2 d-block mb-2 opacity-25"/>No sales yet</div>
                  ) : (
                    <table className="table table-hover align-middle mb-0">
                      <thead style={{background:'#f8f9fa'}}>
                        <tr>
                          <th className="ps-3" style={{fontSize:'0.73rem',color:'#6c757d',textTransform:'uppercase'}}>Invoice</th>
                          <th style={{fontSize:'0.73rem',color:'#6c757d',textTransform:'uppercase'}}>Cashier</th>
                          <th style={{fontSize:'0.73rem',color:'#6c757d',textTransform:'uppercase'}}>Method</th>
                          <th style={{fontSize:'0.73rem',color:'#6c757d',textTransform:'uppercase'}}>Amount</th>
                          <th style={{fontSize:'0.73rem',color:'#6c757d',textTransform:'uppercase'}}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailData.recentSales.map((s:any)=>(
                          <tr key={s.invoice_number}>
                            <td className="ps-3" style={{fontWeight:600,fontSize:'0.82rem'}}>{s.invoice_number}</td>
                            <td style={{fontSize:'0.82rem'}}>{s.cashier}</td>
                            <td>
                              <span style={{background:'#f8f9fa',padding:'2px 8px',borderRadius:99,fontSize:'0.72rem'}}>{s.payment_method}</span>
                            </td>
                            <td style={{fontWeight:700,color:'#198754',fontSize:'0.85rem'}}>Rs {Number(s.total_amount).toFixed(2)}</td>
                            <td style={{fontSize:'0.78rem',color:'#6c757d'}}>{new Date(s.sale_date).toLocaleDateString()}</td>
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

      {/* ── Create Company Modal ── */}
      {showCreate && (
        <div className="modal show d-block" style={{background:'rgba(0,0,0,0.55)'}}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{borderRadius:16,overflow:'hidden'}}>
              <div style={{background:'linear-gradient(135deg,#667eea,#764ba2)',padding:'1.25rem 1.5rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h5 style={{color:'#fff',fontWeight:700,margin:0}}><i className="bi bi-building-add me-2"/>New Company</h5>
                <button style={{background:'rgba(255,255,255,0.2)',border:'none',color:'#fff',width:30,height:30,borderRadius:8,cursor:'pointer',fontSize:'1rem'}} onClick={()=>{setShowCreate(false);resetForm();}}>×</button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3">
                  <div className="col-12"><div style={{fontWeight:700,color:'#667eea',borderBottom:'2px solid #667eea22',paddingBottom:6,marginBottom:4}}>Company Details</div></div>
                  <div className="col-md-5">
                    <label className="form-label small fw-600">Company Name *</label>
                    <input className="form-control" value={form.company_name}
                      onChange={e=>setForm(f=>({...f,company_name:e.target.value,slug:e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-')}))}
                      placeholder="e.g. Green Gift Shop"/>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-600">URL Slug</label>
                    <div className="input-group">
                      <span className="input-group-text text-muted" style={{fontSize:'0.82rem'}}>/</span>
                      <input className="form-control" value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))} placeholder="green-gift-shop"/>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label small fw-600">Plan</label>
                    <select className="form-select" value={form.plan} onChange={e=>setForm(f=>({...f,plan:e.target.value}))}>
                      {PLANS.map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="col-md-1">
                    <label className="form-label small fw-600">Max Users</label>
                    <input type="number" className="form-control" value={form.max_users} onChange={e=>setForm(f=>({...f,max_users:+e.target.value}))}/>
                  </div>
                  <div className="col-md-1">
                    <label className="form-label small fw-600">Max Prod.</label>
                    <input type="number" className="form-control" value={form.max_products} onChange={e=>setForm(f=>({...f,max_products:+e.target.value}))}/>
                  </div>
                  <div className="col-12 mt-1"><div style={{fontWeight:700,color:'#667eea',borderBottom:'2px solid #667eea22',paddingBottom:6,marginBottom:4}}>Admin Account</div></div>
                  <div className="col-md-3">
                    <label className="form-label small fw-600">Full Name</label>
                    <input className="form-control" value={form.admin_name} onChange={e=>setForm(f=>({...f,admin_name:e.target.value}))} placeholder="John Smith"/>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-600">Username *</label>
                    <input className="form-control" value={form.admin_username} onChange={e=>setForm(f=>({...f,admin_username:e.target.value}))} placeholder="johnsmith"/>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-600">Password *</label>
                    <input type="password" className="form-control" value={form.admin_password} onChange={e=>setForm(f=>({...f,admin_password:e.target.value}))} placeholder="min 6 chars"/>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-600">Email</label>
                    <input type="email" className="form-control" value={form.admin_email} onChange={e=>setForm(f=>({...f,admin_email:e.target.value}))} placeholder="admin@shop.com"/>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-600">Notes (optional)</label>
                    <input className="form-control" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Any notes about this company"/>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 px-4 pb-4">
                <button className="btn btn-secondary" onClick={()=>{setShowCreate(false);resetForm();}}>Cancel</button>
                <button className="btn btn-primary px-4" onClick={createCompany} disabled={saving}>
                  {saving?<><span className="spinner-border spinner-border-sm me-2"/>Creating...</>:<><i className="bi bi-building-add me-1"/>Create Company</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {resetPw && (
        <div className="modal show d-block" style={{background:'rgba(0,0,0,0.55)'}}>
          <div className="modal-dialog modal-dialog-centered" style={{maxWidth:400}}>
            <div className="modal-content border-0 shadow-lg" style={{borderRadius:16}}>
              <div className="modal-header border-0 pb-0">
                <h6 className="modal-title fw-bold"><i className="bi bi-key me-2 text-primary"/>Reset Password</h6>
                <button className="btn-close" onClick={()=>setResetPw(null)}/>
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-3">Setting new password for <strong>{resetPw.name}</strong></p>
                <input type="password" className="form-control" value={newPw} onChange={e=>setNewPw(e.target.value)}
                  placeholder="New password (min 6 chars)" autoFocus onKeyDown={e=>e.key==='Enter'&&doResetPw()}/>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-secondary btn-sm" onClick={()=>setResetPw(null)}>Cancel</button>
                <button className="btn btn-primary btn-sm px-3" onClick={doResetPw} disabled={newPw.length<6}>Reset Password</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Own Password Modal ── */}
      {showChangePw && (
        <div className="modal show d-block" style={{background:'rgba(0,0,0,0.55)'}}>
          <div className="modal-dialog modal-dialog-centered" style={{maxWidth:400}}>
            <div className="modal-content border-0 shadow-lg" style={{borderRadius:16}}>
              <div className="modal-header border-0 pb-0">
                <h6 className="modal-title fw-bold"><i className="bi bi-shield-lock me-2 text-primary"/>Change Your Password</h6>
                <button className="btn-close" onClick={()=>{setShowChangePw(false);setChangePwForm({current:'',newPw:'',confirm:''});}}/>
              </div>
              <div className="modal-body">
                {['current','newPw','confirm'].map((k,i)=>(
                  <div key={k} className={i<2?'mb-3':'mb-0'}>
                    <label className="form-label small fw-600">{['Current Password','New Password','Confirm New Password'][i]}</label>
                    <input type="password" className="form-control" value={(changePwForm as any)[k]}
                      onChange={e=>setChangePwForm(f=>({...f,[k]:e.target.value}))}
                      placeholder={['Enter current password','Min 8 characters','Repeat new password'][i]}/>
                  </div>
                ))}
                {changePwForm.newPw && changePwForm.confirm && changePwForm.newPw !== changePwForm.confirm && (
                  <div className="text-danger small mt-2">Passwords don't match</div>
                )}
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-secondary btn-sm" onClick={()=>{setShowChangePw(false);setChangePwForm({current:'',newPw:'',confirm:''});}}>Cancel</button>
                <button className="btn btn-primary btn-sm px-3"
                  disabled={!changePwForm.current || changePwForm.newPw.length < 8 || changePwForm.newPw !== changePwForm.confirm}
                  onClick={async()=>{
                    const res = await fetch('/api/superadmin/auth/change-password', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({current:changePwForm.current,newPassword:changePwForm.newPw})});
                    const d = await res.json();
                    if(d.success){setMsg('✅ Password changed successfully!');setShowChangePw(false);setChangePwForm({current:'',newPw:'',confirm:''});}
                    else alert('❌ '+(d.error||'Failed'));
                  }}>
                  Change Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
