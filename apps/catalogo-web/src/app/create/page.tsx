'use client';

import { useCatalogs } from '@/hooks/useCatalogs';
import CatalogForm from '@/components/CatalogForm';

export default function CreateCatalog() {
  const { saveCatalog } = useCatalogs();

  return (
    <div className="min-h-screen bg-purple-600">
      <CatalogForm onSave={saveCatalog} />
    </div>
  );
}