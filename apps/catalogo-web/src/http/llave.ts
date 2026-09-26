import * as crypto from 'node:crypto';

export const NOMBRE_CABECERA = 'x-cubo-key';
export const NOMBRE_COOKIE = 'cubo_key_catalogo';

export function llaveCoincide(presentada: string | undefined, esperada: string): boolean {
  if (!presentada) return false;
  const a = Buffer.from(presentada);
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function leerCookie(cabecera: string | undefined, nombre: string): string | null {
  if (!cabecera) return null;
  for (const parte of cabecera.split(';')) {
    const [k, ...resto] = parte.trim().split('=');
    if (k === nombre) return decodeURIComponent(resto.join('='));
  }
  return null;
}

export function generarLlave(): string {
  return crypto.randomBytes(32).toString('hex');
}
