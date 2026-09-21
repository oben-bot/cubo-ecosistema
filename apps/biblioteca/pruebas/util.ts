/** Utilidades compartidas por las pruebas automaticas. */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

import { crearContexto, cerrarContexto, type Contexto } from '../src/contexto.ts';
import { cargarConfiguracion, type Configuracion } from '../src/config.ts';
import { construirMultipart } from '../src/http/multipart.ts';
import { codificarPng } from '../src/raster/png.ts';

/** PNG solida de 24x24, con bytes suficientes para pasar el filtro de iconos del ZIP. */
export const PNG_SOLIDO: Buffer = (() => {
  const lado = 64;
  const rgba = new Uint8Array(lado * lado * 4);
  for (let i = 0; i < lado * lado; i += 1) {
    // Patron ruidoso para que el PNG no comprima por debajo del filtro de iconos.
    rgba[i * 4] = (i * 37) & 0xff;
    rgba[i * 4 + 1] = (i * 101) & 0xff;
    rgba[i * 4 + 2] = (i * 61) & 0xff;
    rgba[i * 4 + 3] = 255;
  }
  return codificarPng(lado, lado, rgba);
})();

export const SVG_CAJA = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<rect x="10" y="10" width="80" height="60"/>' +
    '<circle cx="50" cy="40" r="20"/>' +
    '<path d="M10 80 L90 80 L50 95 Z"/></svg>',
);

export const DXF_LINEA = Buffer.from(
  [
    '0', 'SECTION', '2', 'ENTITIES',
    '0', 'LINE', '10', '0', '20', '0', '11', '100', '21', '50',
    '0', 'CIRCLE', '10', '50', '20', '50', '40', '25',
    '0', 'ENDSEC', '0', 'EOF',
  ].join('\n'),
  'utf8',
);

/** PNG rojo minimo (1x1), con bytes magicos validos. */
export const PNG_MINIMA = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlIRFIAAAABAAAAbAQAAAD8lJL6AAAADElEQVR4nGNgYGD4DwABBAEAXVXRPwAAAABJRU5ErkJggg==',
  'base64',
);

export interface Entorno {
  config: Configuracion;
  contexto: Contexto;
  raiz: string;
  limpiar: () => void;
}

export function crearEntornoTemporal(): Entorno {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'bib-'));
  const config = cargarConfiguracion({
    cwd: raiz,
    env: {
      BIBLIOTECA_RUTA: path.join(raiz, 'datos'),
      BIBLIOTECA_PUERTO: String(7200 + (process.pid % 500)),
      BIBLIOTECA_HOST: '127.0.0.1',
      // Miniaturas pequenas en pruebas: suficiente para validar contenido y mas rapido.
      BIBLIOTECA_PREVIEW_PX: '160',
    },
  });
  const contexto = crearContexto(config);
  return {
    config,
    contexto,
    raiz,
    limpiar: () => {
      cerrarContexto(contexto);
      fs.rmSync(raiz, { recursive: true, force: true });
    },
  };
}

export function cuerpoMultipart(
  campos: Array<{ nombre: string; valor?: string; nombreArchivo?: string; tipoContenido?: string; datos?: Buffer }>,
): { boundary: string; cuerpo: Buffer } {
  const boundary = `----prueba${randomUUID().replace(/-/g, '')}`;
  return { boundary, cuerpo: construirMultipart(boundary, campos) };
}

export { construirMultipart };
