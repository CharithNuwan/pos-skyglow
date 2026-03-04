export const dynamic = 'force-dynamic';
import AppLayout from '@/components/AppLayout';
import LabelClient from './LabelClient';
export default function LabelPage() {
  return <AppLayout title="Print Labels"><LabelClient /></AppLayout>;
}
