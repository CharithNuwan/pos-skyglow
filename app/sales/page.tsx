export const dynamic = 'force-dynamic';
import AppLayout from '@/components/AppLayout';
import SalesClient from './SalesClient';
export default function SalesPage() {
  return <AppLayout title="Sales" requiredRole="manager"><SalesClient /></AppLayout>;
}
