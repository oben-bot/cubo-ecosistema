/**
 * Servicio HTTP local de la Biblioteca (contrato 3.2 de ARQUITECTURA.md).
 *
 * - Escucha en la interfaz configurada (por defecto 127.0.0.1).
 * - Toda ruta exige la llave local X-Cubo-Key, salvo `GET /salud`.
 * - Los mensajes de error devuelven una clave de traduccion y su texto en el idioma pedido.
 */
import * as fs from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import * as path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import {
  contarActivos,
  crearActivo,
  crearTrabajoDesdeOriginal,
  editarActivo,
  limpiarTemporalesHuerfanos,
  obtenerActivo,
  obtenerFilaActivo,
  rutaDeArchivoDelActivo,
  rutaDeImagenDelActivo,
  tipoMimeDe,
  type ArchivoEntrada,
  type DatosAlta,
} from './activos.ts';
import { buscar, listarCategorias } from './busqueda.ts';
import { IDIOMAS_DISPONIBLES, type Configuracion, type Idioma } from './config.ts';
import { crearContexto, type Contexto } from './contexto.ts';
import { VERSION_ESQUEMA_ACTUAL } from './db/index.ts';
import {
  ErrorDominio,
  ESPACIOS,
  FORMATOS_ADMITIDOS,
  LICENCIAS,
  TIPOS_ACTIVO,
  type Espacio,
  type Licencia,
  type TipoActivo,
} from './dominio.ts';
import { leerCookie, llaveCoincide, NOMBRE_CABECERA, NOMBRE_COOKIE } from './http/llave.ts';
import { analizarMultipart, boundaryDe, type ParteMultipart } from './http/multipart.ts';
import { diccionarioDe, traducir } from './i18n.ts';
import { importarCarpeta } from './importar.ts';
import { INFO_VERSION } from './version.ts';

const DIRECTORIO_ACTUAL = path.dirname(fileURLToPath(import.meta.url));
/** Carpeta de la interfaz web: queda al mismo nivel que src/ y que dist/. */
const RAIZ_UI = path.join(DIRECTORIO_ACTUAL, '..', 'ui');

export class ErrorHttp extends Error {
  readonly codigo: string;
  readonly estado?: number;
  readonly detalles?: Record<string, string | number | undefined>;

  constructor(codigo: string, estado?: number, detalles?: Record<string, string | number | undefined>) {
    super(codigo);
    this.name = 'ErrorHttp';
    this.codigo = codigo;
    this.estado = estado;
    this.detalles = detalles;
  }
}

const CODIGOS_409 = new Set([
  'error.archivo_duplicado',
  'error.original_de_solo_lectura',
  'error.campo_no_editable',
  'error.trabajo_sin_original',
  'error.original_con_enlace',
]);
const CODIGOS_404 = new Set([
  'error.activo_no_existe',
  'error.original_no_existe',
  'error.archivo_no_encontrado',
  'error.ruta_no_encontrada',
]);
const CODIGOS_413 = new Set(['error.payload_demasiado_grande', 'error.zip_demasiado_grande', 'error.zip_demasiadas_entradas']);

export function estadoDeError(codigo: string, explicito?: number): number {
  if (explicito) return explicito;
  if (codigo === 'error.no_autorizado') return 401;
  if (CODIGOS_409.has(codigo)) return 409;
  if (CODIGOS_404.has(codigo)) return 404;
  if (CODIGOS_413.has(codigo)) return 413;
  if (codigo === 'error.metodo_no_permitido') return 405;
  if (codigo === 'error.servidor') return 500;
  return 400;
}

/** Traduce a claves de error los codigos que vienen de los disparadores de la base. */
export function codigoDesdeError(error: unknown): string {
  if (error instanceof ErrorHttp) return error.codigo;
  if (error instanceof ErrorDominio) return error.codigo;
  const mensaje = error instanceof Error ? error.message : String(error);
  if (mensaje === 'licencia_no_permite_venta_digital') return 'error.licencia_no_permite_venta_digital';
  if (mensaje === 'original_de_solo_lectura') return 'error.original_de_solo_lectura';
  if (error instanceof Error && error.name === 'ErrorZip') return 'error.zip_invalido';
  if (error instanceof Error && error.name === 'ErrorConfiguracion') return mensaje;
  return 'error.servidor';
}

