'use client';

import { useCatalogs } from '@/hooks/useCatalogs';
import CatalogList from '@/components/CatalogList';
import CloudConnectionBar from '@/components/CloudConnectionBar';

export default function Home() {
  const { catalogs, deleteCatalog } = useCatalogs();

  return (
    <div className="min-h-screen bg-purple-600">
      <CloudConnectionBar />
      <CatalogList catalogs={catalogs} onDelete={deleteCatalog} />
    </div>
  );
}