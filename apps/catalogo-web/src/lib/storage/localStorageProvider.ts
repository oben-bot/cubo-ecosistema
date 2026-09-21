import { Catalog } from '@/types/catalog';
import { StorageProvider } from './types';

const STORAGE_KEY = 'catalogs';

/**
 * Proveedor de almacenamiento local (localStorage del navegador).
 *
 * IMPORTANTE: esto es solo para desarrollo/demo o para el catálogo
 * personal del propio taller usado desde una sola PC. NO sirve para
 * un producto que otros clientes vayan a usar y compartir con SUS
 * clientes, porque los datos no salen del navegador donde se crearon
 * (ver GoogleDriveProvider para el modo real de producción).
 */
export class LocalStorageProvider implements StorageProvider {
  readonly name = 'Local';

  private readAll(): Catalog[] {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  }

  private writeAll(catalogs: Catalog[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogs));
  }

  async listCatalogs(): Promise<Catalog[]> {
    return this.readAll();
  }

  async getCatalog(id: string): Promise<Catalog | null> {
    return this.readAll().find((c) => c.id === id) || null;
  }

  async createCatalog(catalog: Omit<Catalog, 'id'>): Promise<Catalog> {
    const newCatalog: Catalog = { ...catalog, id: crypto.randomUUID() };
    const all = this.readAll();
    all.push(newCatalog);
    this.writeAll(all);
    return newCatalog;
  }

  async updateCatalog(id: string, catalog: Catalog): Promise<void> {
    const all = this.readAll();
    const idx = all.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Catálogo no encontrado');
    all[idx] = catalog;
    this.writeAll(all);
  }

  async deleteCatalog(id: string): Promise<void> {
    const all = this.readAll().filter((c) => c.id !== id);
    this.writeAll(all);
  }

  async uploadImage(file: File): Promise<string> {
    // En modo local, la imagen se guarda como base64 embebido.
    // Funciona, pero infla el tamaño de localStorage - por eso en
    // producción se usa GoogleDriveProvider en vez de este.
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  getPublicUrl(catalogId: string): string {
    if (typeof window === 'undefined') return `/catalog/${catalogId}`;
    return `${window.location.origin}/catalog/${catalogId}`;
  }
}