function detallesDesdeError(error: unknown): Record<string, string | number | undefined> | undefined {
  if (error instanceof ErrorDominio || error instanceof ErrorHttp) return error.detalles;
  if (error instanceof Error && error.name === 'ErrorZip') return { detalle: error.message };
  return undefined;
}

export function idiomaDePeticion(req: IncomingMessage, porDefecto: Idioma): Idioma {
  const consulta = new URL(req.url ?? '/', 'http://localhost').searchParams.get('idioma');
  if (consulta && (IDIOMAS_DISPONIBLES as readonly string[]).includes(consulta)) return consulta as Idioma;
  const cabecera = req.headers['accept-language'];
  if (typeof cabecera === 'string') {
    for (const parte of cabecera.split(',')) {
      const codigo = parte.split(';')[0].trim().toLowerCase().slice(0, 2);
      if ((IDIOMAS_DISPONIBLES as readonly string[]).includes(codigo)) return codigo as Idioma;
    }
  }
  return porDefecto;
}

export interface OpcionesServidor {
  contexto: Contexto;
  llave: string;
}

export function crearServidor(opciones: OpcionesServidor): Server {
  const { contexto, llave } = opciones;
  const { config, db } = contexto;

  function responderJson(res: ServerResponse, estado: number, datos: unknown, cabeceras: Record<string, string> = {}): void {
    const cuerpo = Buffer.from(JSON.stringify(datos, null, 2), 'utf8');
    res.writeHead(estado, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': String(cuerpo.length),
      'Cache-Control': 'no-store',
      ...cabeceras,
    });
    res.end(cuerpo);
  }

  function responderError(
    res: ServerResponse,
    estado: number,
    codigo: string,
    idioma: Idioma,
    detalles?: Record<string, string | number | undefined>,
  ): void {
    responderJson(res, estado, {
      error: { codigo, mensaje: traducir(idioma, codigo, detalles), detalles: detalles ?? null },
    });
  }

  function fallar(res: ServerResponse, idioma: Idioma, error: unknown): void {
    const codigo = codigoDesdeError(error);
    const estado = estadoDeError(codigo, error instanceof ErrorHttp ? error.estado : undefined);
    const detalles =
      detallesDesdeError(error) ?? (codigo === 'error.servidor' ? { detalle: (error as Error)?.message } : undefined);
    responderError(res, estado, codigo, idioma, detalles);
  }

  function leerCuerpo(req: IncomingMessage, limite: number): Promise<Buffer> {
    return new Promise((resolver, rechazar) => {
      const declarado = Number(req.headers['content-length'] ?? '0');
      if (Number.isFinite(declarado) && declarado > limite) {
        rechazar(new ErrorHttp('error.payload_demasiado_grande', 413, { maximo_bytes: limite }));
        return;
      }
      const trozos: Buffer[] = [];
      let total = 0;
      req.on('data', (trozo: Buffer) => {
        total += trozo.length;
        if (total > limite) {
          rechazar(new ErrorHttp('error.payload_demasiado_grande', 413, { maximo_bytes: limite }));
          req.destroy();
          return;
        }
        trozos.push(trozo);
      });
      req.on('end', () => resolver(Buffer.concat(trozos)));
      req.on('error', rechazar);
    });
  }

  function autorizado(req: IncomingMessage): boolean {
    const cabecera = req.headers[NOMBRE_CABECERA];
    const desdeCabecera = Array.isArray(cabecera) ? cabecera[0] : cabecera;
    if (llaveCoincide(desdeCabecera, llave)) return true;
    const desdeCookie = leerCookie(req.headers.cookie, NOMBRE_COOKIE);
    return llaveCoincide(desdeCookie ?? undefined, llave);
  }

  function servirEstatico(res: ServerResponse, idioma: Idioma, nombreArchivo: string, tipo: string): void {
    const ruta = path.join(RAIZ_UI, nombreArchivo);
    if (!fs.existsSync(ruta)) {
      responderError(res, 404, 'error.ruta_no_encontrada', idioma);
      return;
    }
    const datos = fs.readFileSync(ruta);
    res.writeHead(200, { 'Content-Type': tipo, 'Content-Length': String(datos.length), 'Cache-Control': 'no-cache' });
    res.end(datos);
  }

  async function atender(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const idioma = idiomaDePeticion(req, config.idioma);
    const url = new URL(req.url ?? '/', 'http://localhost');
    const ruta = url.pathname.replace(/\/+$/, '') || '/';
    const metodo = (req.method ?? 'GET').toUpperCase();
    const segmentos = ruta.split('/').filter((s) => s.length > 0);

    // Salud publica: la usan Cubo Manager y los instaladores para detectar el servicio.
    if (ruta === '/salud' && metodo === 'GET') {
      responderJson(res, 200, {
        modulo: INFO_VERSION.nombre,
        version: INFO_VERSION.version,
        estado: traducir(idioma, 'salud.estado'),
        esquema: VERSION_ESQUEMA_ACTUAL,
        idioma,
        idiomas: IDIOMAS_DISPONIBLES,
        activos: contarActivos(db),
      });
      return;
    }

    // Interfaz web local: la carcasa HTML es publica y establece la cookie de sesion;
    // el resto de rutas (datos, subidas, importacion) exigen la llave o esa cookie.
    if (ruta === '/' && metodo === 'GET') {
      const datos = fs.readFileSync(path.join(RAIZ_UI, 'index.html'));
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': String(datos.length),
        'Cache-Control': 'no-cache',
        'Set-Cookie': `${NOMBRE_COOKIE}=${encodeURIComponent(llave)}; HttpOnly; SameSite=Strict; Path=/`,
      });
      res.end(datos);
      return;
    }

    if (!autorizado(req)) {
      responderError(res, 401, 'error.no_autorizado', idioma);
      return;
    }

    if (ruta === '/app.js' && metodo === 'GET') return servirEstatico(res, idioma, 'app.js', 'text/javascript; charset=utf-8');
    if (ruta === '/estilos.css' && metodo === 'GET') return servirEstatico(res, idioma, 'estilos.css', 'text/css; charset=utf-8');

    if (ruta === '/config-publica' && metodo === 'GET') {
      return responderJson(res, 200, {
        marca: config.marca,
        idioma,
        idiomas: IDIOMAS_DISPONIBLES,
        version: INFO_VERSION.version,
        tipos: TIPOS_ACTIVO,
        espacios: ESPACIOS,
        licencias: LICENCIAS,
        formatos: FORMATOS_ADMITIDOS,
        // La busqueda de imagenes en la web queda como interfaz vacia hasta la fase siguiente.
        busqueda_imagenes_web: false,
      });
    }

    if (segmentos[0] === 'i18n' && metodo === 'GET') {
      const pedido = segmentos[1];
      if (!pedido || !(IDIOMAS_DISPONIBLES as readonly string[]).includes(pedido)) {
        throw new ErrorHttp('error.parametro_invalido', 400, { parametro: 'idioma' });
      }
      return responderJson(res, 200, { idioma: pedido, mensajes: diccionarioDe(pedido as Idioma) });
    }

    if (ruta === '/categorias' && metodo === 'GET') {
      return responderJson(res, 200, { categorias: listarCategorias(contexto) });
    }

    // ---- Activos ----
    if (segmentos[0] === 'activos') {
      const id = segmentos[1] ? decodeURIComponent(segmentos[1]) : null;
      const accion = segmentos[2] ?? null;

      if (!id && metodo === 'GET') {
        return responderJson(
          res,
          200,
          buscar(contexto, {
            q: url.searchParams.get('q') ?? undefined,
            tipo: url.searchParams.get('tipo') ?? undefined,
            espacio: url.searchParams.get('espacio') ?? undefined,
            categoria: url.searchParams.get('categoria') ?? undefined,
            licencia: url.searchParams.get('licencia') ?? undefined,
            vendible_digital: url.searchParams.has('vendible_digital') ? url.searchParams.get('vendible_digital') === '1' : undefined,
            limite: url.searchParams.has('limite') ? Number(url.searchParams.get('limite')) : undefined,
            offset: url.searchParams.has('offset') ? Number(url.searchParams.get('offset')) : undefined,
          }),
        );
      }

      if (!id && metodo === 'POST') {
        const cuerpo = await leerCuerpo(req, config.limiteSubidaBytes);
        const tipoContenido = req.headers['content-type'] ?? '';
        if (!tipoContenido.toLowerCase().startsWith('multipart/form-data')) {
          throw new ErrorHttp('error.tipo_contenido_no_admitido', 400);
        }
        const boundary = boundaryDe(tipoContenido);
        if (!boundary) throw new ErrorHttp('error.tipo_contenido_no_admitido', 400);
        const resultado = crearActivo(contexto, altaDesdePartes(analizarMultipart(cuerpo, boundary)));
        return responderJson(res, 201, {
          activo: resultado.activo,
          avisos: resultado.avisos.map((clave) => ({ codigo: clave, mensaje: traducir(idioma, clave) })),
        });
      }

      if (!id) throw new ErrorHttp('error.ruta_no_encontrada', 404);
      if (!obtenerFilaActivo(db, id)) throw new ErrorHttp('error.activo_no_existe', 404, { id });

      if (!accion && metodo === 'GET') {
        const activo = obtenerActivo(db, id);
        const trabajos = db
          .prepare('SELECT id, nombre, creado FROM activos WHERE original_id = ? ORDER BY creado')
          .all(id) as Array<{ id: string; nombre: string; creado: string }>;
        return responderJson(res, 200, { ...activo, trabajos });
      }

      if (!accion && metodo === 'PATCH') {
        const cuerpo = await leerCuerpo(req, config.limiteSubidaBytes);
        let cambios: Record<string, unknown>;
        try {
          cambios = JSON.parse(cuerpo.toString('utf8')) as Record<string, unknown>;
        } catch {
          throw new ErrorHttp('error.cuerpo_invalido', 400);
        }
        return responderJson(res, 200, { activo: editarActivo(contexto, id, cambios) });
      }

      if (accion === 'archivo' && metodo === 'GET') {
        const { absoluta, registro } = rutaDeArchivoDelActivo(contexto, id, url.searchParams.get('ruta') ?? undefined);
        const datos = fs.readFileSync(absoluta);
        const inline = url.searchParams.get('inline') === '1';
        res.writeHead(200, {
          'Content-Type': tipoMimeDe(registro.formato),
          'Content-Length': String(datos.length),
          'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${path.basename(registro.ruta_relativa)}"`,
          'X-Solo-Lectura': obtenerFilaActivo(db, id)?.espacio === 'original' ? '1' : '0',
        });
        res.end(datos);
        return;
      }

      if (accion === 'miniatura' && metodo === 'GET') {
        const absoluta = rutaDeImagenDelActivo(contexto, id, Number(url.searchParams.get('indice') ?? 0));
        if (!absoluta) throw new ErrorHttp('error.archivo_no_encontrado', 404, { ruta: 'miniatura' });
        const datos = fs.readFileSync(absoluta);
        res.writeHead(200, {
          'Content-Type': tipoMimeDe(path.extname(absoluta).slice(1).toLowerCase() || 'png'),
          'Content-Length': String(datos.length),
          'Cache-Control': 'private, max-age=3600',
        });
        res.end(datos);
        return;
      }

      if (accion === 'trabajo' && metodo === 'POST') {
        const cuerpo = await leerCuerpo(req, config.limiteSubidaBytes);
        const tipoContenido = req.headers['content-type'] ?? '';
        let campos: Record<string, unknown> = {};
        let imagen: ArchivoEntrada | null = null;
        if (tipoContenido.toLowerCase().startsWith('multipart/form-data')) {
          const boundary = boundaryDe(tipoContenido);
          if (!boundary) throw new ErrorHttp('error.tipo_contenido_no_admitido', 400);
          const datos = altaDesdePartes(analizarMultipart(cuerpo, boundary), { permitirSinArchivos: true });
          campos = datos.metadatos;
          imagen = datos.imagen ?? null;
        } else if (cuerpo.length > 0) {
          try {
            campos = JSON.parse(cuerpo.toString('utf8')) as Record<string, unknown>;
          } catch {
            throw new ErrorHttp('error.cuerpo_invalido', 400);
          }
        }
        const resultado = crearTrabajoDesdeOriginal(contexto, id, { metadatos: campos, imagen });
        return responderJson(res, 201, {
          activo: resultado.activo,
          avisos: resultado.avisos.map((clave) => ({ codigo: clave, mensaje: traducir(idioma, clave) })),
        });
      }

      throw new ErrorHttp('error.metodo_no_permitido', 405);
    }

    // ---- Importacion ----
    if (ruta === '/importar' && metodo === 'POST') {
      const cuerpo = await leerCuerpo(req, config.limiteSubidaBytes);
      let entrada: Record<string, unknown>;
      try {
        entrada = JSON.parse(cuerpo.toString('utf8')) as Record<string, unknown>;
      } catch {
        throw new ErrorHttp('error.cuerpo_invalido', 400);
      }
      const texto = (clave: string): string | null => {
        const valor = entrada[clave];
        if (valor === undefined || valor === null) return null;
        const limpio = String(valor).trim();
        return limpio.length > 0 ? limpio : null;
      };
      const informe = await importarCarpeta(contexto, {
        ruta: texto('ruta') ?? '',
        categoria: texto('categoria'),
        tipo: texto('tipo') as TipoActivo | null,
        licencia: texto('licencia') as Licencia | null,
        origen: texto('origen'),
        espacio: texto('espacio') as Espacio | null,
        usarCarpetaComoCategoria: entrada.usar_carpeta_como_categoria !== false,
      });
      return responderJson(res, 200, informe);
    }

    throw new ErrorHttp('error.ruta_no_encontrada', 404);
  }

  const servidor = createServer((req, res) => {
    atender(req, res).catch((error: unknown) => {
      try {
        fallar(res, idiomaDePeticion(req, config.idioma), error);
      } catch {
        res.destroy();
      }
    });
  });

  return servidor;
}

