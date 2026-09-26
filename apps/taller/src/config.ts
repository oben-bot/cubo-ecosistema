/**
 * Configuracion de la instalacion del Taller.
 * Mismo patron que Biblioteca: todo por .env y marca.json.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

export type Idioma = 'es' | 'en' | 'zh';

export const IDIOMAS_DISPONIBLES: readonly Idioma[] = ['es', 'en', 'zh'];

const PUERTO_POR_DEFECTO = 7102;
const HOST_POR_DEFECTO = '127.0.0.1';
const IDIOMA_POR_DEFECTO: Idioma = 'es';
const LIMITE_SUBIDA_MB_POR_DEFECTO = 50;

export interface Marca {
  nombre: string;
  logo: string | null;
  colores: { primario: string; fondo: string; texto: string };
  idioma: Idioma | null;
  enlaces: Record<string, string>;
}

export interface Configuracion {
  readonly rutaTaller: string;
  readonly rutaBaseDatos: string;
  readonly rutaTemporales: string;
  readonly rutaBandeja: string;
  readonly rutaLlave: string;
  readonly host: string;
  readonly puerto: number;
  readonly idioma: Idioma;
  readonly limiteSubidaBytes: number;
  readonly llave: string | null;
  readonly marca: Marca;
  readonly rutaMarca: string | null;
  readonly archivoEntorno: string | null;
  readonly bibliotecaUrl: string;
  readonly bibliotecaLlave: string | null;
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
  nombre: 'Taller',
  logo: null,
  colores: { primario: '#8b5e34', fondo: '#f7f4ef', texto: '#2b2118' },
  idioma: null,
  enlaces: {},
};

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
    if (valor === '') continue;
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
  cwd?: string;
  env?: NodeJS.ProcessEnv;
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

  const vars: Record<string, string | undefined> = { ...desdeArchivo };
  for (const [clave, valor] of Object.entries(baseEnv)) {
    if (clave.startsWith('TALLER_') && valor !== undefined && valor !== '') vars[clave] = valor;
  }

  const rutaTaller = path.resolve(cwd, vars.TALLER_RUTA ?? 'datos');
  const { marca, rutaUsada } = leerMarca(vars.TALLER_MARCA ?? null);
  const idioma = idiomaDe(vars.TALLER_IDIOMA, marca.idioma ?? IDIOMA_POR_DEFECTO, 'TALLER_IDIOMA');

  const config: Configuracion = {
    rutaTaller,
    rutaBaseDatos: path.join(rutaTaller, 'taller.db'),
    rutaTemporales: path.join(rutaTaller, 'tmp'),
    rutaBandeja: path.join(rutaTaller, 'bandeja'),
    rutaLlave: path.join(rutaTaller, 'cubo.key'),
    host: vars.TALLER_HOST ?? HOST_POR_DEFECTO,
    puerto: entero(vars.TALLER_PUERTO, PUERTO_POR_DEFECTO, 'TALLER_PUERTO', 1, 65535),
    idioma,
    limiteSubidaBytes: entero(vars.TALLER_LIMITE_SUBIDA_MB, LIMITE_SUBIDA_MB_POR_DEFECTO, 'TALLER_LIMITE_SUBIDA_MB', 1, 10240) * 1024 * 1024,
    llave: vars.TALLER_LLAVE ?? null,
    marca,
    rutaMarca: rutaUsada,
    archivoEntorno,
    bibliotecaUrl: vars.TALLER_BIBLIOTECA_URL ?? 'http://127.0.0.1:7101',
    bibliotecaLlave: vars.TALLER_BIBLIOTECA_LLAVE ?? null,
  };
  return Object.freeze(config);
}
