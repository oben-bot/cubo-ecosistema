import { Catalog } from '@/types/catalog';
import { StorageProvider } from './types';

/**
 * Proveedor de almacenamiento en Google Drive del propio usuario.
 *
 * Cómo funciona (modelo "trae tu propia nube"):
 * - Cada catálogo se guarda como UN archivo JSON en una carpeta que la
 *   app crea dentro del Drive del dueño del negocio (nunca en un
 *   servidor nuestro - nosotros no administramos ni vemos sus datos).
 * - Al crear/publicar un catálogo, el archivo se marca como
 *   "cualquiera con el link puede ver" - así el cliente final (quien
 *   compra) puede abrir el catálogo sin necesitar cuenta de Google.
 * - El ID del catálogo ES el ID del archivo en Drive - no necesitamos
 *   ninguna base de datos intermedia para mapear uno con otro.
 *
 * Esta clase NUNCA llama a la API de Google directamente desde el
 * navegador (el Client Secret no debe existir en el navegador) - todo
 * pasa por nuestras rutas /api/drive/*, que sí corren en el servidor
 * y tienen acceso seguro al token de sesión.
 */
export class GoogleDriveProvider implements StorageProvider {
  readonly name = 'Google Drive';

  private async fetchJson(url: string, options?: RequestInit) {
    const res = await fetch(url, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Error al comunicarse con Google Drive');
    }
    return res.json();
  }

  async listCatalogs(): Promise<Catalog[]> {
    const data = await this.fetchJson('/api/drive/catalogs');
    return data.catalogs;
  }

  async getCatalog(id: string): Promise<Catalog | null> {
    try {
      const data = await this.fetchJson(`/api/drive/catalogs/${id}`);
      return data.catalog;
    } catch {
      return null;
    }
  }

  async createCatalog(catalog: Omit<Catalog, 'id'>): Promise<Catalog> {
    const data = await this.fetchJson('/api/drive/catalogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(catalog),
    });
    return data.catalog;
  }

  async updateCatalog(id: string, catalog: Catalog): Promise<void> {
    await this.fetchJson(`/api/drive/catalogs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(catalog),
    });
  }

  async deleteCatalog(id: string): Promise<void> {
    await this.fetchJson(`/api/drive/catalogs/${id}`, { method: 'DELETE' });
  }

  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/drive/upload-image', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('No se pudo subir la imagen a Google Drive');
    const data = await res.json();
    return data.publicUrl;
  }

  getPublicUrl(catalogId: string): string {
    // El catálogo público se sirve desde nuestra propia app (/catalog/[id]),
    // que internamente hace fetch directo y público al archivo en Drive -
    // el cliente final nunca necesita saber que los datos viven en Drive.
    if (typeof window === 'undefined') return `/catalog/${catalogId}`;
    return `${window.location.origin}/catalog/${catalogId}`;
  }
}

/** Construye la URL pública de descarga directa de un archivo de Drive
 *  (funciona sin autenticación siempre que el archivo tenga permiso
 *  "anyone" / "reader" configurado). */
export function driveDirectDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}
