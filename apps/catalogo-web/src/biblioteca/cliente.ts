export class BibliotecaNoDisponibleError extends Error {
  readonly codigo = 'error.biblioteca_no_disponible';
  constructor(url: string, causa?: unknown) {
    super(`No se pudo conectar con la Biblioteca en ${url}. ¿Está corriendo? (apps/biblioteca -> npm start) Causa: ${causa instanceof Error ? causa.message : String(causa)}`);
    this.name = 'BibliotecaNoDisponibleError';
  }
}

export async function obtenerActivoBiblioteca(bibliotecaUrl: string, bibliotecaLlave: string | null, activoId: string): Promise<any> {
  const url = `${bibliotecaUrl.replace(/\/+$/, '')}/activos/${encodeURIComponent(activoId)}`;
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (bibliotecaLlave) headers['X-Cubo-Key'] = bibliotecaLlave;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Biblioteca respondió ${res.status}`);
    }
    const data = await res.json() as any;
    return data.activo ?? data;
  } catch (e) {
    throw new BibliotecaNoDisponibleError(bibliotecaUrl, e);
  }
}
