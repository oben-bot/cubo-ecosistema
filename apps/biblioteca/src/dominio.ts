/**
 * Dominio de la Biblioteca: tipos del contrato 3.1 de ARQUITECTURA.md y reglas de negocio.
 *
 * Las reglas viven aqui (y ademas como disparadores en la base de datos) para que no
 * dependan de quien llama: ni la API ni la interfaz pueden saltarselas.
 */

export type TipoActivo = 'laser2d' | 'modelo3d' | 'software' | 'app' | 'otro';
export type Espacio = 'original' | 'trabajo';
export type Licencia = 'propia' | 'comercial_ok' | 'solo_personal' | 'desconocida';
export type OrigenImagen = 'zip' | 'web' | 'captura' | 'foto_terminado';
export type UbicacionAlmacenActivo = 'ssd' | 'hdd' | 'nube';

export const TIPOS_ACTIVO: readonly TipoActivo[] = ['laser2d', 'modelo3d', 'software', 'app', 'otro'];
export const ESPACIOS: readonly Espacio[] = ['original', 'trabajo'];
export const LICENCIAS: readonly Licencia[] = ['propia', 'comercial_ok', 'solo_personal', 'desconocida'];
export const ORIGENES_IMAGEN: readonly OrigenImagen[] = ['zip', 'web', 'captura', 'foto_terminado'];

/** Formatos de diseno que la Biblioteca acepta como archivo principal. */
export const FORMATOS_DISENO: readonly string[] = ['svg', 'dxf', 'pdf', 'stl', '3mf'];
/** Formatos de imagen aceptados (miniatura subida por el usuario o foto de producto terminado). */
export const FORMATOS_IMAGEN: readonly string[] = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
/** Formatos que se pueden renderizar como captura del diseno. */
export const FORMATOS_CON_CAPTURA: readonly string[] = ['svg', 'dxf'];
/** Contenedor: se abre y se guardan sus archivos dentro de la ficha. */
export const FORMATO_CONTENEDOR = 'zip';

export const FORMATOS_ADMITIDOS: readonly string[] = [
  ...FORMATOS_DISENO,
  ...FORMATOS_IMAGEN,
  FORMATO_CONTENEDOR,
];

export interface MedidasMm {
  ancho: number | null;
  alto: number | null;
  profundidad: number | null;
}

export interface ArchivoActivo {
  ruta_relativa: string;
  formato: string;
  sha256: string;
  tamano?: number;
}

export interface ImagenActivo {
  ruta_relativa: string;
  origen_imagen: OrigenImagen;
}

export interface Activo {
  id: string;
  tipo: TipoActivo;
  espacio: Espacio;
  original_id: string | null;
  nombre: string;
  categoria: string | null;
  etiquetas: string[];
  medidas_mm: MedidasMm;
  material: string | null;
  archivos: ArchivoActivo[];
  imagenes: ImagenActivo[];
  origen: string;
  licencia: Licencia;
  vendible_digital: boolean;
  receta: unknown | null;
  ubicacion_almacen: UbicacionAlmacenActivo;
  notas: string | null;
  creado: string;
  actualizado: string;
}

/** Error de dominio: siempre lleva una clave de traduccion, nunca texto fijo en la interfaz. */
export class ErrorDominio extends Error {
  readonly codigo: string;
  readonly detalles?: Record<string, string | number | undefined>;

