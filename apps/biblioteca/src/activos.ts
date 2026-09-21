/**
 * Ciclo de vida de una ficha: alta (todo o nada), version de trabajo, edicion de
 * metadatos y lectura de la ficha completa.
 *
 * Alta segura: los archivos se escriben primero en una carpeta temporal; la base se
 * escribe en una transaccion; el movimiento al destino ocurre dentro de esa transaccion.
 * Si algo falla, se revierte la base y se borra todo lo escrito en disco.
 */
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

import type { Configuracion } from './config.ts';
import type { Contexto } from './contexto.ts';
import {
  ErrorDominio,
  esFormatoAdmitido,
  esImagen,
  formatoDe,
  nombreDesdeArchivo,
  textoBusqueda,
  validarEnlaceOriginal,
  validarMetadatos,
  validarVentaDigital,
  type Activo,
  type Espacio,
  type ImagenActivo,
  type Licencia,
  type MedidasMm,
  type TipoActivo,
  type UbicacionAlmacenActivo,
} from './dominio.ts';
import { transaccion, siguienteIdActivo } from './db/index.ts';
import { sha256DeArchivo, sha256DeBuffer } from './hash.ts';
import { decidirPreview } from './preview.ts';
import { nombreSeguro, nombreUnico, rutaDentroDe, rutaRelativa, slug } from './rutas.ts';
import { leerZip, type EntradaZip } from './zip.ts';

export interface ArchivoEntrada {
  nombre: string;
  datos: Buffer;
}

export interface DatosAlta {
  metadatos: Record<string, unknown>;
  espacio?: Espacio;
  original_id?: string | null;
  archivos: ArchivoEntrada[];
  imagen?: ArchivoEntrada | null;
}

/** Puntos donde las pruebas pueden forzar un fallo para comprobar el todo-o-nada. */
export type PuntoDeFallo = 'tras_temporal' | 'tras_db' | 'tras_mover';

export interface OpcionesAlta {
  /** Solo pruebas: fuerza un fallo en un punto concreto del alta. */
  falloInyectado?: PuntoDeFallo;
  /** Solo uso interno: el flujo de "trabajo" copia un archivo que ya existe en la biblioteca. */
  omitirChequeoDuplicados?: boolean;
}

export interface ResultadoAlta {
  activo: Activo;
  avisos: string[];
}

interface ArchivoPreparado {
  nombre: string;
  datos: Buffer;
  formato: string;
  sha256: string;
  desdeZip: boolean;
}

const MODO_SOLO_LECTURA = 0o444;
const MODO_ESCRITURA = 0o644;

function borrarRecursivo(ruta: string): void {
  try {
    fs.rmSync(ruta, { recursive: true, force: true, maxRetries: 3, retryDelay: 20 });
  } catch {
    // El borrado de limpieza no debe tapar el error original.
  }
}

/** Quita el atributo de solo lectura para poder borrar o reescribir durante una limpieza. */
function hacerEscribible(ruta: string): void {
  try {
    const estado = fs.statSync(ruta);
    if (estado.isDirectory()) {
      for (const entrada of fs.readdirSync(ruta)) hacerEscribible(path.join(ruta, entrada));
      // Las carpetas necesitan el bit de ejecucion para poder vaciarse.
      fs.chmodSync(ruta, 0o755);
    } else {
      fs.chmodSync(ruta, MODO_ESCRITURA);
    }
  } catch {
    // Ignorado: es limpieza.
  }
}

export function borrarCarpeta(ruta: string): void {
  hacerEscribible(ruta);
  borrarRecursivo(ruta);
}

function espacioDe(datos: DatosAlta): Espacio {
  const crudo = datos.espacio ?? 'original';
  if (crudo !== 'original' && crudo !== 'trabajo') throw new ErrorDominio('error.espacio_invalido');
  return crudo;
}

