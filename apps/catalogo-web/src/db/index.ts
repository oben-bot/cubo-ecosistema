import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Configuracion } from '../config.ts';
import { migrar } from './migraciones.ts';

export const VERSION_ESQUEMA_ACTUAL = 1;

export function abrirBaseDatos(config: Configuracion): DatabaseSync {
  fs.mkdirSync(config.rutaCatalogo, { recursive: true });
  const db = new DatabaseSync(config.rutaBaseDatos);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  migrar(db);
  return db;
}

export function cerrarBaseDatos(db: DatabaseSync): void {
  db.close();
}
