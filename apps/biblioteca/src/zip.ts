/**
 * Lectura de ZIP con `fflate` (MIT, sin dependencias nativas, mantenida).
 *
 * Se limita el numero de entradas y el tamano descomprimido total para que un ZIP
 * danino o una "bomba ZIP" no tumbe el servicio.
 */
import { unzipSync } from 'fflate';
import { nombreSeguro, nombreUnico } from './rutas.ts';

export interface EntradaZip {
  /** Nombre original tal como viene en el ZIP. */
  rutaOriginal: string;
  /** Nombre de archivo saneado y unico dentro del ZIP. */
  nombre: string;
  datos: Buffer;
}

export const MAX_ENTRADAS_ZIP = 5000;

export class ErrorZip extends Error {
  readonly codigo: string;

  constructor(codigo: string, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorZip';
    this.codigo = codigo;
  }
}

export function leerZip(datos: Buffer, limiteBytesDescomprimidos: number): EntradaZip[] {
  if (datos.length < 4) throw new ErrorZip('error.zip_invalido', 'El archivo ZIP esta vacio o incompleto.');
  let descomprimido: Record<string, Uint8Array>;
  let total = 0;
  let entradas = 0;
  try {
    descomprimido = unzipSync(datos, {
      filter: (archivo) => {
        if (archivo.name.endsWith('/')) return false; // carpetas: no se guardan como archivo
        entradas += 1;
        if (entradas > MAX_ENTRADAS_ZIP) {
          throw new ErrorZip('error.zip_demasiadas_entradas', `El ZIP tiene mas de ${MAX_ENTRADAS_ZIP} archivos.`);
        }
        total += archivo.originalSize ?? archivo.size ?? 0;
        if (total > limiteBytesDescomprimidos) {
          throw new ErrorZip('error.zip_demasiado_grande', 'El contenido descomprimido del ZIP supera el limite permitido.');
        }
        return true;
      },
    });
  } catch (error) {
    if (error instanceof ErrorZip) throw error;
    throw new ErrorZip('error.zip_invalido', `No se pudo abrir el ZIP: ${(error as Error).message}`);
  }

  const usados = new Set<string>();
  const salida: EntradaZip[] = [];
  for (const [rutaOriginal, contenido] of Object.entries(descomprimido)) {
    if (rutaOriginal.endsWith('/')) continue;
    // Los ZIP suelen incluir carpetas de sistema; se descartan.
    if (/(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)(\/|$)/i.test(rutaOriginal)) continue;
    const nombre = nombreUnico(nombreSeguro(rutaOriginal), usados);
    salida.push({ rutaOriginal, nombre, datos: Buffer.from(contenido) });
  }
  return salida;
}
