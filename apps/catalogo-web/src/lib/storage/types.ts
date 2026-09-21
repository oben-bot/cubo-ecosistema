import { Catalog } from '@/types/catalog';

/**
 * Interfaz que debe cumplir cualquier proveedor de almacenamiento
 * (localStorage para modo local/demo, Google Drive para producción, etc.)
 *
 * Regla de diseño: el resto de la app (componentes, hooks) NUNCA debe
 * saber en dónde se guardan los datos - solo habla con esta interfaz.
 * Así se puede agregar Dropbox u otro proveedor después sin tocar nada más.
 */
export interface StorageProvider {
  /** Nombre del proveedor, para mostrar en la UI (ej. "Local", "Google Drive") */
  readonly name: string;

  /** Lista todos los catálogos del usuario actual */
  listCatalogs(): Promise<Catalog[]>;

  /** Obtiene un catálogo por su id */
  getCatalog(id: string): Promise<Catalog | null>;

  /** Crea un catálogo nuevo. Devuelve el catálogo con su id asignado. */
  createCatalog(catalog: Omit<Catalog, 'id'>): Promise<Catalog>;

  /** Actualiza un catálogo existente */
  updateCatalog(id: string, catalog: Catalog): Promise<void>;

  /** Elimina un catálogo */
  deleteCatalog(id: string): Promise<void>;

  /**
   * Sube una imagen y devuelve una URL pública para usarla en el catálogo.
   * (En el proveedor local, esto puede devolver un data-URL en base64.)
   */
  uploadImage(file: File): Promise<string>;

  /** URL pública para compartir el catálogo con clientes (sin necesidad de login) */
  getPublicUrl(catalogId: string): string;
}
