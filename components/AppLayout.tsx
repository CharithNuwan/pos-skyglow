import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import SidebarOverlay from './SidebarOverlay';

export const dynamic = 'force-dynamic';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  requiredRole?: 'cashier' | 'manager' | 'admin';
}

export default async function AppLayout({ children, title, requiredRole = 'cashier' }: AppLayoutProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { hasRole } = await import('@/lib/auth');
  if (!hasRole(session.role, requiredRole)) redirect('/dashboard');

  return (
    <div className="app-layout">
      <Sidebar user={session} />
      <SidebarOverlay />
      <div className="main-wrapper">
        <div className="topbar" style={{ display: 'flex', alignItems: 'center' }}>
          <MobileNav />
          <h5 className="mb-0 fw-bold">{title}</h5>
          <div className="d-flex align-items-center gap-3 ms-auto">
            <span className="text-muted small d-none d-sm-block">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}
