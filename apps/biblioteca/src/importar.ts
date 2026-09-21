/**
 * Importacion masiva de una carpeta existente.
 *
 * La carpeta de origen NO se mueve ni se modifica: solo se lee. Cada archivo (o ZIP)
 * genera una ficha propia, guardada con el mismo esquema todo-o-nada del alta.
 * Los duplicados se detectan por sha256 y se reportan sin crear nada.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { crearActivo } from './activos.ts';
import type { Contexto } from './contexto.ts';
import { ErrorDominio, esFormatoAdmitido, formatoDe, nombreDesdeArchivo, type Espacio, type Licencia, type TipoActivo } from './dominio.ts';
import { sha256DeBuffer } from './hash.ts';
import { leerZip } from './zip.ts';

export interface OpcionesImportacion {
  /** Carpeta a importar. Debe ser una ruta absoluta fuera de la biblioteca. */
  ruta: string;
  categoria?: string | null;
  tipo?: TipoActivo | null;
  licencia?: Licencia | null;
  origen?: string | null;
  espacio?: Espacio | null;
  /** Si no se indica categoria, usa el nombre de la carpeta que contiene al archivo. */
  usarCarpetaComoCategoria?: boolean;
}

export interface ElementoInforme {
  ruta: string;
  /** Clave de traduccion del motivo (no texto fijo). */
  motivo: string;
}

export interface NuevoImportado {
  id: string;
  ruta: string;
  nombre: string;
  con_miniatura: boolean;
}

export interface DuplicadoImportado {
  ruta: string;
  sha256: string;
  activo_existente: string | null;
}

export interface InformeImportacion {
  ruta: string;
  escaneados: number;
  nuevos: NuevoImportado[];
  duplicados: DuplicadoImportado[];
  errores: ElementoInforme[];
  omitidos: ElementoInforme[];
  sin_miniatura: number;
  duracion_ms: number;
  informe_truncado: boolean;
}

const MAX_ELEMENTOS_INFORME = 1000;
const MAX_ARCHIVOS_ESCANEO = 50000;
const CARPETAS_IGNORADAS = new Set(['node_modules', '.git', '.svn', '__MACOSX']);

interface Candidato {
  rutaAbsoluta: string;
  rutaRelativa: string;
  tamano: number;
}

function esDentroDe(raiz: string, ruta: string): boolean {
  const relativa = path.relative(path.resolve(raiz), path.resolve(ruta));
  return relativa === '' || (!relativa.startsWith('..') && !path.isAbsolute(relativa));
}

export function escanearCarpeta(raiz: string): Candidato[] {
  const salida: Candidato[] = [];
  const pila: string[] = [raiz];
  while (pila.length > 0) {
    const actual = pila.pop() as string;
    let entradas: fs.Dirent[];
    try {
      entradas = fs.readdirSync(actual, { withFileTypes: true });
    } catch {
      continue; // Carpeta sin permisos: se omite sin detener la importacion.
    }
    for (const entrada of entradas) {
      const completa = path.join(actual, entrada.name);
      if (entrada.isDirectory()) {
        if (CARPETAS_IGNORADAS.has(entrada.name) || entrada.name.startsWith('.')) continue;
        pila.push(completa);
        continue;
      }
      if (!entrada.isFile()) continue;
      if (entrada.name.startsWith('.') || entrada.name.toLowerCase() === 'thumbs.db') continue;
      let tamano = 0;
      try {
        tamano = fs.statSync(completa).size;
      } catch {
        continue;
      }
      salida.push({ rutaAbsoluta: completa, rutaRelativa: path.relative(raiz, completa).split(path.sep).join('/'), tamano });
      if (salida.length > MAX_ARCHIVOS_ESCANEO) {
        throw new ErrorDominio('error.demasiados_archivos', { maximo: MAX_ARCHIVOS_ESCANEO });
      }
    }
  }
  salida.sort((a, b) => a.rutaRelativa.localeCompare(b.rutaRelativa));
  return salida;
}

async function mapaConcurrencia<T, R>(elementos: T[], concurrencia: number, tarea: (elemento: T) => Promise<R>): Promise<R[]> {
  const resultados: R[] = new Array(elementos.length);
  let siguiente = 0;
  const trabajadores = Array.from({ length: Math.max(1, Math.min(concurrencia, elementos.length || 1)) }, async () => {
    while (true) {
      const indice = siguiente;
      siguiente += 1;
      if (indice >= elementos.length) return;
      resultados[indice] = await tarea(elementos[indice]);
    }
  });
  await Promise.all(trabajadores);
  return resultados;
}

function agregar<T>(lista: T[], elemento: T): boolean {
  if (lista.length >= MAX_ELEMENTOS_INFORME) return true;
  lista.push(elemento);
  return false;
}

