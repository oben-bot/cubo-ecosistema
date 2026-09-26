import * as fs from 'node:fs';
import * as http from 'node:http';
import * as https from 'node:https';
import { URL } from 'node:url';
import * as path from 'node:path';

export class BibliotecaNoDisponibleError extends Error {
  readonly codigo: string;
  constructor(codigo: string, mensaje: string) {
    super(mensaje);
    this.name = 'BibliotecaNoDisponibleError';
    this.codigo = codigo;
  }
}

export interface OpcionesGuardarBiblioteca {
  bibliotecaUrl: string;
  bibliotecaLlave: string | null;
  archivoAbsoluto: string;
  nombre: string;
  medidas_mm: { ancho: number; alto: number; profundidad?: number | null };
  receta: unknown;
  formato: string;
}

function crearBoundary(): string {
  return '----CuboTallerBoundary' + Math.random().toString(16).slice(2);
}

function construirMultipart(
  boundary: string,
  campos: Record<string, string>,
  archivo: { nombre: string; datos: Buffer; campo: string; tipoMime: string },
): Buffer {
  const partes: Buffer[] = [];
  const eol = '\r\n';

  for (const [clave, valor] of Object.entries(campos)) {
    partes.push(Buffer.from(`--${boundary}${eol}`));
    partes.push(Buffer.from(`Content-Disposition: form-data; name="${clave}"${eol}${eol}`));
    partes.push(Buffer.from(`${valor}${eol}`));
  }

  partes.push(Buffer.from(`--${boundary}${eol}`));
  partes.push(
    Buffer.from(
      `Content-Disposition: form-data; name="${archivo.campo}"; filename="${archivo.nombre}"${eol}` +
        `Content-Type: ${archivo.tipoMime}${eol}${eol}`,
    ),
  );
  partes.push(archivo.datos);
  partes.push(Buffer.from(eol));
  partes.push(Buffer.from(`--${boundary}--${eol}`));

  return Buffer.concat(partes);
}

function tipoMimeDe(formato: string): string {
  switch (formato.toLowerCase()) {
    case 'svg':
      return 'image/svg+xml';
    case 'dxf':
      return 'application/dxf';
    case 'stl':
      return 'model/stl';
    case '3mf':
      return 'model/3mf';
    default:
      return 'application/octet-stream';
  }
}

export async function guardarEnBiblioteca(opciones: OpcionesGuardarBiblioteca): Promise<{ id: string; activo: unknown }> {
  const { bibliotecaUrl, bibliotecaLlave, archivoAbsoluto, nombre, medidas_mm, receta, formato } = opciones;

  if (!fs.existsSync(archivoAbsoluto)) {
    throw new BibliotecaNoDisponibleError('error.bandeja_archivo_no_encontrado', 'Archivo temporal no encontrado');
  }

  const datosArchivo = fs.readFileSync(archivoAbsoluto);
  const boundary = crearBoundary();

  const campos: Record<string, string> = {
    nombre,
    tipo: 'laser2d',
    categoria: 'texto',
    origen: 'taller:texto',
    licencia: 'propia',
    espacio: 'original',
    vendible_digital: '0',
    ancho_mm: String(medidas_mm.ancho),
    alto_mm: String(medidas_mm.alto),
    ...(medidas_mm.profundidad ? { profundidad_mm: String(medidas_mm.profundidad) } : {}),
    receta: typeof receta === 'string' ? receta : JSON.stringify(receta),
  };

  const cuerpo = construirMultipart(boundary, campos, {
    nombre: path.basename(archivoAbsoluto),
    datos: datosArchivo,
    campo: 'archivos',
    tipoMime: tipoMimeDe(formato),
  });

  let url: URL;
  try {
    url = new URL('/activos', bibliotecaUrl);
  } catch {
    throw new BibliotecaNoDisponibleError(
      'error.biblioteca_no_disponible',
      `URL de Biblioteca invalida: ${bibliotecaUrl}`,
    );
  }

  const esHttps = url.protocol === 'https:';
  const modulo = esHttps ? https : http;

  return new Promise((resolver, rechazar) => {
    const req = modulo.request(
      {
        hostname: url.hostname,
        port: url.port || (esHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': String(cuerpo.length),
          ...(bibliotecaLlave ? { 'x-cubo-key': bibliotecaLlave } : {}),
        },
        timeout: 8000,
      },
      (res) => {
        const trozos: Buffer[] = [];
        res.on('data', (t: Buffer) => trozos.push(t));
        res.on('end', () => {
          const buffer = Buffer.concat(trozos);
          const texto = buffer.toString('utf8');
          const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 300;
          if (ok) {
            try {
              const json = JSON.parse(texto) as { activo: { id: string }; [k: string]: unknown };
              resolver({ id: json.activo.id, activo: json });
            } catch {
              rechazar(
                new BibliotecaNoDisponibleError(
                  'error.biblioteca_respuesta_invalida',
                  `Respuesta invalida de Biblioteca: ${texto.slice(0, 200)}`,
                ),
              );
            }
            return;
          }

          let mensaje = `Biblioteca respondio con ${res.statusCode}`;
          try {
            const json = JSON.parse(texto) as { error?: { mensaje?: string; codigo?: string } };
            if (json.error?.mensaje) mensaje = json.error.mensaje;
          } catch {}

          if (res.statusCode === 401) {
            rechazar(
              new BibliotecaNoDisponibleError(
                'error.biblioteca_no_disponible',
                `No autorizado en Biblioteca (${bibliotecaUrl}). Verifica TALLER_BIBLIOTECA_LLAVE. ${mensaje}`,
              ),
            );
            return;
          }

          rechazar(
            new BibliotecaNoDisponibleError(
              'error.biblioteca_respuesta_invalida',
              `${mensaje} (codigo ${res.statusCode})`,
            ),
          );
        });
      },
    );

    req.on('timeout', () => {
      req.destroy();
      rechazar(
        new BibliotecaNoDisponibleError(
          'error.biblioteca_no_disponible',
          `No se pudo conectar con la Biblioteca en ${bibliotecaUrl}. ¿Esta corriendo? (apps/biblioteca -> npm start)`,
        ),
      );
    });

    req.on('error', (err: Error) => {
      rechazar(
        new BibliotecaNoDisponibleError(
          'error.biblioteca_no_disponible',
          `No se pudo conectar con la Biblioteca en ${bibliotecaUrl}. ¿Esta corriendo? (apps/biblioteca -> npm start). Detalle: ${err.message}`,
        ),
      );
    });

    req.write(cuerpo);
    req.end();
  });
}
