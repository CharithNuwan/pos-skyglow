export const dynamic = 'force-dynamic';
import AppLayout from '@/components/AppLayout';
import DrawerClient from './DrawerClient';
export default function DrawerPage() {
  return <AppLayout title="Cash Drawer"><DrawerClient /></AppLayout>;
}
