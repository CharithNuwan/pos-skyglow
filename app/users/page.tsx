import AppLayout from '@/components/AppLayout';
import UsersClient from './UsersClient';
export default function UsersPage() {
  return <AppLayout title="Users" requiredRole="admin"><UsersClient /></AppLayout>;
}
