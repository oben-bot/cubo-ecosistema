import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { crearContexto, cerrarContexto, type Contexto } from '../src/contexto.ts';
import { cargarConfiguracion, type Configuracion } from '../src/config.ts';

export interface Entorno {
  config: Configuracion;
  contexto: Contexto;
  raiz: string;
  limpiar: () => void;
}

export function crearEntornoTemporal(): Entorno {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'taller-'));
  const config = cargarConfiguracion({
    cwd: raiz,
    env: {
      TALLER_RUTA: path.join(raiz, 'datos'),
      TALLER_PUERTO: String(7300 + (process.pid % 500)),
      TALLER_HOST: '127.0.0.1',
      TALLER_BIBLIOTECA_URL: 'http://127.0.0.1:7101',
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

export const SVG_SIMPLE = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect x="5" y="5" width="90" height="40"/></svg>',
  'utf8',
);