function prepararArchivos(datos: DatosAlta, limiteZipBytes: number): ArchivoPreparado[] {
  if (!Array.isArray(datos.archivos) || datos.archivos.length === 0) {
    throw new ErrorDominio('error.alta_sin_archivos');
  }
  const preparados: ArchivoPreparado[] = [];
  const usados = new Set<string>();

  const agregar = (nombreCrudo: string, contenido: Buffer, desdeZip: boolean): void => {
    const nombre = nombreUnico(nombreSeguro(nombreCrudo), usados);
    const formato = formatoDe(nombre);
    if (!esFormatoAdmitido(formato)) {
      throw new ErrorDominio('error.formato_no_admitido', { formato: formato || 'desconocido', archivo: nombre });
    }
    if (contenido.length === 0) {
      throw new ErrorDominio('error.archivo_vacio', { archivo: nombre });
    }
    preparados.push({ nombre, datos: contenido, formato, sha256: sha256DeBuffer(contenido), desdeZip });
  };

  for (const archivo of datos.archivos) {
    if (!archivo || typeof archivo.nombre !== 'string' || !Buffer.isBuffer(archivo.datos)) {
      throw new ErrorDominio('error.archivo_invalido');
    }
    if (formatoDe(archivo.nombre) === 'zip') {
      const entradas: EntradaZip[] = leerZip(archivo.datos, limiteZipBytes);
      if (entradas.length === 0) throw new ErrorDominio('error.zip_sin_archivos');
      for (const entrada of entradas) {
        if (!esFormatoAdmitido(formatoDe(entrada.nombre))) continue; // se listan como omitidos en el informe
        agregar(entrada.nombre, entrada.datos, true);
      }
      if (!preparados.some((p) => p.desdeZip)) throw new ErrorDominio('error.zip_sin_formatos_admitidos');
      continue;
    }
    agregar(archivo.nombre, archivo.datos, false);
  }
  return preparados;
}

function buscarDuplicado(db: DatabaseSync, sha256: string): { activo_id: string } | undefined {
  return db.prepare('SELECT activo_id FROM archivos WHERE sha256 = ? LIMIT 1').get(sha256) as
    | { activo_id: string }
    | undefined;
}

export interface FilaActivo {
  id: string;
  tipo: TipoActivo;
  espacio: Espacio;
  original_id: string | null;
  nombre: string;
  categoria: string | null;
  material: string | null;
  ancho_mm: number | null;
  alto_mm: number | null;
  profundidad_mm: number | null;
  origen: string;
  licencia: Licencia;
  vendible_digital: number;
  receta: string | null;
  ubicacion_almacen: UbicacionAlmacenActivo;
  notas: string | null;
  creado: string;
  actualizado: string;
}

export function filaAActivo(db: DatabaseSync, fila: FilaActivo): Activo {
  const etiquetas = (
    db.prepare('SELECT etiqueta FROM etiquetas WHERE activo_id = ? ORDER BY etiqueta').all(fila.id) as Array<{ etiqueta: string }>
  ).map((f) => f.etiqueta);
  const archivos = (
    db
      .prepare('SELECT ruta_relativa, formato, sha256, tamano FROM archivos WHERE activo_id = ? ORDER BY posicion, id')
      .all(fila.id) as Array<{ ruta_relativa: string; formato: string; sha256: string; tamano: number }>
  ).map((f) => ({
    ruta_relativa: f.ruta_relativa,
    formato: f.formato,
    sha256: f.sha256,
    tamano: f.tamano,
  }));
  const imagenes = (
    db
      .prepare('SELECT ruta_relativa, origen_imagen FROM imagenes WHERE activo_id = ? ORDER BY posicion, id')
      .all(fila.id) as Array<{ ruta_relativa: string; origen_imagen: ImagenActivo['origen_imagen'] }>
  ).map((f) => ({ ruta_relativa: f.ruta_relativa, origen_imagen: f.origen_imagen }));

  const medidas_mm: MedidasMm = {
    ancho: fila.ancho_mm ?? null,
    alto: fila.alto_mm ?? null,
    profundidad: fila.profundidad_mm ?? null,
  };
  return {
    id: fila.id,
    tipo: fila.tipo,
    espacio: fila.espacio,
    original_id: fila.original_id ?? null,
    nombre: fila.nombre,
    categoria: fila.categoria ?? null,
    etiquetas,
    medidas_mm,
    material: fila.material ?? null,
    archivos,
    imagenes,
    origen: fila.origen,
    licencia: fila.licencia,
    vendible_digital: fila.vendible_digital === 1,
    receta: fila.receta === null ? null : (JSON.parse(fila.receta) as unknown),
    ubicacion_almacen: fila.ubicacion_almacen,
    notas: fila.notas ?? null,
    creado: fila.creado,
    actualizado: fila.actualizado,
  };
}

