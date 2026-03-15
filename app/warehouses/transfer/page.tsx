export const dynamic = 'force-dynamic';
import AppLayout from '@/components/AppLayout';
import TransferClient from './TransferClient';
export default function TransferPage() {
  return <AppLayout title="Transfer Stock" requiredRole="manager"><TransferClient /></AppLayout>;
}
