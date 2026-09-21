/**
 * Analizador de `multipart/form-data` sin dependencias.
 *
 * Se usa para el alta de archivos desde la interfaz y desde cualquier cliente HTTP.
 * El cuerpo se lee completo en memoria con un limite de tamano comprobado antes
 * (ver servidor.ts), que es suficiente para un servicio local de disenos.
 */

export interface ParteMultipart {
  nombre: string;
  nombreArchivo: string | null;
  tipoContenido: string | null;
  datos: Buffer;
}

export function boundaryDe(tipoContenido: string | undefined): string | null {
  if (!tipoContenido) return null;
  const coincidencia = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(tipoContenido);
  const bruto = (coincidencia?.[1] ?? coincidencia?.[2] ?? '').trim();
  return bruto.length > 0 ? bruto : null;
}

function valorDeParametro(disposicion: string, parametro: string): string | null {
  const coincidencia = new RegExp(`${parametro}=(?:"([^"]*)"|([^;]*))`, 'i').exec(disposicion);
  const valor = (coincidencia?.[1] ?? coincidencia?.[2] ?? '').trim();
  return valor.length > 0 ? valor : null;
}

export function analizarMultipart(cuerpo: Buffer, boundary: string): ParteMultipart[] {
  const delimitador = Buffer.from(`--${boundary}`);
  const salto = Buffer.from('\r\n');
  const finCabeceras = Buffer.from('\r\n\r\n');
  const partes: ParteMultipart[] = [];

  let posicion = cuerpo.indexOf(delimitador);
  if (posicion < 0) return partes;

  while (posicion >= 0) {
    const inicioParte = posicion + delimitador.length;
    // `--` despues del delimitador marca el final del cuerpo.
    if (cuerpo.subarray(inicioParte, inicioParte + 2).toString('latin1') === '--') break;
    const siguiente = cuerpo.indexOf(delimitador, inicioParte);
    if (siguiente < 0) break;

    // Cada parte empieza con CRLF y termina con CRLF antes del siguiente delimitador.
    let inicio = inicioParte;
    if (cuerpo.subarray(inicio, inicio + 2).equals(salto)) inicio += 2;
    let fin = siguiente;
    if (fin >= 2 && cuerpo.subarray(fin - 2, fin).equals(salto)) fin -= 2;

    const separadorCabeceras = cuerpo.indexOf(finCabeceras, inicio);
    if (separadorCabeceras >= 0 && separadorCabeceras < fin) {
      const textoCabeceras = cuerpo.subarray(inicio, separadorCabeceras).toString('utf8');
      const datos = cuerpo.subarray(separadorCabeceras + finCabeceras.length, fin);
      const cabeceras: Record<string, string> = {};
      for (const linea of textoCabeceras.split('\r\n')) {
        const dosPuntos = linea.indexOf(':');
        if (dosPuntos > 0) cabeceras[linea.slice(0, dosPuntos).trim().toLowerCase()] = linea.slice(dosPuntos + 1).trim();
      }
      const disposicion = cabeceras['content-disposition'] ?? '';
      partes.push({
        nombre: valorDeParametro(disposicion, 'name') ?? '',
        nombreArchivo: valorDeParametro(disposicion, 'filename'),
        tipoContenido: cabeceras['content-type'] ?? null,
        datos: Buffer.from(datos),
      });
    }
    posicion = siguiente;
  }
  return partes;
}

/** Construye un cuerpo multipart; lo usan las pruebas para ejercitar la API real. */
export function construirMultipart(
  boundary: string,
  campos: Array<{ nombre: string; valor?: string; nombreArchivo?: string; tipoContenido?: string; datos?: Buffer }>,
): Buffer {
  const trozos: Buffer[] = [];
  for (const campo of campos) {
    const disposicion = campo.nombreArchivo
      ? `form-data; name="${campo.nombre}"; filename="${campo.nombreArchivo}"`
      : `form-data; name="${campo.nombre}"`;
    const cabeceras = campo.tipoContenido ? `\r\nContent-Type: ${campo.tipoContenido}` : '';
    trozos.push(Buffer.from(`--${boundary}\r\nContent-Disposition: ${disposicion}${cabeceras}\r\n\r\n`, 'utf8'));
    trozos.push(campo.datos ?? Buffer.from(campo.valor ?? '', 'utf8'));
    trozos.push(Buffer.from('\r\n', 'utf8'));
  }
  trozos.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));
  return Buffer.concat(trozos);
}
