export const dynamic = 'force-dynamic';
import AppLayout from '@/components/AppLayout';
import WarehousesClient from './WarehousesClient';
export default function WarehousesPage() {
  return <AppLayout title="Warehouses" requiredRole="manager"><WarehousesClient /></AppLayout>;
}
