/** Calculo de huellas sha256 (deteccion de duplicados y verificacion de integridad). */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

export function sha256DeBuffer(datos: Buffer | Uint8Array): string {
  return createHash('sha256').update(datos).digest('hex');
}

/** sha256 de un archivo, leyendolo por bloques para no cargar archivos grandes en memoria. */
export function sha256DeArchivo(ruta: string): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const hash = createHash('sha256');
    const flujo = createReadStream(ruta, { highWaterMark: 1024 * 1024 });
    flujo.on('data', (bloque) => hash.update(bloque));
    flujo.on('end', () => resolver(hash.digest('hex')));
    flujo.on('error', rechazar);
  });
}
