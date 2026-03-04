'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface SidebarProps {
  user: { full_name: string; role: string; username: string };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const isManager = user.role === 'admin' || user.role === 'manager';
  const isAdmin = user.role === 'admin';

  return (
    <div className="sidebar">
      <Link href="/dashboard" className="sidebar-brand">
        <span>🛒</span> POS System
      </Link>

      <nav className="sidebar-nav">
        <div className="sidebar-section">Main</div>
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
        <Link href="/shifts" className={`sidebar-link ${isActive('/shifts') ? 'active' : ''}`} onClick={closeSidebar}>
          <i className="bi bi-clock" /> My Shift
        </Link>

        {isManager && (
          <>
            <div className="sidebar-section mt-2">Inventory</div>
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
            <div className="sidebar-section mt-2">Contacts</div>
            <Link href="/customers" className={`sidebar-link ${isActive('/customers') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-people" /> Customers
            </Link>
            <Link href="/suppliers" className={`sidebar-link ${isActive('/suppliers') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-truck" /> Suppliers
            </Link>
          </>
        )}

        {isManager && (
          <>
            <div className="sidebar-section mt-2">Sales & Finance</div>
            <Link href="/sales" className={`sidebar-link ${isActive('/sales') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-receipt" /> Sales
            </Link>
            <Link href="/reports" className={`sidebar-link ${isActive('/reports') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-bar-chart" /> Reports
            </Link>
            <Link href="/reports/cashier" className={`sidebar-link ${isActive('/reports/cashier') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-people" /> Cashier Report
            </Link>
            <Link href="/expenses" className={`sidebar-link ${isActive('/expenses') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-receipt-cutoff" /> Expenses
            </Link>
          </>
        )}

        {isAdmin && (
          <>
            <div className="sidebar-section mt-2">Admin</div>
            <Link href="/users" className={`sidebar-link ${isActive('/users') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-people" /> Users
            </Link>
            <Link href="/settings" className={`sidebar-link ${isActive('/settings') ? 'active' : ''}`} onClick={closeSidebar}>
              <i className="bi bi-gear" /> Settings
            </Link>
          </>
        )}
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
