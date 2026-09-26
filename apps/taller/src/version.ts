import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIRECTORIO_ACTUAL = path.dirname(fileURLToPath(import.meta.url));

export interface InfoVersion {
  nombre: string;
  version: string;
}

function leer(): InfoVersion {
  const candidatos = [path.join(DIRECTORIO_ACTUAL, '..', 'package.json')];
  for (const candidato of candidatos) {
    try {
      const crudo = fs.readFileSync(candidato, 'utf8');
      const datos = JSON.parse(crudo) as { nombre?: string; name?: string; version?: string };
      if (typeof datos.version === 'string' && datos.version.length > 0) {
        return { nombre: datos.nombre ?? datos.name ?? 'taller', version: datos.version };
      }
    } catch {}
  }
  return { nombre: 'taller', version: '0.0.0-desconocida' };
}

export const INFO_VERSION: InfoVersion = leer();