/** Importa una carpeta completa. Devuelve el informe con nuevos, duplicados, errores y omitidos. */
export async function importarCarpeta(contexto: Contexto, opciones: OpcionesImportacion): Promise<InformeImportacion> {
  const inicio = Date.now();
  const { db, config } = contexto;

  if (typeof opciones.ruta !== 'string' || opciones.ruta.trim().length === 0) {
    throw new ErrorDominio('error.ruta_obligatoria');
  }
  if (!path.isAbsolute(opciones.ruta)) {
    throw new ErrorDominio('error.ruta_no_absoluta');
  }
  const raiz = path.resolve(opciones.ruta);
  if (!fs.existsSync(raiz)) throw new ErrorDominio('error.ruta_no_existe', { ruta: raiz });
  if (!fs.statSync(raiz).isDirectory()) throw new ErrorDominio('error.ruta_no_es_carpeta', { ruta: raiz });
  if (esDentroDe(config.rutaBiblioteca, raiz)) {
    throw new ErrorDominio('error.ruta_dentro_de_biblioteca');
  }

  const candidatos = escanearCarpeta(raiz);
  const informe: InformeImportacion = {
    ruta: raiz,
    escaneados: candidatos.length,
    nuevos: [],
    duplicados: [],
    errores: [],
    omitidos: [],
    sin_miniatura: 0,
    duracion_ms: 0,
    informe_truncado: false,
  };

  // Lectura y huella en paralelo; la escritura en la base es secuencial (una sola conexion).
  const contenidos = await mapaConcurrencia(candidatos, config.concurrenciaImportacion, async (candidato) => {
    if (candidato.tamano > config.limiteSubidaBytes) return null;
    try {
      return await fs.promises.readFile(candidato.rutaAbsoluta);
    } catch {
      return null;
    }
  });

  const hashesVistos = new Set<string>();
  const existeHash = db.prepare('SELECT activo_id FROM archivos WHERE sha256 = ? LIMIT 1');

  for (let i = 0; i < candidatos.length; i += 1) {
    const candidato = candidatos[i];
    const contenido = contenidos[i];
    if (contenido === null || contenido === undefined) {
      if (candidato.tamano > config.limiteSubidaBytes) {
        if (agregar(informe.omitidos, { ruta: candidato.rutaRelativa, motivo: 'motivo.archivo_demasiado_grande' })) informe.informe_truncado = true;
      } else if (agregar(informe.errores, { ruta: candidato.rutaRelativa, motivo: 'motivo.no_se_pudo_leer' })) {
        informe.informe_truncado = true;
      }
      continue;
    }

    const formato = formatoDe(candidato.rutaAbsoluta);
    const usarCarpeta = opciones.usarCarpetaComoCategoria !== false;
    const carpetaContenedora = path.dirname(candidato.rutaRelativa);
    const categoria =
      opciones.categoria ??
      (usarCarpeta && carpetaContenedora !== '.' ? carpetaContenedora.split(/[\\/]/)[0] ?? null : null);

    const metadatos = {
      nombre: nombreDesdeArchivo(path.basename(candidato.rutaAbsoluta)),
      categoria,
      tipo: opciones.tipo ?? undefined,
      licencia: opciones.licencia ?? 'desconocida',
      origen: opciones.origen ?? raiz,
    };

    if (formato !== 'zip' && !esFormatoAdmitido(formato)) {
      if (agregar(informe.omitidos, { ruta: candidato.rutaRelativa, motivo: 'motivo.formato_no_admitido' })) informe.informe_truncado = true;
      continue;
    }

    let hashes: string[] = [];
    try {
      if (formato === 'zip') {
        const entradas = leerZip(contenido, config.limiteSubidaBytes * 8).filter((e) => esFormatoAdmitido(formatoDe(e.nombre)));
        if (entradas.length === 0) {
          if (agregar(informe.omitidos, { ruta: candidato.rutaRelativa, motivo: 'motivo.zip_sin_formatos_admitidos' })) informe.informe_truncado = true;
          continue;
        }
        hashes = entradas.map((e) => sha256DeBuffer(e.datos));
      } else {
        hashes = [sha256DeBuffer(contenido)];
      }
    } catch (error) {
      const motivo = error instanceof Error && error.name === 'ErrorZip' ? 'motivo.zip_invalido' : 'motivo.error_desconocido';
      if (agregar(informe.errores, { ruta: candidato.rutaRelativa, motivo })) informe.informe_truncado = true;
      continue;
    }

    const conocidos = hashes.filter((h) => hashesVistos.has(h) || existeHash.get(h) !== undefined);
    if (conocidos.length === hashes.length) {
      const primero = existeHash.get(hashes[0]) as { activo_id: string } | undefined;
      if (agregar(informe.duplicados, { ruta: candidato.rutaRelativa, sha256: hashes[0], activo_existente: primero?.activo_id ?? null })) {
        informe.informe_truncado = true;
      }
      for (const h of hashes) hashesVistos.add(h);
      continue;
    }

    try {
      const resultado = crearActivo(contexto, {
        metadatos,
        espacio: opciones.espacio ?? 'original',
        archivos: [{ nombre: path.basename(candidato.rutaAbsoluta), datos: contenido }],
      });
      for (const h of hashes) hashesVistos.add(h);
      const conMiniatura = resultado.activo.imagenes.length > 0;
      if (!conMiniatura) informe.sin_miniatura += 1;
      if (agregar(informe.nuevos, { id: resultado.activo.id, ruta: candidato.rutaRelativa, nombre: resultado.activo.nombre, con_miniatura: conMiniatura })) {
        informe.informe_truncado = true;
      }
    } catch (error) {
      const motivo = error instanceof ErrorDominio ? error.codigo : 'motivo.error_desconocido';
      if (agregar(informe.errores, { ruta: candidato.rutaRelativa, motivo })) informe.informe_truncado = true;
    }
  }

  informe.duracion_ms = Date.now() - inicio;
  return informe;
}
