/**
 * Codificador PNG minimo (sin dependencias nativas).
 *
 * Se usa para las capturas generadas del diseno: asi la Biblioteca funciona en Windows,
 * Linux y macOS sin binarios precompilados. Formato: 8 bits por canal, RGBA, sin entrelazado.
 */
import { deflateSync } from 'node:zlib';

const TABLA_CRC: number[] = (() => {
  const tabla: number[] = new Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[n] = c >>> 0;
  }
  return tabla;
})();

function crc32(datos: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i += 1) {
    c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function bloque(tipo: string, contenido: Buffer): Buffer {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(contenido.length, 0);
  const tipoBuf = Buffer.from(tipo, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tipoBuf, contenido])), 0);
  return Buffer.concat([largo, tipoBuf, contenido, crc]);
}

/**
 * Convierte un buffer RGBA (4 bytes por pixel) en un PNG.
 * Lanza si el tamano no coincide con ancho * alto * 4.
 */
export function codificarPng(ancho: number, alto: number, rgba: Uint8Array | Uint8ClampedArray): Buffer {
  if (!Number.isInteger(ancho) || !Number.isInteger(alto) || ancho <= 0 || alto <= 0) {
    throw new Error('Dimensiones de imagen invalidas.');
  }
  if (rgba.length !== ancho * alto * 4) {
    throw new Error(`El buffer RGBA no coincide con ${ancho}x${alto}.`);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr.writeUInt8(8, 8); // profundidad de bits
  ihdr.writeUInt8(6, 9); // tipo de color: RGBA
  ihdr.writeUInt8(0, 10); // compresion
  ihdr.writeUInt8(0, 11); // filtro
  ihdr.writeUInt8(0, 12); // sin entrelazado

  // Cada fila lleva un byte de filtro (0 = ninguno) antes de los datos.
  const crudo = Buffer.alloc((ancho * 4 + 1) * alto);
  let posicion = 0;
  for (let y = 0; y < alto; y += 1) {
    crudo[posicion] = 0;
    posicion += 1;
    const inicio = y * ancho * 4;
    crudo.set(rgba.subarray(inicio, inicio + ancho * 4), posicion);
    posicion += ancho * 4;
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloque('IHDR', ihdr),
    bloque('IDAT', deflateSync(crudo, { level: 6 })),
    bloque('IEND', Buffer.alloc(0)),
  ]);
}

/** Firma PNG: sirve para comprobar en pruebas que lo generado es un PNG de verdad. */
export const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function esPng(datos: Buffer): boolean {
  return datos.length > 24 && datos.subarray(0, 8).equals(FIRMA_PNG);
}

/** Lee ancho y alto del IHDR de un PNG; devuelve null si no es un PNG valido. */
export function dimensionesPng(datos: Buffer): { ancho: number; alto: number } | null {
  if (!esPng(datos)) return null;
  if (datos.subarray(12, 16).toString('ascii') !== 'IHDR') return null;
  return { ancho: datos.readUInt32BE(16), alto: datos.readUInt32BE(20) };
}
