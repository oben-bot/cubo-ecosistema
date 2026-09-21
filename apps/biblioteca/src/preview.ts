/**
 * Miniatura de un activo, en el orden que pide el brief:
 *   1. la imagen que sube el usuario,
 *   2. la que viene dentro del ZIP,
 *   3. la captura/render del diseno (SVG/DXF a imagen).
 *
 * La busqueda de imagen en la web queda como interfaz vacia para la fase siguiente:
 * aqui no se simula, simplemente no hay fuente "web".
 */
import { ErrorCaptura, generarCaptura, puedeGenerarCaptura } from './raster/captura.ts';
import type { EntradaZip } from './zip.ts';
import type { Espacio, OrigenImagen } from './dominio.ts';

export interface CandidatoImagen {
  datos: Buffer;
  nombre: string;
}

export interface PreviewDecidido {
  datos: Buffer;
  extension: string;
  origen: OrigenImagen;
}

/** Tamano maximo aceptado para una imagen de vista previa. */
const MAX_BYTES_IMAGEN = 32 * 1024 * 1024;
/** Por debajo de este tamano se supone un icono o miniatura inutil dentro del ZIP. */
const MIN_BYTES_IMAGEN_ZIP = 512;

export interface TipoImagenDetectado {
  extension: string;
  tipoMime: string;
}

/** Identifica una imagen por sus bytes, no por su extension. */
export function detectarImagen(datos: Buffer): TipoImagenDetectado | null {
  if (datos.length < 12) return null;
  if (datos[0] === 0x89 && datos[1] === 0x50 && datos[2] === 0x4e && datos[3] === 0x47) {
    return { extension: 'png', tipoMime: 'image/png' };
  }
  if (datos[0] === 0xff && datos[1] === 0xd8 && datos[2] === 0xff) {
    return { extension: 'jpg', tipoMime: 'image/jpeg' };
  }
  if (datos.subarray(0, 4).toString('latin1') === 'GIF8') {
    return { extension: 'gif', tipoMime: 'image/gif' };
  }
  if (datos.subarray(0, 4).toString('latin1') === 'RIFF' && datos.subarray(8, 12).toString('latin1') === 'WEBP') {
    return { extension: 'webp', tipoMime: 'image/webp' };
  }
  if (datos[0] === 0x42 && datos[1] === 0x4d) {
    return { extension: 'bmp', tipoMime: 'image/bmp' };
  }
  return null;
}

const PRIORIDAD_FORMATO: Record<string, number> = { jpg: 3, jpeg: 3, png: 3, webp: 2, gif: 1, bmp: 0 };

/** Elige la mejor imagen dentro de un ZIP; null si no trae ninguna util. */
export function elegirImagenDelZip(entradas: EntradaZip[]): CandidatoImagen | null {
  let mejor: { candidato: CandidatoImagen; puntaje: number } | null = null;
  for (const entrada of entradas) {
    if (entrada.datos.length < MIN_BYTES_IMAGEN_ZIP || entrada.datos.length > MAX_BYTES_IMAGEN) continue;
    const detectada = detectarImagen(entrada.datos);
    if (detectada === null) continue;
    const puntaje =
      (PRIORIDAD_FORMATO[detectada.extension] ?? 0) * 1e12 + Math.min(entrada.datos.length, 20 * 1024 * 1024);
    if (mejor === null || puntaje > mejor.puntaje) mejor = { candidato: { datos: entrada.datos, nombre: entrada.nombre }, puntaje };
  }
  return mejor?.candidato ?? null;
}

/**
 * Origen que se registra cuando la imagen la aporta el usuario.
 *
 * El contrato 3.1 solo define `zip | web | captura | foto_terminado`. Decision de esta
 * fase (propuesta de cambio de contrato en las notas de entrega): en un `trabajo` la
 * imagen subida es la foto del producto terminado; en un `original` se registra como
 * `captura`, porque cumple exactamente ese papel.
 */
export function origenDeImagenSubida(espacio: Espacio): OrigenImagen {
  return espacio === 'trabajo' ? 'foto_terminado' : 'captura';
}

export interface ArchivoParaCaptura {
  nombre: string;
  formato: string;
  datos: Buffer;
}

export interface OpcionesDecidirPreview {
  imagenSubida?: CandidatoImagen | null;
  entradasZip?: EntradaZip[];
  archivosParaCaptura: ArchivoParaCaptura[];
  espacio: Espacio;
  ladoPreview: number;
}

export interface ResultadoPreview {
  preview: PreviewDecidido | null;
  /** Claves de traduccion con avisos utiles para la interfaz (por ejemplo, sin captura posible). */
  avisos: string[];
}

export function decidirPreview(opciones: OpcionesDecidirPreview): ResultadoPreview {
  const avisos: string[] = [];

  if (opciones.imagenSubida) {
    const detectada = detectarImagen(opciones.imagenSubida.datos);
    if (detectada === null) {
      avisos.push('aviso.imagen_subida_no_reconocida');
    } else {
      return {
        preview: {
          datos: opciones.imagenSubida.datos,
          extension: detectada.extension,
          origen: origenDeImagenSubida(opciones.espacio),
        },
        avisos,
      };
    }
  }

  const delZip = elegirImagenDelZip(opciones.entradasZip ?? []);
  if (delZip) {
    const detectada = detectarImagen(delZip.datos);
    if (detectada) {
      return { preview: { datos: delZip.datos, extension: detectada.extension, origen: 'zip' }, avisos };
    }
  }

  const conCaptura = opciones.archivosParaCaptura.find((a) => puedeGenerarCaptura(a.formato));
  if (conCaptura) {
    try {
      const png = generarCaptura({ formato: conCaptura.formato, contenido: conCaptura.datos, lado: opciones.ladoPreview });
      if (png) return { preview: { datos: png, extension: 'png', origen: 'captura' }, avisos };
      avisos.push('aviso.captura_sin_geometria');
    } catch (error) {
      if (error instanceof ErrorCaptura) avisos.push('aviso.captura_no_disponible');
      else avisos.push('aviso.captura_no_disponible');
    }
  } else {
    avisos.push('aviso.formato_sin_captura');
  }
  return { preview: null, avisos };
}
