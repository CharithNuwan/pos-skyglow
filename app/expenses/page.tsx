export const dynamic = 'force-dynamic';
import AppLayout from '@/components/AppLayout';
import ExpensesClient from './ExpensesClient';
export default function ExpensesPage() {
  return <AppLayout title="Expenses" requiredRole="manager"><ExpensesClient /></AppLayout>;
}
