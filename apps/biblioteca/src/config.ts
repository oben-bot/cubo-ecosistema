/**
 * Configuracion de la instalacion.
 *
 * Regla 4 y 5 de AGENTS.md: nada de rutas, puertos, marca ni idioma escritos a mano en el
 * codigo. Todo sale de variables de entorno (`.env`) y de `marca.json`, con valores por
 * defecto genericos para que el modulo arranque sin configuracion previa.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

export type Idioma = 'es' | 'en' | 'zh';
export type UbicacionAlmacen = 'ssd' | 'hdd' | 'nube';

export const IDIOMAS_DISPONIBLES: readonly Idioma[] = ['es', 'en', 'zh'];
export const UBICACIONES_ALMACEN: readonly UbicacionAlmacen[] = ['ssd', 'hdd', 'nube'];

/** Puerto propuesto en ARQUITECTURA.md seccion 2; solo es un valor por defecto. */
const PUERTO_POR_DEFECTO = 7101;
const HOST_POR_DEFECTO = '127.0.0.1';
const IDIOMA_POR_DEFECTO: Idioma = 'es';
const LIMITE_SUBIDA_MB_POR_DEFECTO = 200;
const PREVIEW_PX_POR_DEFECTO = 512;
const UBICACION_POR_DEFECTO: UbicacionAlmacen = 'ssd';
const CONCURRENCIA_POR_DEFECTO = 4;

export interface Marca {
  nombre: string;
  logo: string | null;
  colores: { primario: string; fondo: string; texto: string };
  idioma: Idioma | null;
  enlaces: Record<string, string>;
}

export interface Configuracion {
  readonly rutaBiblioteca: string;
  readonly rutaBaseDatos: string;
  readonly rutaTemporales: string;
  readonly rutaLlave: string;
  readonly host: string;
  readonly puerto: number;
  readonly idioma: Idioma;
  readonly limiteSubidaBytes: number;
  readonly previewPx: number;
  readonly ubicacionAlmacen: UbicacionAlmacen;
  readonly concurrenciaImportacion: number;
  readonly llave: string | null;
  readonly marca: Marca;
  readonly rutaMarca: string | null;
  readonly archivoEntorno: string | null;
}

export class ErrorConfiguracion extends Error {
  readonly codigo: string;
  readonly detalles?: Record<string, string | number>;

  constructor(codigo: string, detalles?: Record<string, string | number>) {
    super(codigo);
    this.name = 'ErrorConfiguracion';
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

const MARCA_GENERICA: Marca = {
  nombre: 'Biblioteca',
  logo: null,
  colores: { primario: '#8b5e34', fondo: '#f7f4ef', texto: '#2b2118' },
  idioma: null,
  enlaces: {},
};

/** Analizador minimo de `.env`: `CLAVE=valor`, `#` comentarios, comillas simples o dobles. */
export function analizarEnv(texto: string): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const lineaCruda of texto.split(/\r?\n/)) {
    const linea = lineaCruda.trim();
    if (linea.length === 0 || linea.startsWith('#')) continue;
    const igual = linea.indexOf('=');
    if (igual <= 0) continue;
    const clave = linea.slice(0, igual).trim();
    if (clave.length === 0) continue;
    let valor = linea.slice(igual + 1).trim();
    if (
      valor.length >= 2 &&
      ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'")))
    ) {
      valor = valor.slice(1, -1);
    }
    if (valor === '') continue; // Una clave vacia no sobrescribe el valor por defecto.
    salida[clave] = valor;
  }
  return salida;
}

function entero(valor: string | undefined, porDefecto: number, clave: string, min: number, max: number): number {
  if (valor === undefined) return porDefecto;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < min || numero > max) {
    throw new ErrorConfiguracion('error.config_valor_invalido', { variable: clave, minimo: min, maximo: max });
  }
  return numero;
}

function idiomaDe(valor: string | undefined, porDefecto: Idioma, clave: string): Idioma {
  if (valor === undefined) return porDefecto;
  const normalizado = valor.trim().toLowerCase() as Idioma;
  if (!IDIOMAS_DISPONIBLES.includes(normalizado)) {
    throw new ErrorConfiguracion('error.config_opciones_invalidas', {
      variable: clave,
      opciones: IDIOMAS_DISPONIBLES.join(', '),
    });
  }
  return normalizado;
}

function ubicacionDe(valor: string | undefined, porDefecto: UbicacionAlmacen, clave: string): UbicacionAlmacen {
  if (valor === undefined) return porDefecto;
  const normalizado = valor.trim().toLowerCase() as UbicacionAlmacen;
  if (!UBICACIONES_ALMACEN.includes(normalizado)) {
    throw new ErrorConfiguracion('error.config_opciones_invalidas', {
      variable: clave,
      opciones: UBICACIONES_ALMACEN.join(', '),
    });
  }
  return normalizado;
}

function esColor(valor: unknown): valor is string {
  return typeof valor === 'string' && /^#[0-9a-fA-F]{6}$/.test(valor);
}

