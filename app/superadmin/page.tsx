export const dynamic = 'force-dynamic';
import { getSuperAdminSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SuperAdminDashboard from './SuperAdminDashboard';
export default async function SuperAdminPage() {
  const session = await getSuperAdminSession();
  if (!session) redirect('/superadmin/login');
  return <SuperAdminDashboard />;
}
