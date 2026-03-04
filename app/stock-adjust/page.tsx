export const dynamic = 'force-dynamic';
import AppLayout from '@/components/AppLayout';
import StockAdjustClient from './StockAdjustClient';
export default function StockAdjustPage() {
  return <AppLayout title="Stock Adjustment" requiredRole="manager"><StockAdjustClient /></AppLayout>;
}
