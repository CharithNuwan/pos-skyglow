export const dynamic = 'force-dynamic';

import AppLayout from '@/components/AppLayout';
import DashboardClient from './DashboardClient';

export default function DashboardPage() {
  return (
    <AppLayout title="Dashboard">
      <DashboardClient />
    </AppLayout>
  );
}