export function obtenerFilaActivo(db: DatabaseSync, id: string): FilaActivo | null {
  const fila = db.prepare('SELECT * FROM activos WHERE id = ?').get(id) as FilaActivo | undefined;
  return fila ?? null;
}

export function obtenerActivo(db: DatabaseSync, id: string): Activo | null {
  const fila = obtenerFilaActivo(db, id);
  return fila ? filaAActivo(db, fila) : null;
}

/** Alta de un archivo o ZIP: guarda todo o nada. */
export function crearActivo(contexto: Contexto, datos: DatosAlta, opciones: OpcionesAlta = {}): ResultadoAlta {
  const { db, config } = contexto;
  const espacio = espacioDe(datos);
  const originalId = datos.original_id ?? null;
  validarEnlaceOriginal(espacio, originalId);

  if (originalId) {
    const original = obtenerFilaActivo(db, originalId);
    if (!original) throw new ErrorDominio('error.original_no_existe', { original_id: originalId });
    if (original.espacio !== 'original') throw new ErrorDominio('error.original_invalido', { original_id: originalId });
  }

  const metadatos = validarMetadatos(datos.metadatos ?? {}, { ubicacionPorDefecto: config.ubicacionAlmacen });
  const nombre = metadatos.nombre ?? nombreDesdeArchivo(datos.archivos?.[0]?.nombre ?? '');
  const categoria = metadatos.categoria ?? null;
  const etiquetas = metadatos.etiquetas ?? [];

  const preparados = prepararArchivos(datos, config.limiteSubidaBytes * 8);

  if (!opciones.omitirChequeoDuplicados) {
    for (const preparado of preparados) {
      const existente = buscarDuplicado(db, preparado.sha256);
      if (existente) {
        throw new ErrorDominio('error.archivo_duplicado', {
          sha256: preparado.sha256,
          activo_existente: existente.activo_id,
        });
      }
    }
  }

  // Tipo final: el que indica el usuario o el inferido del archivo principal.
  const tipoFinal = metadatos.tipo ?? tipoDesdeFormato(preparados[0]?.formato ?? '');

  const { preview, avisos } = decidirPreview({
    imagenSubida: datos.imagen ? { datos: datos.imagen.datos, nombre: datos.imagen.nombre } : null,
    entradasZip: preparados
      .filter((p) => p.desdeZip && esImagen(p.formato))
      .map((p) => ({ rutaOriginal: p.nombre, nombre: p.nombre, datos: p.datos })),
    archivosParaCaptura: preparados.map((p) => ({ nombre: p.nombre, formato: p.formato, datos: p.datos })),
    espacio,
    ladoPreview: config.previewPx,
  });

  const ahora = new Date().toISOString();
  const temporal = path.join(config.rutaTemporales, randomUUID());
  let destino: string | null = null;
  let movido = false;

  try {
    fs.mkdirSync(temporal, { recursive: true });
    for (const preparado of preparados) {
      fs.writeFileSync(path.join(temporal, preparado.nombre), preparado.datos);
    }
    const nombrePreview = preview ? nombreUnico(`miniatura.${preview.extension}`, new Set(preparados.map((p) => p.nombre.toLowerCase()))) : null;
    if (preview && nombrePreview) fs.writeFileSync(path.join(temporal, nombrePreview), preview.datos);

    if (opciones.falloInyectado === 'tras_temporal') {
      throw new Error('fallo inyectado tras escribir la carpeta temporal');
    }

    const activo = transaccion(db, (): Activo => {
      const id = siguienteIdActivo(db);
      const carpeta = slug(categoria ?? 'sin-categoria');
      const relativaCarpeta = path.posix.join(carpeta, id);
      destino = rutaDentroDe(config.rutaBiblioteca, relativaCarpeta);

      db.prepare(
        `INSERT INTO activos (
           id, tipo, espacio, original_id, nombre, categoria, material,
           ancho_mm, alto_mm, profundidad_mm, origen, licencia, vendible_digital,
           receta, ubicacion_almacen, notas, creado, actualizado
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ).run(
        id,
        tipoFinal,
        espacio,
        originalId,
        nombre,
        categoria,
        metadatos.material ?? null,
        metadatos.medidas_mm?.ancho ?? null,
        metadatos.medidas_mm?.alto ?? null,
        metadatos.medidas_mm?.profundidad ?? null,
        metadatos.origen ?? '',
        metadatos.licencia ?? 'desconocida',
        metadatos.vendible_digital ? 1 : 0,
        metadatos.receta ?? null,
        metadatos.ubicacion_almacen ?? config.ubicacionAlmacen,
        metadatos.notas ?? null,
        ahora,
        ahora,
      );

      const insertarArchivo = db.prepare(
        'INSERT INTO archivos (activo_id, ruta_relativa, formato, tamano, sha256, posicion) VALUES (?,?,?,?,?,?)',
      );
      preparados.forEach((preparado, indice) => {
        insertarArchivo.run(
          id,
          path.posix.join(relativaCarpeta, preparado.nombre),
          preparado.formato,
          preparado.datos.length,
          preparado.sha256,
          indice,
        );
      });

      if (preview) {
        // Si la imagen elegida ya es uno de los archivos guardados, se reutiliza su ruta
        // en lugar de duplicar el archivo.
        const desdeZip = preview.origen === 'zip';
        const reutilizada = desdeZip
          ? preparados.find((p) => p.desdeZip && sha256DeBuffer(p.datos) === sha256DeBuffer(preview.datos))
          : undefined;
        const rutaImagen = reutilizada
          ? path.posix.join(relativaCarpeta, reutilizada.nombre)
          : path.posix.join(relativaCarpeta, nombrePreview ?? `miniatura.${preview.extension}`);
        db.prepare('INSERT INTO imagenes (activo_id, ruta_relativa, origen_imagen, posicion) VALUES (?,?,?,0)').run(
          id,
          rutaImagen,
          preview.origen,
        );
      }

      if (etiquetas.length > 0) {
        const insertarEtiqueta = db.prepare('INSERT INTO etiquetas (activo_id, etiqueta) VALUES (?,?)');
        for (const etiqueta of etiquetas) insertarEtiqueta.run(id, etiqueta);
      }

      db.prepare('INSERT INTO activos_fts (texto, activo_id) VALUES (?,?)').run(
        textoBusqueda({
          nombre,
          categoria,
          etiquetas,
          origen: metadatos.origen ?? '',
          material: metadatos.material ?? null,
          notas: metadatos.notas ?? null,
        }),
        id,
      );

      if (opciones.falloInyectado === 'tras_db') {
        throw new Error('fallo inyectado tras escribir la base');
      }

      // Movimiento dentro de la transaccion: si falla, la base se revierte.
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.renameSync(temporal, destino);
      movido = true;

      if (espacio === 'original') {
        for (const entrada of fs.readdirSync(destino)) {
          fs.chmodSync(path.join(destino as string, entrada), MODO_SOLO_LECTURA);
        }
      }

      if (opciones.falloInyectado === 'tras_mover') {
        throw new Error('fallo inyectado tras mover al destino');
      }

      const fila = obtenerFilaActivo(db, id);
      if (!fila) throw new Error('La ficha no quedo registrada.');
      return filaAActivo(db, fila);
    });

    return { activo, avisos };
  } catch (error) {
    // Limpieza todo-o-nada: ni carpeta temporal, ni destino a medias, ni carpetas vacias.
    borrarCarpeta(temporal);
    if (destino) borrarCarpeta(destino);
    if (destino) podarCarpetasVacias(config.rutaBiblioteca, path.dirname(destino));
    void movido;
    throw error;
  }
}

/** Sube por el arbol borrando carpetas que quedaron vacias tras una limpieza. */
function podarCarpetasVacias(raiz: string, ruta: string): void {
  const raizAbsoluta = path.resolve(raiz);
  let actual = path.resolve(ruta);
  while (actual !== raizAbsoluta && actual.startsWith(raizAbsoluta + path.sep)) {
    try {
      if (fs.readdirSync(actual).length > 0) break;
      fs.rmdirSync(actual);
    } catch {
      break;
    }
    actual = path.dirname(actual);
  }
}

/** Crea una version de trabajo enlazada a un original, copiando su archivo principal. */
export function crearTrabajoDesdeOriginal(
  contexto: Contexto,
  originalId: string,
  datos: { metadatos?: Record<string, unknown>; imagen?: ArchivoEntrada | null; copiarArchivo?: boolean },
): ResultadoAlta {
  const { db } = contexto;
  const original = obtenerFilaActivo(db, originalId);
  if (!original) throw new ErrorDominio('error.original_no_existe', { original_id: originalId });
  if (original.espacio !== 'original') throw new ErrorDominio('error.original_invalido', { original_id: originalId });

  const archivosDelOriginal = db
    .prepare('SELECT ruta_relativa, formato FROM archivos WHERE activo_id = ? ORDER BY posicion, id')
    .all(originalId) as Array<{ ruta_relativa: string; formato: string }>;

  const archivos: ArchivoEntrada[] = [];
  if (datos.copiarArchivo !== false) {
    const principal = archivosDelOriginal[0];
    if (principal) {
      const rutaAbsoluta = rutaDentroDe(contexto.config.rutaBiblioteca, principal.ruta_relativa);
      archivos.push({ nombre: path.basename(principal.ruta_relativa), datos: fs.readFileSync(rutaAbsoluta) });
    }
  }
  if (archivos.length === 0 && !datos.imagen) {
    throw new ErrorDominio('error.trabajo_sin_contenido');
  }

  return crearActivo(
    contexto,
    {
      metadatos: {
        tipo: original.tipo,
        categoria: original.categoria,
        material: original.material,
        licencia: original.licencia,
        origen: original.origen,
        nombre: `${original.nombre} (trabajo)`,
        ...(datos.metadatos ?? {}),
      },
      espacio: 'trabajo',
      original_id: originalId,
      archivos,
      imagen: datos.imagen ?? null,
    },
    { omitirChequeoDuplicados: true },
  );
}

/** Campos que la API permite editar. Nunca el archivo ni el espacio ni el enlace al original. */
export const CAMPOS_EDITABLES = [
  'nombre',
  'tipo',
  'categoria',
  'etiquetas',
  'material',
  'medidas_mm',
  'origen',
  'licencia',
  'vendible_digital',
  'receta',
  'ubicacion_almacen',
  'notas',
] as const;

export const CAMPOS_PROHIBIDOS_EN_EDICION = ['espacio', 'original_id', 'archivos', 'imagenes', 'id', 'creado', 'actualizado'] as const;

/** Edicion de metadatos. Nunca toca los archivos; en un original, ni sus registros. */
export function editarActivo(contexto: Contexto, id: string, cambios: Record<string, unknown>): Activo {
  const { db } = contexto;
  const fila = obtenerFilaActivo(db, id);
  if (!fila) throw new ErrorDominio('error.activo_no_existe', { id });

  for (const campo of Object.keys(cambios)) {
    if ((CAMPOS_PROHIBIDOS_EN_EDICION as readonly string[]).includes(campo)) {
      throw new ErrorDominio('error.campo_no_editable', { campo });
    }
    if (!(CAMPOS_EDITABLES as readonly string[]).includes(campo)) {
      throw new ErrorDominio('error.campo_desconocido', { campo });
    }
  }

  const validados = validarMetadatos(cambios, { parcial: true });

  // vendible_digital se comprueba contra la licencia resultante (la nueva o la existente).
  const licenciaFinal = validados.licencia ?? fila.licencia;
  const vendibleFinal = validados.vendible_digital ?? fila.vendible_digital === 1;
  validarVentaDigital(licenciaFinal, vendibleFinal);

  const ahora = new Date().toISOString();
  transaccion(db, () => {
    db.prepare(
      `UPDATE activos SET
         nombre = ?, tipo = ?, categoria = ?, material = ?,
         ancho_mm = ?, alto_mm = ?, profundidad_mm = ?,
         origen = ?, licencia = ?, vendible_digital = ?, receta = ?,
         ubicacion_almacen = ?, notas = ?, actualizado = ?
       WHERE id = ?`,
    ).run(
      validados.nombre ?? fila.nombre,
      validados.tipo ?? fila.tipo,
      validados.categoria !== undefined ? validados.categoria : fila.categoria,
      validados.material !== undefined ? validados.material : fila.material,
      validados.medidas_mm ? validados.medidas_mm.ancho : fila.ancho_mm,
      validados.medidas_mm ? validados.medidas_mm.alto : fila.alto_mm,
      validados.medidas_mm ? validados.medidas_mm.profundidad : fila.profundidad_mm,
      validados.origen ?? fila.origen,
      licenciaFinal,
      vendibleFinal ? 1 : 0,
      validados.receta !== undefined ? validados.receta : fila.receta,
      validados.ubicacion_almacen ?? fila.ubicacion_almacen,
      validados.notas !== undefined ? validados.notas : fila.notas,
      ahora,
      id,
    );

    if (validados.etiquetas) {
      db.prepare('DELETE FROM etiquetas WHERE activo_id = ?').run(id);
      const insertar = db.prepare('INSERT INTO etiquetas (activo_id, etiqueta) VALUES (?,?)');
      for (const etiqueta of validados.etiquetas) insertar.run(id, etiqueta);
    }

    const etiquetasFinales =
      validados.etiquetas ??
      (db.prepare('SELECT etiqueta FROM etiquetas WHERE activo_id = ?').all(id) as Array<{ etiqueta: string }>).map((f) => f.etiqueta);

    db.prepare('DELETE FROM activos_fts WHERE activo_id = ?').run(id);
    db.prepare('INSERT INTO activos_fts (texto, activo_id) VALUES (?,?)').run(
      textoBusqueda({
        nombre: validados.nombre ?? fila.nombre,
        categoria: validados.categoria !== undefined ? validados.categoria : fila.categoria,
        etiquetas: etiquetasFinales,
        origen: validados.origen ?? fila.origen,
        material: validados.material !== undefined ? validados.material : fila.material,
        notas: validados.notas !== undefined ? validados.notas : fila.notas,
      }),
      id,
    );
  });

  const actualizada = obtenerFilaActivo(db, id);
  if (!actualizada) throw new ErrorDominio('error.activo_no_existe', { id });
  return filaAActivo(db, actualizada);
}

/**
 * Ruta absoluta de un archivo del activo, verificando que queda dentro de la biblioteca.
 * Lanza si la ruta no pertenece a la ficha (evita recorridos de ruta por parametro).
 */
export function rutaDeArchivoDelActivo(contexto: Contexto, id: string, rutaRelativa?: string): { absoluta: string; registro: { ruta_relativa: string; formato: string } } {
  const { db, config } = contexto;
  const registros = db
    .prepare('SELECT ruta_relativa, formato FROM archivos WHERE activo_id = ? ORDER BY posicion, id')
    .all(id) as Array<{ ruta_relativa: string; formato: string }>;
  if (registros.length === 0) throw new ErrorDominio('error.activo_sin_archivos', { id });
  const elegido = rutaRelativa ? registros.find((r) => r.ruta_relativa === rutaRelativa) : registros[0];
  if (!elegido) throw new ErrorDominio('error.archivo_no_pertenece_al_activo', { id, ruta: rutaRelativa ?? '' });
  const absoluta = rutaDentroDe(config.rutaBiblioteca, elegido.ruta_relativa);
  if (!fs.existsSync(absoluta)) throw new ErrorDominio('error.archivo_no_encontrado', { ruta: elegido.ruta_relativa });
  return { absoluta, registro: elegido };
}

/** Ruta absoluta de la miniatura del activo. */
export function rutaDeImagenDelActivo(contexto: Contexto, id: string, indice = 0): string | null {
  const { db, config } = contexto;
  const filas = db
    .prepare('SELECT ruta_relativa FROM imagenes WHERE activo_id = ? ORDER BY posicion, id')
    .all(id) as Array<{ ruta_relativa: string }>;
  const fila = filas[indice];
  if (!fila) return null;
  const absoluta = rutaDentroDe(config.rutaBiblioteca, fila.ruta_relativa);
  return fs.existsSync(absoluta) ? absoluta : null;
}

/** Verifica la huella de un archivo guardado; se usa para probar que un original no cambio. */
export async function sha256DeArchivoGuardado(contexto: Contexto, rutaRelativa: string): Promise<string> {
  return sha256DeArchivo(rutaDentroDe(contexto.config.rutaBiblioteca, rutaRelativa));
}

/** Borra entradas antiguas de la carpeta temporal (restos de altas interrumpidas). */
export function limpiarTemporalesHuerfanos(contexto: Contexto, maximoMs = 6 * 60 * 60 * 1000): number {
  const raiz = contexto.config.rutaTemporales;
  if (!fs.existsSync(raiz)) return 0;
  const ahora = Date.now();
  let borrados = 0;
  for (const entrada of fs.readdirSync(raiz)) {
    const ruta = path.join(raiz, entrada);
    try {
      const estado = fs.statSync(ruta);
      if (ahora - estado.mtimeMs > maximoMs) {
        borrarCarpeta(ruta);
        borrados += 1;
      }
    } catch {
      // Entrada desaparecida a mitad del recorrido.
    }
  }
  return borrados;
}

/** Tipo de activo inferido del formato del archivo principal. */
export function tipoDesdeFormato(formato: string): TipoActivo {
  if (formato === 'svg' || formato === 'dxf' || formato === 'pdf') return 'laser2d';
  if (formato === 'stl' || formato === '3mf') return 'modelo3d';
  return 'otro';
}

export function tipoMimeDe(formato: string): string {
  switch (formato) {
    case 'svg':
      return 'image/svg+xml';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'pdf':
      return 'application/pdf';
    case 'stl':
      return 'model/stl';
    case '3mf':
      return 'model/3mf';
    case 'dxf':
      return 'application/dxf';
    case 'zip':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
}

/** Util para pruebas y para el informe de importacion. */
export function contarActivos(db: DatabaseSync): { total: number; originales: number; trabajos: number } {
  const fila = db
    .prepare("SELECT COUNT(*) AS total, SUM(espacio='original') AS originales, SUM(espacio='trabajo') AS trabajos FROM activos")
    .get() as { total: number; originales: number | null; trabajos: number | null };
  return { total: fila.total, originales: fila.originales ?? 0, trabajos: fila.trabajos ?? 0 };
}

export type { Configuracion };