  constructor(codigo: string, detalles?: Record<string, string | number | undefined>) {
    super(codigo);
    this.name = 'ErrorDominio';
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

export function esTipoActivo(valor: unknown): valor is TipoActivo {
  return typeof valor === 'string' && (TIPOS_ACTIVO as readonly string[]).includes(valor);
}

export function esEspacio(valor: unknown): valor is Espacio {
  return typeof valor === 'string' && (ESPACIOS as readonly string[]).includes(valor);
}

export function esLicencia(valor: unknown): valor is Licencia {
  return typeof valor === 'string' && (LICENCIAS as readonly string[]).includes(valor);
}

export function esOrigenImagen(valor: unknown): valor is OrigenImagen {
  return typeof valor === 'string' && (ORIGENES_IMAGEN as readonly string[]).includes(valor);
}

export function formatoDe(nombreArchivo: string): string {
  const punto = nombreArchivo.lastIndexOf('.');
  if (punto < 0 || punto === nombreArchivo.length - 1) return '';
  return nombreArchivo.slice(punto + 1).toLowerCase();
}

export function esFormatoAdmitido(formato: string): boolean {
  return (FORMATOS_ADMITIDOS as readonly string[]).includes(formato);
}

export function esImagen(formato: string): boolean {
  return (FORMATOS_IMAGEN as readonly string[]).includes(formato);
}

/** Licencias que permiten marcar el activo como vendible en digital. */
export const LICENCIAS_VENDIBLES: readonly Licencia[] = ['propia', 'comercial_ok'];

export function licenciaPermiteVentaDigital(licencia: Licencia): boolean {
  return (LICENCIAS_VENDIBLES as readonly string[]).includes(licencia);
}

/** Regla del contrato 3.1: `vendible_digital` solo se activa con licencia propia o comercial_ok. */
export function validarVentaDigital(licencia: Licencia, vendibleDigital: boolean): void {
  if (vendibleDigital && !licenciaPermiteVentaDigital(licencia)) {
    throw new ErrorDominio('error.licencia_no_permite_venta_digital', { licencia });
  }
}

/** Regla del contrato 3.1: un trabajo siempre enlaza a su original; un original nunca enlaza. */
export function validarEnlaceOriginal(espacio: Espacio, originalId: string | null): void {
  if (espacio === 'trabajo' && !originalId) {
    throw new ErrorDominio('error.trabajo_sin_original');
  }
  if (espacio === 'original' && originalId) {
    throw new ErrorDominio('error.original_con_enlace');
  }
}

export interface MedidasEntrada {
  ancho?: unknown;
  alto?: unknown;
  profundidad?: unknown;
}

export function normalizarMedidas(entrada: MedidasEntrada | null | undefined): MedidasMm {
  const leer = (valor: unknown): number | null => {
    if (valor === undefined || valor === null || valor === '') return null;
    const numero = typeof valor === 'number' ? valor : Number(valor);
    if (!Number.isFinite(numero) || numero <= 0) {
      throw new ErrorDominio('error.medidas_invalidas');
    }
    return numero;
  };
  if (entrada === null || entrada === undefined) return { ancho: null, alto: null, profundidad: null };
  return { ancho: leer(entrada.ancho), alto: leer(entrada.alto), profundidad: leer(entrada.profundidad) };
}

export function normalizarEtiquetas(entrada: unknown): string[] {
  if (entrada === undefined || entrada === null || entrada === '') return [];
  const lista = Array.isArray(entrada)
    ? entrada
    : typeof entrada === 'string'
      ? entrada.split(',')
      : null;
  if (lista === null) throw new ErrorDominio('error.etiquetas_invalidas');
  const salida: string[] = [];
  for (const elemento of lista) {
    if (typeof elemento !== 'string') throw new ErrorDominio('error.etiquetas_invalidas');
    const limpia = elemento.trim().replace(/\s+/g, ' ').toLowerCase();
    if (limpia.length === 0) continue;
    if (limpia.length > 64) throw new ErrorDominio('error.etiqueta_demasiado_larga');
    if (!salida.includes(limpia)) salida.push(limpia);
  }
  if (salida.length > 50) throw new ErrorDominio('error.demasiadas_etiquetas');
  return salida;
}

function textoOpcional(valor: unknown, clave: string, maximo: number): string | null {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string') throw new ErrorDominio('error.campo_invalido', { campo: clave });
  const limpio = valor.trim();
  if (limpio.length === 0) return null;
  if (limpio.length > maximo) throw new ErrorDominio('error.campo_demasiado_largo', { campo: clave, maximo });
  return limpio;
}

function textoObligatorio(valor: unknown, clave: string, maximo: number): string {
  const limpio = textoOpcional(valor, clave, maximo);
  if (limpio === null) throw new ErrorDominio('error.campo_obligatorio', { campo: clave });
  return limpio;
}

/** Campos de metadatos que la API acepta al dar de alta o al editar una ficha. */
export interface MetadatosEntrada {
  nombre?: unknown;
  tipo?: unknown;
  categoria?: unknown;
  etiquetas?: unknown;
  material?: unknown;
  medidas_mm?: unknown;
  origen?: unknown;
  licencia?: unknown;
  vendible_digital?: unknown;
  receta?: unknown;
  ubicacion_almacen?: unknown;
  notas?: unknown;
}

export interface MetadatosValidados {
  nombre: string;
  tipo: TipoActivo;
  categoria: string | null;
  etiquetas: string[];
  material: string | null;
  medidas_mm: MedidasMm;
  origen: string;
  licencia: Licencia;
  vendible_digital: boolean;
  receta: string | null;
  ubicacion_almacen: UbicacionAlmacenActivo;
  notas: string | null;
}

export function normalizarBooleano(valor: unknown, porDefecto = false): boolean {
  if (valor === undefined || valor === null || valor === '') return porDefecto;
  if (typeof valor === 'boolean') return valor;
  if (typeof valor === 'string') {
    const v = valor.trim().toLowerCase();
    if (['1', 'true', 'si', 'sí', 'yes', 'on'].includes(v)) return true;
    if (['0', 'false', 'no', 'off'].includes(v)) return false;
  }
  if (typeof valor === 'number' && (valor === 0 || valor === 1)) return valor === 1;
  throw new ErrorDominio('error.campo_invalido', { campo: 'vendible_digital' });
}

export interface OpcionesValidarMetadatos {
  /** En una edicion parcial solo se exige lo que viene en la entrada. */
  parcial?: boolean;
  ubicacionPorDefecto?: UbicacionAlmacenActivo;
}

export function validarMetadatos(
  entrada: MetadatosEntrada,
  opciones: OpcionesValidarMetadatos = {},
): Partial<MetadatosValidados> {
  const parcial = opciones.parcial === true;
  const salida: Partial<MetadatosValidados> = {};

  if (!parcial || entrada.nombre !== undefined) {
    salida.nombre = textoObligatorio(entrada.nombre, 'nombre', 200);
  }
  if (!parcial || entrada.tipo !== undefined) {
    if (entrada.tipo === undefined) {
      // El tipo es opcional: el alta lo infiere del formato del archivo principal
      // (o queda 'otro'); aqui simplemente no se fija.
    } else {
      if (!esTipoActivo(entrada.tipo)) throw new ErrorDominio('error.tipo_invalido', { campo: 'tipo' });
      salida.tipo = entrada.tipo;
    }
  }
  if (entrada.categoria !== undefined) salida.categoria = textoOpcional(entrada.categoria, 'categoria', 120);
  if (entrada.etiquetas !== undefined) salida.etiquetas = normalizarEtiquetas(entrada.etiquetas);
  if (entrada.material !== undefined) salida.material = textoOpcional(entrada.material, 'material', 120);
  if (entrada.medidas_mm !== undefined) {
    const crudo = entrada.medidas_mm;
    if (typeof crudo !== 'object' || crudo === null) throw new ErrorDominio('error.medidas_invalidas');
    salida.medidas_mm = normalizarMedidas(crudo as MedidasEntrada);
  }
  if (!parcial || entrada.origen !== undefined) {
    salida.origen = textoObligatorio(entrada.origen, 'origen', 300);
  }
  if (!parcial || entrada.licencia !== undefined) {
    const licencia = entrada.licencia;
    if (!esLicencia(licencia)) throw new ErrorDominio('error.licencia_invalida');
    salida.licencia = licencia;
  }
  if (entrada.ubicacion_almacen !== undefined) {
    const ubicacion = String(entrada.ubicacion_almacen).toLowerCase();
    if (ubicacion !== 'ssd' && ubicacion !== 'hdd' && ubicacion !== 'nube') {
      throw new ErrorDominio('error.ubicacion_invalida');
    }
    salida.ubicacion_almacen = ubicacion;
  } else if (!parcial) {
    salida.ubicacion_almacen = opciones.ubicacionPorDefecto ?? 'ssd';
  }
  if (entrada.notas !== undefined) salida.notas = textoOpcional(entrada.notas, 'notas', 4000);
  if (entrada.receta !== undefined) {
    if (entrada.receta === null) {
      salida.receta = null;
    } else if (typeof entrada.receta === 'string') {
      try {
        JSON.parse(entrada.receta);
        salida.receta = entrada.receta;
      } catch {
        throw new ErrorDominio('error.receta_invalida');
      }
    } else if (typeof entrada.receta === 'object') {
      salida.receta = JSON.stringify(entrada.receta);
    } else {
      throw new ErrorDominio('error.receta_invalida');
    }
  }
  if (entrada.vendible_digital !== undefined) {
    salida.vendible_digital = normalizarBooleano(entrada.vendible_digital, false);
  } else if (!parcial) {
    salida.vendible_digital = false;
  }

  // La regla de venta digital se comprueba con el par (licencia, vendible_digital) cuando
  // ambos estan presentes. En una edicion parcial el llamador resuelve la licencia final
  // contra la ficha existente (ver editarActivo) y alli se vuelve a validar.
  const licencia = salida.licencia;
  const vendible = salida.vendible_digital;
  if (licencia !== undefined && vendible !== undefined) validarVentaDigital(licencia, vendible);
  return salida;
}

/** Texto indexado para la busqueda por palabra clave. */
export function textoBusqueda(datos: {
  nombre: string;
  categoria: string | null;
  etiquetas: string[];
  origen: string;
  material: string | null;
  notas: string | null;
}): string {
  return [
    datos.nombre,
    datos.categoria ?? '',
    datos.etiquetas.join(' '),
    datos.origen,
    datos.material ?? '',
    datos.notas ?? '',
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Nombre por defecto de una ficha cuando el usuario no lo indica: el del archivo,
 * sin extension y con guiones convertidos en espacios.
 */
export function nombreDesdeArchivo(nombreArchivo: string): string {
  const base = nombreArchivo.replace(/\.[^.]+$/, '');
  const limpio = base.replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return limpio.length > 0 ? limpio.slice(0, 200) : 'sin nombre';
}
