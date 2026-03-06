'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface SidebarProps {
  user: { full_name: string; role: string; username: string };
}

const SECTION_KEY = 'pos_sidebar_sections';
const DEFAULT_COLLAPSED: Record<string, boolean> = {
  main: false,
  inventory: false,
  contacts: true,   // collapsed by default (less used)
  finance: false,
  admin: false,
};

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(DEFAULT_COLLAPSED);
  const [loaded, setLoaded] = useState(false);

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');
  const isManager = user.role === 'admin' || user.role === 'manager';
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SECTION_KEY);
      if (saved) setCollapsed(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, []);

  function toggleSection(key: string) {
    setCollapsed(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(SECTION_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function closeSidebar() {
    document.querySelector('.sidebar')?.classList.remove('open');
    document.getElementById('sidebarOverlay')?.classList.remove('active');
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  function SectionHeader({ label, sectionKey }: { label: string; sectionKey: string }) {
    return (
      <button
        onClick={() => toggleSection(sectionKey)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', background: 'none', border: 'none',
          padding: '0.55rem 1rem 0.25rem',
          color: collapsed[sectionKey] ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.45)',
          fontSize: '0.68rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
          marginTop: '0.25rem', transition: 'color 0.15s',
        }}
      >
        <span>{label}</span>
        <i className={`bi bi-chevron-${collapsed[sectionKey] ? 'right' : 'down'}`}
           style={{ fontSize: '0.6rem', opacity: 0.7 }} />
      </button>
    );
  }

  if (!loaded) return <div className="sidebar" />;

  return (
    <div className="sidebar">
      <Link href="/dashboard" className="sidebar-brand" onClick={closeSidebar}>
        <span>🛒</span> POS System
      </Link>

      <nav className="sidebar-nav">

        {/* MAIN */}
        <SectionHeader label="Main" sectionKey="main" />
        {!collapsed.main && <>
          <Link href="/dashboard" className={`sidebar-link ${isActive('/dashboard') ? 'active' : ''}`} onClick={closeSidebar}>
            <i className="bi bi-speedometer2" /> Dashboard
          </Link>
          <Link href="/pos" className={`sidebar-link ${isActive('/pos') ? 'active' : ''}`} onClick={closeSidebar}>
            <i className="bi bi-cart3" /> Point of Sale
          </Link>
          <Link href="/drawer" className={`sidebar-link ${isActive('/drawer') ? 'active' : ''}`} onClick={closeSidebar}>
            <i className="bi bi-cash-stack" /> Cash Drawer
          </Link>
          <Link href="/shifts" className={`sidebar-link ${isActive('/shifts') ? 'active' : ''}`} onClick={closeSidebar}>
            <i className="bi bi-person-badge" /> Shifts & Reports
          </Link>
        </>}

        {/* INVENTORY */}
        {isManager && <>
          <SectionHeader label="Inventory" sectionKey="inventory" />
          {!collapsed.inventory && <>
            <Link href="/products" className={`sidebar-link ${isActive('/products') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-box-seam" /> Products
            </Link>
            <Link href="/categories" className={`sidebar-link ${isActive('/categories') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-tags" /> Categories
            </Link>
            <Link href="/label" className={`sidebar-link ${isActive('/label') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-printer" /> Print Labels
            </Link>
            <Link href="/stock-adjust" className={`sidebar-link ${isActive('/stock-adjust') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-sliders" /> Stock Adjustment
            </Link>
          </>}
        </>}

        {/* CONTACTS */}
        {isManager && <>
          <SectionHeader label="Contacts" sectionKey="contacts" />
          {!collapsed.contacts && <>
            <Link href="/customers" className={`sidebar-link ${isActive('/customers') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-people" /> Customers
            </Link>
            <Link href="/suppliers" className={`sidebar-link ${isActive('/suppliers') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-truck" /> Suppliers
            </Link>
          </>}
        </>}

        {/* SALES & FINANCE */}
        {isManager && <>
          <SectionHeader label="Sales & Finance" sectionKey="finance" />
          {!collapsed.finance && <>
            <Link href="/sales" className={`sidebar-link ${isActive('/sales') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-receipt" /> Sales
            </Link>
            <Link href="/reports" className={`sidebar-link ${pathname === '/reports' ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-bar-chart" /> Reports
            </Link>
            <Link href="/reports/cashier" className={`sidebar-link ${isActive('/reports/cashier') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-graph-up" /> Cashier Report
            </Link>
            <Link href="/expenses" className={`sidebar-link ${isActive('/expenses') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-receipt-cutoff" /> Expenses
            </Link>
          </>}
        </>}

        {/* ADMIN */}
        {isAdmin && <>
          <SectionHeader label="Admin" sectionKey="admin" />
          {!collapsed.admin && <>
            <Link href="/users" className={`sidebar-link ${isActive('/users') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-people" /> Users
            </Link>
            <Link href="/settings" className={`sidebar-link ${isActive('/settings') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-gear" /> Settings
            </Link>
          </>}
        </>}

      </nav>

      <div className="sidebar-footer">
        <div className="d-flex align-items-center gap-2 mb-2">
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #0d6efd, #6610f2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0
          }}>
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div className="fw-600 text-white" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.full_name}</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{user.role}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="btn btn-sm btn-outline-secondary w-100 text-white border-secondary-subtle" style={{ opacity: 0.7 }}>
          <i className="bi bi-box-arrow-right me-1" /> Logout
        </button>
      </div>
    </div>
  );
}
