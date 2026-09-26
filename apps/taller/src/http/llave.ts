/**
 * Llave local X-Cubo-Key (contrato ARQUITECTURA.md seccion 2).
 */
import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const NOMBRE_CABECERA = 'x-cubo-key';
export const NOMBRE_COOKIE = 'cubo_llave';

export interface LlaveLocal {
  llave: string;
  generada: boolean;
  ruta: string | null;
}

export function cargarOGenerarLlave(rutaLlave: string, llaveDeConfiguracion: string | null): LlaveLocal {
  if (llaveDeConfiguracion && llaveDeConfiguracion.trim().length > 0) {
    return { llave: llaveDeConfiguracion.trim(), generada: false, ruta: null };
  }
  try {
    if (fs.existsSync(rutaLlave)) {
      const existente = fs.readFileSync(rutaLlave, 'utf8').trim();
      if (existente.length >= 16) return { llave: existente, generada: false, ruta: rutaLlave };
    }
  } catch {
    // Se genera una nueva si no se puede leer.
  }
  const llave = randomBytes(24).toString('hex');
  try {
    fs.mkdirSync(path.dirname(rutaLlave), { recursive: true });
    fs.writeFileSync(rutaLlave, `${llave}\n`, { mode: 0o600 });
    try {
      fs.chmodSync(rutaLlave, 0o600);
    } catch {}
    return { llave, generada: true, ruta: rutaLlave };
  } catch {
    return { llave, generada: true, ruta: null };
  }
}

export function llaveCoincide(recibida: string | undefined, esperada: string): boolean {
  if (typeof recibida !== 'string' || recibida.length !== esperada.length) return false;
  let diferencia = 0;
  for (let i = 0; i < esperada.length; i += 1) {
    diferencia |= recibida.charCodeAt(i) ^ esperada.charCodeAt(i);
  }
  return diferencia === 0;
}

export function leerCookie(cabecera: string | undefined, nombre: string): string | null {
  if (!cabecera) return null;
  for (const trozo of cabecera.split(';')) {
    const igual = trozo.indexOf('=');
    if (igual < 0) continue;
    if (trozo.slice(0, igual).trim() === nombre) return decodeURIComponent(trozo.slice(igual + 1).trim());
  }
  return null;
}
