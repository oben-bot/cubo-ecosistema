import type { DatabaseSync } from 'node:sqlite';
import type { Configuracion } from './config.ts';
import { abrirBaseDatos } from './db/index.ts';

export interface Contexto {
  config: Configuracion;
  db: DatabaseSync;
}

export function crearContexto(config: Configuracion): Contexto {
  const db = abrirBaseDatos(config);
  return { config, db };
}
