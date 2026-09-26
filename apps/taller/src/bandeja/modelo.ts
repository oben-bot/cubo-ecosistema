import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { siguienteIdBandeja, transaccion } from '../db/index.ts';
import type { Contexto } from '../contexto.ts';

export interface MedidasMm {
  ancho: number;
  alto: number;
  profundidad?: number | null;
}

export interface Receta {
  constructor: string;
  texto?: string;
  tipografia?: string;
  tamano_mm?: number;
  [key: string]: unknown;
}

export interface EntradaBandeja {
  id: string;
  constructor: string;
  formato: string;
  archivo_ruta: string;
  medidas_mm: MedidasMm | null;
  receta: Receta | null;
  largo_corte_mm: number | null;
  area_mm2: number | null;
  estado: 'pendiente' | 'guardado' | 'descartado';
  creado: string;
  actualizado: string;
}

export interface DatosDeposito {
  archivo: Buffer;
  formato: string;
  medidas_mm: MedidasMm;
  receta: Receta;
  constructor: string;
  largo_corte_mm?: number | null;
  area_mm2?: number | null;
}

export function validarMedidas(medidas: unknown): MedidasMm {
  if (typeof medidas !== 'object' || medidas === null) {
    throw new Error('error.medidas_invalidas');
  }
  const m = medidas as Record<string, unknown>;
  const ancho = Number(m.ancho);
  const alto = Number(m.alto);
  if (!Number.isFinite(ancho) || ancho <= 0 || !Number.isFinite(alto) || alto <= 0) {
    throw new Error('error.medidas_invalidas');
  }
  const profundidad = m.profundidad !== undefined && m.profundidad !== null ? Number(m.profundidad) : null;
  if (profundidad !== null && (!Number.isFinite(profundidad) || profundidad <= 0)) {
    throw new Error('error.medidas_invalidas');
  }
  return {
    ancho,
    alto,
    profundidad: profundidad ?? null,
  };
}

export function listarBandeja(db: DatabaseSync, estado: string = 'pendiente'): EntradaBandeja[] {
  const filas = db
    .prepare('SELECT * FROM bandeja WHERE estado = ? ORDER BY creado DESC')
    .all(estado) as Array<{
    id: string;
    constructor: string;
    formato: string;
    archivo_ruta: string;
    medidas_mm: string | null;
    receta: string | null;
    largo_corte_mm: number | null;
    area_mm2: number | null;
    estado: string;
    creado: string;
    actualizado: string;
  }>;
  return filas.map((f) => ({
    id: f.id,
    constructor: f.constructor,
    formato: f.formato,
    archivo_ruta: f.archivo_ruta,
    medidas_mm: f.medidas_mm ? (JSON.parse(f.medidas_mm) as MedidasMm) : null,
    receta: f.receta ? (JSON.parse(f.receta) as Receta) : null,
    largo_corte_mm: f.largo_corte_mm,
    area_mm2: f.area_mm2,
    estado: f.estado as EntradaBandeja['estado'],
    creado: f.creado,
    actualizado: f.actualizado,
  }));
}

export function obtenerBandeja(db: DatabaseSync, id: string): EntradaBandeja | null {
  const fila = db.prepare('SELECT * FROM bandeja WHERE id = ?').get(id) as
    | {
        id: string;
        constructor: string;
        formato: string;
        archivo_ruta: string;
        medidas_mm: string | null;
        receta: string | null;
        largo_corte_mm: number | null;
        area_mm2: number | null;
        estado: string;
        creado: string;
        actualizado: string;
      }
    | undefined;
  if (!fila) return null;
  return {
    id: fila.id,
    constructor: fila.constructor,
    formato: fila.formato,
    archivo_ruta: fila.archivo_ruta,
    medidas_mm: fila.medidas_mm ? (JSON.parse(fila.medidas_mm) as MedidasMm) : null,
    receta: fila.receta ? (JSON.parse(fila.receta) as Receta) : null,
    largo_corte_mm: fila.largo_corte_mm,
    area_mm2: fila.area_mm2,
    estado: fila.estado as EntradaBandeja['estado'],
    creado: fila.creado,
    actualizado: fila.actualizado,
  };
}

