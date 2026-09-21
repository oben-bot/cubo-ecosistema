/** Utilidades de rutas y nombres de archivo: nada de rutas escritas a mano, todo saneado. */
import * as path from 'node:path';

/** Convierte un texto en un nombre de carpeta seguro y portable (minusculas, sin acentos). */
export function slug(texto: string): string {
  const sinAcentos = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const limpio = sinAcentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return limpio.length > 0 ? limpio : 'sin-categoria';
}

/**
 * Sanea un nombre de archivo: quita separadores, caracteres de control y recorridos
 * relativos. Sirve tanto para lo que sube el usuario como para lo que viene dentro de un ZIP.
 */
export function nombreSeguro(nombre: string, maximo = 180): string {
  const soloBase = String(nombre)
    .replace(/\\/g, '/')
    .split('/')
    .filter((parte) => parte !== '.' && parte !== '..' && parte.trim().length > 0)
    .pop();
  let limpio = (soloBase ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  if (limpio.startsWith('.')) limpio = limpio.slice(1);
  if (limpio.length === 0) limpio = 'archivo';
  const punto = limpio.lastIndexOf('.');
  if (punto > 0 && limpio.length - punto > 6) {
    // Extension sospechosamente larga: se trata como parte del nombre.
    limpio = limpio.slice(0, maximo);
  } else if (limpio.length > maximo) {
    const extension = punto > 0 ? limpio.slice(punto) : '';
    limpio = limpio.slice(0, Math.max(1, maximo - extension.length)) + extension;
  }
  return limpio;
}

/** Resuelve una ruta relativa y garantiza que queda dentro de la raiz indicada. */
export function rutaDentroDe(raiz: string, relativa: string): string {
  const raizAbsoluta = path.resolve(raiz);
  const destino = path.resolve(raizAbsoluta, relativa);
  const conSeparador = raizAbsoluta.endsWith(path.sep) ? raizAbsoluta : raizAbsoluta + path.sep;
  if (destino !== raizAbsoluta && !destino.startsWith(conSeparador)) {
    throw new Error(`La ruta ${relativa} sale de la carpeta de la biblioteca.`);
  }
  return destino;
}

/** Ruta relativa (con separadores '/') de un archivo dentro de la raiz de la biblioteca. */
export function rutaRelativa(raiz: string, absoluta: string): string {
  const relativa = path.relative(path.resolve(raiz), path.resolve(absoluta));
  return relativa.split(path.sep).join('/');
}

/**
 * Nombre unico dentro de un conjunto: si `nombre` ya esta usado, agrega un sufijo numerico
 * antes de la extension.
 */
export function nombreUnico(nombre: string, usados: Set<string>): string {
  if (!usados.has(nombre.toLowerCase())) {
    usados.add(nombre.toLowerCase());
    return nombre;
  }
  const punto = nombre.lastIndexOf('.');
  const base = punto > 0 ? nombre.slice(0, punto) : nombre;
  const extension = punto > 0 ? nombre.slice(punto) : '';
  for (let i = 2; i < 10000; i += 1) {
    const candidato = `${base}-${i}${extension}`;
    if (!usados.has(candidato.toLowerCase())) {
      usados.add(candidato.toLowerCase());
      return candidato;
    }
  }
  throw new Error('No se pudo generar un nombre de archivo unico.');
}