export function leerMarca(ruta: string | null): { marca: Marca; rutaUsada: string | null } {
  const candidatos: string[] = [];
  if (ruta) candidatos.push(path.resolve(ruta));
  candidatos.push(path.resolve(process.cwd(), 'marca.json'));

  for (const candidato of candidatos) {
    if (!fs.existsSync(candidato)) continue;
    let crudo: unknown;
    try {
      crudo = JSON.parse(fs.readFileSync(candidato, 'utf8'));
    } catch (error) {
      throw new ErrorConfiguracion('error.marca_invalida', {
        ruta: candidato,
        detalle: (error as Error).message,
      });
    }
    if (typeof crudo !== 'object' || crudo === null) {
      throw new ErrorConfiguracion('error.marca_no_es_objeto', { ruta: candidato });
    }
    const datos = crudo as Record<string, unknown>;
    const colores = (typeof datos.colores === 'object' && datos.colores !== null ? datos.colores : {}) as Record<string, unknown>;
    const marca: Marca = {
      nombre: typeof datos.nombre === 'string' && datos.nombre.trim() !== '' ? datos.nombre.trim() : MARCA_GENERICA.nombre,
      logo: typeof datos.logo === 'string' && datos.logo.trim() !== '' ? datos.logo.trim() : null,
      colores: {
        primario: esColor(colores.primario) ? colores.primario : MARCA_GENERICA.colores.primario,
        fondo: esColor(colores.fondo) ? colores.fondo : MARCA_GENERICA.colores.fondo,
        texto: esColor(colores.texto) ? colores.texto : MARCA_GENERICA.colores.texto,
      },
      idioma: typeof datos.idioma === 'string' && IDIOMAS_DISPONIBLES.includes(datos.idioma as Idioma)
        ? (datos.idioma as Idioma)
        : null,
      enlaces:
        typeof datos.enlaces === 'object' && datos.enlaces !== null
          ? Object.fromEntries(
              Object.entries(datos.enlaces as Record<string, unknown>).filter(([, v]) => typeof v === 'string') as Array<[string, string]>,
            )
          : {},
    };
    return { marca, rutaUsada: candidato };
  }
  return { marca: MARCA_GENERICA, rutaUsada: null };
}

export interface OpcionesCargarConfig {
  /** Directorio de trabajo usado para resolver rutas relativas. Por defecto, process.cwd(). */
  cwd?: string;
  /** Variables de entorno; por defecto process.env. */
  env?: NodeJS.ProcessEnv;
  /** Ruta explicita al archivo .env. Si no se indica, se busca <cwd>/.env. */
  archivoEnv?: string | null;
}

export function cargarConfiguracion(opciones: OpcionesCargarConfig = {}): Configuracion {
  const cwd = opciones.cwd ?? process.cwd();
  const baseEnv: NodeJS.ProcessEnv = opciones.env ?? process.env;

  let archivoEntorno: string | null = null;
  let desdeArchivo: Record<string, string> = {};
  const rutaEnv =
    opciones.archivoEnv === undefined
      ? path.resolve(cwd, '.env')
      : opciones.archivoEnv === null
        ? null
        : path.resolve(opciones.archivoEnv);
  if (rutaEnv !== null && fs.existsSync(rutaEnv)) {
    desdeArchivo = analizarEnv(fs.readFileSync(rutaEnv, 'utf8'));
    archivoEntorno = rutaEnv;
  }

  // El entorno del proceso manda sobre el archivo .env.
  const vars: Record<string, string | undefined> = { ...desdeArchivo };
  for (const [clave, valor] of Object.entries(baseEnv)) {
    if (clave.startsWith('BIBLIOTECA_') && valor !== undefined && valor !== '') vars[clave] = valor;
  }

  const rutaBiblioteca = path.resolve(cwd, vars.BIBLIOTECA_RUTA ?? 'datos');
  const { marca, rutaUsada } = leerMarca(vars.BIBLIOTECA_MARCA ?? null);
  const idioma = idiomaDe(vars.BIBLIOTECA_IDIOMA, marca.idioma ?? IDIOMA_POR_DEFECTO, 'BIBLIOTECA_IDIOMA');

  const config: Configuracion = {
    rutaBiblioteca,
    rutaBaseDatos: path.join(rutaBiblioteca, 'biblioteca.db'),
    rutaTemporales: path.join(rutaBiblioteca, 'tmp'),
    rutaLlave: path.join(rutaBiblioteca, 'cubo.key'),
    host: vars.BIBLIOTECA_HOST ?? HOST_POR_DEFECTO,
    puerto: entero(vars.BIBLIOTECA_PUERTO, PUERTO_POR_DEFECTO, 'BIBLIOTECA_PUERTO', 1, 65535),
    idioma,
    limiteSubidaBytes: entero(vars.BIBLIOTECA_LIMITE_SUBIDA_MB, LIMITE_SUBIDA_MB_POR_DEFECTO, 'BIBLIOTECA_LIMITE_SUBIDA_MB', 1, 10240) * 1024 * 1024,
    previewPx: entero(vars.BIBLIOTECA_PREVIEW_PX, PREVIEW_PX_POR_DEFECTO, 'BIBLIOTECA_PREVIEW_PX', 32, 2048),
    ubicacionAlmacen: ubicacionDe(vars.BIBLIOTECA_UBICACION_ALMACEN, UBICACION_POR_DEFECTO, 'BIBLIOTECA_UBICACION_ALMACEN'),
    concurrenciaImportacion: entero(vars.BIBLIOTECA_CONCURRENCIA_IMPORTACION, CONCURRENCIA_POR_DEFECTO, 'BIBLIOTECA_CONCURRENCIA_IMPORTACION', 1, 32),
    llave: vars.BIBLIOTECA_LLAVE ?? null,
    marca,
    rutaMarca: rutaUsada,
    archivoEntorno,
  };
  return Object.freeze(config);
}
