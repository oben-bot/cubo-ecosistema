/**
 * Busqueda por palabra clave o producto.
 *
 * Combina el indice FTS5 (busqueda por palabras, con prefijos y sin distinguir acentos)
 * con una comprobacion por subcadena sobre nombre y categoria, para que tambien encuentre
 * fragmentos internos ("12mm", "v2"). Devuelve los datos minimos para pintar la cuadricula
 * de miniaturas, incluida la URL de la miniatura de cada ficha.
 */
import type { Contexto } from './contexto.ts';
import { ESPACIOS, LICENCIAS, TIPOS_ACTIVO, type Espacio, type Licencia, type TipoActivo } from './dominio.ts';

export interface FiltrosBusqueda {
  q?: string;
  tipo?: TipoActivo | string;
  espacio?: Espacio | string;
  categoria?: string;
  licencia?: Licencia | string;
  vendible_digital?: boolean;
  limite?: number;
  offset?: number;
}

export interface ResumenActivo {
  id: string;
  nombre: string;
  tipo: TipoActivo;
  espacio: Espacio;
  original_id: string | null;
  categoria: string | null;
  licencia: Licencia;
  vendible_digital: boolean;
  formato_principal: string | null;
  miniatura: string | null;
  creado: string;
}

export interface ResultadoBusqueda {
  total: number;
  limite: number;
  offset: number;
  activos: ResumenActivo[];
}

export const LIMITE_MAXIMO = 200;
export const LIMITE_POR_DEFECTO = 48;

/** Convierte texto libre en una expresion MATCH de FTS5 (prefijos, sin caracteres especiales). */
export function expresionFts(consulta: string): string | null {
  const tokens = consulta
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .slice(0, 12);
  if (tokens.length === 0) return null;
  return tokens.map((token) => `"${token.replace(/"/g, '')}"*`).join(' ');
}

function mapearFila(fila: Record<string, unknown>): ResumenActivo {
  const id = String(fila.id);
  const imagen = fila.imagen === null || fila.imagen === undefined ? null : String(fila.imagen);
  return {
    id,
    nombre: String(fila.nombre),
    tipo: fila.tipo as TipoActivo,
    espacio: fila.espacio as Espacio,
    original_id: fila.original_id === null || fila.original_id === undefined ? null : String(fila.original_id),
    categoria: fila.categoria === null || fila.categoria === undefined ? null : String(fila.categoria),
    licencia: fila.licencia as Licencia,
    vendible_digital: fila.vendible_digital === 1,
    formato_principal: fila.formato === null || fila.formato === undefined ? null : String(fila.formato),
    miniatura: imagen === null ? null : `/activos/${encodeURIComponent(id)}/miniatura`,
    creado: String(fila.creado),
  };
}

export function buscar(contexto: Contexto, filtros: FiltrosBusqueda = {}): ResultadoBusqueda {
  const { db } = contexto;
  const limite = Math.max(1, Math.min(LIMITE_MAXIMO, Math.trunc(filtros.limite ?? LIMITE_POR_DEFECTO)));
  const offset = Math.max(0, Math.trunc(filtros.offset ?? 0));

  const condiciones: string[] = [];
  // Solo los filtros: el limite y el desplazamiento se agregan en la consulta paginada,
  // porque SQLite rechaza parametros con nombre que la sentencia no usa.
  const parametrosDeFiltro: Record<string, string | number> = {};

  const consulta = (filtros.q ?? '').trim();
  const fts = consulta.length > 0 ? expresionFts(consulta) : null;
  if (consulta.length > 0) {
    if (fts) {
      condiciones.push(
        `(a.id IN (SELECT activo_id FROM activos_fts WHERE activos_fts MATCH :match)
          OR a.nombre LIKE :subcadena
          OR IFNULL(a.categoria,'') LIKE :subcadena)`,
      );
      parametrosDeFiltro.match = fts;
      parametrosDeFiltro.subcadena = `%${consulta.replace(/[%_]/g, ' ')}%`;
    } else {
      condiciones.push(`(a.nombre LIKE :subcadena OR IFNULL(a.categoria,'') LIKE :subcadena)`);
      parametrosDeFiltro.subcadena = `%${consulta.replace(/[%_]/g, ' ')}%`;
    }
  }
  if (filtros.tipo !== undefined && filtros.tipo !== '') {
    if (!(TIPOS_ACTIVO as readonly string[]).includes(String(filtros.tipo))) {
      return { total: 0, limite, offset, activos: [] };
    }
    condiciones.push('a.tipo = :tipo');
    parametrosDeFiltro.tipo = String(filtros.tipo);
  }
  if (filtros.espacio !== undefined && filtros.espacio !== '') {
    if (!(ESPACIOS as readonly string[]).includes(String(filtros.espacio))) {
      return { total: 0, limite, offset, activos: [] };
    }
    condiciones.push('a.espacio = :espacio');
    parametrosDeFiltro.espacio = String(filtros.espacio);
  }
  if (filtros.categoria !== undefined && filtros.categoria !== '') {
    condiciones.push('a.categoria = :categoria');
    parametrosDeFiltro.categoria = String(filtros.categoria);
  }
  if (filtros.licencia !== undefined && filtros.licencia !== '') {
    if (!(LICENCIAS as readonly string[]).includes(String(filtros.licencia))) {
      return { total: 0, limite, offset, activos: [] };
    }
    condiciones.push('a.licencia = :licencia');
    parametrosDeFiltro.licencia = String(filtros.licencia);
  }
  if (filtros.vendible_digital !== undefined) {
    condiciones.push('a.vendible_digital = :vendible');
    parametrosDeFiltro.vendible = filtros.vendible_digital ? 1 : 0;
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  const consultaSql = `
    SELECT a.id, a.nombre, a.tipo, a.espacio, a.original_id, a.categoria, a.licencia,
           a.vendible_digital, a.creado,
           (SELECT i.ruta_relativa FROM imagenes i WHERE i.activo_id = a.id ORDER BY i.posicion, i.id LIMIT 1) AS imagen,
           (SELECT f.formato FROM archivos f WHERE f.activo_id = a.id ORDER BY f.posicion, f.id LIMIT 1) AS formato
    FROM activos a
    ${where}
  `;

  const total = (
    db.prepare(`SELECT COUNT(*) AS n FROM activos a ${where}`).get(parametrosDeFiltro) as { n: number }
  ).n;

  const filas = db
    .prepare(`${consultaSql} ORDER BY a.nombre COLLATE NOCASE, a.id LIMIT :limite OFFSET :offset`)
    .all({ ...parametrosDeFiltro, limite, offset }) as Array<Record<string, unknown>>;

  return { total, limite, offset, activos: filas.map(mapearFila) };
}

/** Lista de categorias con su numero de activos, para los filtros de la interfaz. */
export function listarCategorias(contexto: Contexto): Array<{ categoria: string; total: number }> {
  const filas = contexto.db
    .prepare("SELECT IFNULL(categoria,'') AS categoria, COUNT(*) AS total FROM activos GROUP BY categoria ORDER BY categoria COLLATE NOCASE")
    .all() as Array<{ categoria: string; total: number }>;
  return filas.map((f) => ({ categoria: f.categoria, total: f.total }));
}