/** Convierte las partes de un multipart en los datos de un alta. */
export function altaDesdePartes(partes: ParteMultipart[], opciones: { permitirSinArchivos?: boolean } = {}): DatosAlta {
  const metadatos: Record<string, unknown> = {};
  const archivos: ArchivoEntrada[] = [];
  let imagen: ArchivoEntrada | null = null;

  for (const parte of partes) {
    if (parte.nombreArchivo !== null && parte.nombreArchivo.length > 0) {
      const entrada = { nombre: parte.nombreArchivo, datos: parte.datos };
      if (parte.nombre === 'imagen') imagen = entrada;
      else archivos.push(entrada);
      continue;
    }
    const valor = parte.datos.toString('utf8');
    switch (parte.nombre) {
      case 'etiquetas': {
        const anteriores = Array.isArray(metadatos.etiquetas) ? (metadatos.etiquetas as string[]) : [];
        metadatos.etiquetas = [...anteriores, ...valor.split(',').map((e) => e.trim()).filter((e) => e.length > 0)];
        break;
      }
      case 'medidas_mm': {
        try {
          metadatos.medidas_mm = JSON.parse(valor) as unknown;
        } catch {
          throw new ErrorHttp('error.parametro_invalido', 400, { parametro: 'medidas_mm' });
        }
        break;
      }
      case 'ancho_mm':
      case 'alto_mm':
      case 'profundidad_mm': {
        const actuales = (metadatos.medidas_mm ?? {}) as Record<string, unknown>;
        actuales[parte.nombre.replace('_mm', '')] = valor === '' ? null : Number(valor);
        metadatos.medidas_mm = actuales;
        break;
      }
      default:
        metadatos[parte.nombre] = valor;
    }
  }

  if (archivos.length === 0 && !opciones.permitirSinArchivos && !imagen) {
    throw new ErrorHttp('error.alta_sin_archivo', 400);
  }
  return {
    metadatos,
    espacio: metadatos.espacio === 'trabajo' ? 'trabajo' : 'original',
    original_id: typeof metadatos.original_id === 'string' && metadatos.original_id.length > 0 ? metadatos.original_id : null,
    archivos,
    imagen,
  };
}

/** Arranca el servicio y resuelve con el puerto realmente en uso. */
export function escuchar(servidor: Server, host: string, puerto: number): Promise<{ puerto: number; host: string }> {
  return new Promise((resolver, rechazar) => {
    servidor.once('error', rechazar);
    servidor.listen(puerto, host, () => {
      const direccion = servidor.address();
      if (typeof direccion === 'object' && direccion !== null) resolver({ puerto: direccion.port, host: direccion.address });
      else resolver({ puerto, host });
    });
  });
}

/** Punto unico de arranque: crea el contexto (base migrada) y el servidor. */
export function prepararServicio(config: Configuracion, llave: string): { contexto: Contexto; servidor: Server } {
  const contexto = crearContexto(config);
  limpiarTemporalesHuerfanos(contexto);
  return { contexto, servidor: crearServidor({ contexto, llave }) };
}
