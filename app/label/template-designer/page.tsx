export const dynamic = 'force-dynamic';
import AppLayout from '@/components/AppLayout';
import TemplateDesignerClient from './TemplateDesignerClient';

export default function TemplateDesignerPage() {
  return (
    <AppLayout title="Print template designer">
      <TemplateDesignerClient />
    </AppLayout>
  );
}
