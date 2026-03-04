export const dynamic = 'force-dynamic';
import AppLayout from '@/components/AppLayout';
import CategoriesClient from './CategoriesClient';
export default function CategoriesPage() {
  return <AppLayout title="Categories" requiredRole="manager"><CategoriesClient /></AppLayout>;
}
