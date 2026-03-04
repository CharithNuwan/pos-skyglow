import AppLayout from '@/components/AppLayout';
import ProductsClient from './ProductsClient';

export default function ProductsPage() {
  return (
    <AppLayout title="Products" requiredRole="manager">
      <ProductsClient />
    </AppLayout>
  );
}
