export const dynamic = 'force-dynamic';
import AppLayout from '@/components/AppLayout';
import CustomersClient from './CustomersClient';
export default function CustomersPage() {
  return <AppLayout title="Customers"><CustomersClient /></AppLayout>;
}