export function depositarEnBandeja(contexto: Contexto, datos: DatosDeposito): EntradaBandeja {
  const { db, config } = contexto;
  const ahora = new Date().toISOString();

  // Validaciones basicas
  if (!Buffer.isBuffer(datos.archivo) || datos.archivo.length === 0) {
    throw new Error('error.archivo_invalido');
  }
  const formato = datos.formato.toLowerCase().trim();
  if (!['svg', 'dxf', 'stl', '3mf'].includes(formato)) {
    throw new Error('error.formato_no_admitido');
  }
  const medidas = validarMedidas(datos.medidas_mm);
  if (!datos.constructor || typeof datos.constructor !== 'string') {
    throw new Error('error.parametro_invalido');
  }

  return transaccion(db, () => {
    const id = siguienteIdBandeja(db);
    const nombreArchivo = `${id}.${formato}`;
    const rutaAbsoluta = path.join(config.rutaBandeja, nombreArchivo);
    fs.writeFileSync(rutaAbsoluta, datos.archivo);

    db.prepare(
      `INSERT INTO bandeja (id, constructor, formato, archivo_ruta, medidas_mm, receta, largo_corte_mm, area_mm2, estado, creado, actualizado)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      id,
      datos.constructor,
      formato,
      nombreArchivo, // guardamos relativo a rutaBandeja
      JSON.stringify(medidas),
      datos.receta ? JSON.stringify(datos.receta) : null,
      datos.largo_corte_mm ?? null,
      datos.area_mm2 ?? null,
      'pendiente',
      ahora,
      ahora,
    );

    const fila = obtenerBandeja(db, id);
    if (!fila) throw new Error('error.servidor');
    return fila;
  });
}

export function borrarArchivoBandeja(config: { rutaBandeja: string }, archivoRuta: string): void {
  const absoluta = path.join(config.rutaBandeja, path.basename(archivoRuta));
  try {
    if (fs.existsSync(absoluta)) fs.unlinkSync(absoluta);
  } catch {}
}

export function descartarBandeja(contexto: Contexto, id: string): void {
  const { db, config } = contexto;
  const entrada = obtenerBandeja(db, id);
  if (!entrada) throw new Error('error.bandeja_no_existe');

  transaccion(db, () => {
    borrarArchivoBandeja(config, entrada.archivo_ruta);
    db.prepare('DELETE FROM bandeja WHERE id = ?').run(id);
  });
}

export function marcarGuardadoYBorrar(contexto: Contexto, id: string): void {
  // Tras guardar en Biblioteca, borramos el temporal (no dejamos huerfanos)
  const { db, config } = contexto;
  const entrada = obtenerBandeja(db, id);
  if (!entrada) throw new Error('error.bandeja_no_existe');

  transaccion(db, () => {
    borrarArchivoBandeja(config, entrada.archivo_ruta);
    db.prepare('DELETE FROM bandeja WHERE id = ?').run(id);
  });
}

export function rutaAbsolutaBandeja(contexto: Contexto, archivoRuta: string): string {
  const absoluta = path.join(contexto.config.rutaBandeja, path.basename(archivoRuta));
  if (!fs.existsSync(absoluta)) throw new Error('error.bandeja_archivo_no_encontrado');
  return absoluta;
}

export function contarBandeja(db: DatabaseSync): { total: number; pendientes: number } {
  const fila = db
    .prepare("SELECT COUNT(*) as total, SUM(estado='pendiente') as pendientes FROM bandeja")
    .get() as { total: number; pendientes: number | null };
  return { total: fila.total, pendientes: fila.pendientes ?? 0 };
}
