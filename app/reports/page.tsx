export const dynamic = 'force-dynamic';
import AppLayout from '@/components/AppLayout';
import ReportsClient from './ReportsClient';
export default function ReportsPage() {
  return <AppLayout title="Reports" requiredRole="manager"><ReportsClient /></AppLayout>;
}
