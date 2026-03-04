export const dynamic = 'force-dynamic';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import POSClient from './POSClient';

export default async function POSPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  return <POSClient />;
}
