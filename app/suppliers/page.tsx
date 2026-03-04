export const dynamic = 'force-dynamic';
import AppLayout from '@/components/AppLayout';
import SuppliersClient from './SuppliersClient';
export default function SuppliersPage() {
  return <AppLayout title="Suppliers" requiredRole="manager"><SuppliersClient /></AppLayout>;
}
