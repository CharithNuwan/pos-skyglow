export const dynamic = 'force-dynamic';
import AppLayout from '@/components/AppLayout';
import ShiftsClient from './ShiftsClient';
export default function ShiftsPage() {
  return <AppLayout title="Shifts & Cashier Report"><ShiftsClient /></AppLayout>;
}
