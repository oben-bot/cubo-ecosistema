/**
 * Capa de acceso a la base SQLite del Taller.
 * Mismo patron que Biblioteca.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { MIGRACIONES, VERSION_ESQUEMA_ACTUAL, type Migracion } from './migraciones.ts';

export type { Migracion };
export { MIGRACIONES, VERSION_ESQUEMA_ACTUAL };

export interface ResultadoMigracion {
  aplicadas: Migracion[];
  versionActual: number;
}

export function abrirBaseDatos(ruta: string): DatabaseSync {
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  const db = new DatabaseSync(ruta);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  return db;
}

function tablaExiste(db: DatabaseSync, nombre: string): boolean {
  const fila = db
    .prepare('SELECT 1 AS ok FROM sqlite_master WHERE type = ? AND name = ?')
    .get('table', nombre) as { ok?: number } | undefined;
  return fila !== undefined && fila !== null;
}

export function versionesAplicadas(db: DatabaseSync): number[] {
  if (!tablaExiste(db, 'migraciones')) return [];
  const filas = db.prepare('SELECT version FROM migraciones ORDER BY version').all() as Array<{ version: number }>;
  return filas.map((f) => f.version);
}

export function migrar(db: DatabaseSync): ResultadoMigracion {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migraciones (
      version INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      aplicada TEXT NOT NULL
    );
  `);
  const aplicadasPrevias = new Set(versionesAplicadas(db));
  const pendientes = MIGRACIONES.filter((m) => !aplicadasPrevias.has(m.version)).sort((a, b) => a.version - b.version);
  const aplicadas: Migracion[] = [];

  for (const migracion of pendientes) {
    db.exec('BEGIN');
    try {
      db.exec(migracion.sql);
      db
        .prepare('INSERT INTO migraciones (version, nombre, aplicada) VALUES (?, ?, ?)')
        .run(migracion.version, migracion.nombre, new Date().toISOString());
      db.exec('COMMIT');
      aplicadas.push(migracion);
    } catch (error) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Se propaga el error original.
      }
      throw error;
    }
  }
  return { aplicadas, versionActual: versionesAplicadas(db).at(-1) ?? 0 };
}

export function transaccion<T>(db: DatabaseSync, cuerpo: () => T): T {
  const contador = contadores.get(db) ?? 0;
  if (contador > 0) {
    const nombre = `sp_${contador}_${Math.random().toString(36).slice(2, 8)}`;
    db.exec(`SAVEPOINT ${nombre}`);
    contadores.set(db, contador + 1);
    try {
      const resultado = cuerpo();
      db.exec(`RELEASE ${nombre}`);
      contadores.set(db, contador);
      return resultado;
    } catch (error) {
      try {
        db.exec(`ROLLBACK TO ${nombre}`);
        db.exec(`RELEASE ${nombre}`);
      } catch {}
      contadores.set(db, contador);
      throw error;
    }
  }
  contadores.set(db, 1);
  db.exec('BEGIN');
  try {
    const resultado = cuerpo();
    db.exec('COMMIT');
    contadores.set(db, 0);
    return resultado;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {}
    contadores.set(db, 0);
    throw error;
  }
}

const contadores = new WeakMap<DatabaseSync, number>();

export function siguienteIdBandeja(db: DatabaseSync): string {
  const fila = db
    .prepare("UPDATE secuencias SET valor = valor + 1 WHERE clave = 'bandeja' RETURNING valor")
    .get() as { valor?: number } | undefined;
  if (fila === undefined || fila === null || typeof fila.valor !== 'number') {
    throw new Error('No se pudo reservar un identificador de bandeja.');
  }
  return `ban_${String(fila.valor).padStart(6, '0')}`;
}
