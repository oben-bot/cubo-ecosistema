/** Contexto de ejecucion del modulo: configuracion + base de datos abierta y migrada. */
import * as fs from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import { abrirBaseDatos, migrar } from './db/index.ts';
import type { Configuracion } from './config.ts';
import type { ResultadoMigracion } from './db/index.ts';

export interface Contexto {
  readonly config: Configuracion;
  readonly db: DatabaseSync;
  readonly migracion: ResultadoMigracion;
}

export function crearContexto(config: Configuracion): Contexto {
  fs.mkdirSync(config.rutaBiblioteca, { recursive: true });
  fs.mkdirSync(config.rutaTemporales, { recursive: true });
  const db = abrirBaseDatos(config.rutaBaseDatos);
  const migracion = migrar(db);
  return { config, db, migracion };
}

export function cerrarContexto(contexto: Contexto): void {
  try {
    contexto.db.close();
  } catch {
    // La conexion puede estar ya cerrada; no es un error para el apagado.
  }
}
