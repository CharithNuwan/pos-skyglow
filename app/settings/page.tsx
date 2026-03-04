import AppLayout from '@/components/AppLayout';
import SettingsClient from './SettingsClient';
export default function SettingsPage() {
  return <AppLayout title="Settings" requiredRole="admin"><SettingsClient /></AppLayout>;
}
