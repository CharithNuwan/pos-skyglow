export const dynamic = 'force-dynamic';
import AppLayout from '@/components/AppLayout';
import CashierReportClient from './CashierReportClient';
export default function CashierReportPage() {
  return <AppLayout title="Cashier Performance" requiredRole="manager"><CashierReportClient /></AppLayout>;
}
