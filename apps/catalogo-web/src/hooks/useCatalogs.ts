'use client';

import { useState, useEffect, useCallback } from 'react';
import { Catalog } from '@/types/catalog';
import { useStorageProvider } from '@/lib/storage/useStorageProvider';

function migrarCatalogo(catalog: any): Catalog {
  const migrated = { ...catalog };

  if (!catalog.planType) {
    migrated.planType = 'standard';
    migrated.premiumFeatures = {};
  }

  if (!catalog.businessHours) {
    migrated.businessHours = {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '18:00', closed: false },
      sunday: { open: '09:00', close: '18:00', closed: true },
    };
  }

  if (!catalog.whatsappNumber) {
    migrated.whatsappNumber = catalog.premiumFeatures?.whatsapp?.number || '';
  }

  if (!catalog.generalDiscount) {
    migrated.generalDiscount = undefined;
  }

  return migrated;
}

export const useCatalogs = () => {
  const { provider, isCloudConnected } = useStorageProvider();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarCatalogos = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await provider.listCatalogs();
      const migrados = raw.map(migrarCatalogo);
      setCatalogs(migrados);
    } catch (error) {
      console.error('❌ Error al cargar catálogos:', error);
      setCatalogs([]);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    cargarCatalogos();
  }, [cargarCatalogos]);

  const saveCatalog = async (catalog: Catalog) => {
    try {
      const creado = await provider.createCatalog(catalog);
      setCatalogs((prev) => [...prev, creado]);
      return creado;
    } catch (error) {
      console.error('❌ Error al guardar catálogo:', error);
      throw new Error('No se pudo guardar el catálogo');
    }
  };

  const updateCatalog = async (catalog: Catalog) => {
    await provider.updateCatalog(catalog.id, catalog);
    setCatalogs((prev) => prev.map((c) => (c.id === catalog.id ? catalog : c)));
  };

  const deleteCatalog = async (id: string) => {
    await provider.deleteCatalog(id);
    setCatalogs((prev) => prev.filter((c) => c.id !== id));
  };

  return {
    catalogs,
    loading,
    isCloudConnected,
    storageProviderName: provider.name,
    saveCatalog,
    updateCatalog,
    deleteCatalog,
    getPublicUrl: (id: string) => provider.getPublicUrl(id),
    recargar: cargarCatalogos,
  };
};
