/**
 * Servidor HTTP local del Taller (contrato ARQUITECTURA.md 3.3).
 */
import * as fs from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import * as path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import { IDIOMAS_DISPONIBLES, type Configuracion, type Idioma } from './config.ts';
import { crearContexto, type Contexto } from './contexto.ts';
import { VERSION_ESQUEMA_ACTUAL } from './db/index.ts';
import { leerCookie, llaveCoincide, NOMBRE_CABECERA, NOMBRE_COOKIE } from './http/llave.ts';
import { diccionarioDe, traducir } from './i18n.ts';
import { INFO_VERSION } from './version.ts';
import { contarBandeja, depositarEnBandeja, descartarBandeja, listarBandeja, obtenerBandeja, rutaAbsolutaBandeja, marcarGuardadoYBorrar, validarMedidas } from './bandeja/modelo.ts';
import { guardarEnBiblioteca, BibliotecaNoDisponibleError } from './biblioteca/cliente.ts';
import { generarTexto, listarTipografias, validarOpciones } from './constructores/texto.ts';
import { generarCaja, validarOpcionesCaja } from './constructores/cajas.ts';
import { generarLlavero, validarOpcionesLlavero } from './constructores/llaveros.ts';

const DIRECTORIO_ACTUAL = path.dirname(fileURLToPath(import.meta.url));
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

const CODIGOS_404 = new Set(['error.bandeja_no_existe', 'error.bandeja_archivo_no_encontrado', 'error.ruta_no_encontrada']);
const CODIGOS_413 = new Set(['error.payload_demasiado_grande']);

export function estadoDeError(codigo: string, explicito?: number): number {
  if (explicito) return explicito;
  if (codigo === 'error.no_autorizado') return 401;
  if (CODIGOS_404.has(codigo)) return 404;
  if (CODIGOS_413.has(codigo)) return 413;
  if (codigo === 'error.biblioteca_no_disponible') return 502;
  if (codigo === 'error.biblioteca_respuesta_invalida') return 502;
  if (codigo === 'error.metodo_no_permitido') return 405;
  if (codigo === 'error.servidor') return 500;
  return 400;
}

export function codigoDesdeError(error: unknown): string {
  if (error instanceof ErrorHttp) return error.codigo;
  if (error instanceof BibliotecaNoDisponibleError) return error.codigo;
  const mensaje = error instanceof Error ? error.message : String(error);
  // Mensajes que ya son codigos de i18n
  if (mensaje.startsWith('error.')) return mensaje.split(':')[0];
  return 'error.servidor';
}

function detallesDesdeError(error: unknown): Record<string, string | number | undefined> | undefined {
  if (error instanceof ErrorHttp) return error.detalles;
  if (error instanceof BibliotecaNoDisponibleError) return { detalle: error.message };
  if (error instanceof Error && error.message.includes(':')) {
    const partes = error.message.split(':');
    if (partes[0].startsWith('error.')) {
      return { detalle: partes.slice(1).join(':').trim() };
    }
  }
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
    const detalles = detallesDesdeError(error) ?? (codigo === 'error.servidor' ? { detalle: (error as Error)?.message } : undefined);
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

    if (ruta === '/salud' && metodo === 'GET') {
      responderJson(res, 200, {
        modulo: INFO_VERSION.nombre,
        version: INFO_VERSION.version,
        estado: traducir(idioma, 'salud.estado'),
        esquema: VERSION_ESQUEMA_ACTUAL,
        idioma,
        idiomas: IDIOMAS_DISPONIBLES,
        bandeja: contarBandeja(db),
        tipografias: listarTipografias().map((t) => t.id),
      });
      return;
    }

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
        tipografias: listarTipografias(),
        biblioteca_url: config.bibliotecaUrl,
      });
    }

    if (segmentos[0] === 'i18n' && metodo === 'GET') {
      const pedido = segmentos[1];
      if (!pedido || !(IDIOMAS_DISPONIBLES as readonly string[]).includes(pedido)) {
        throw new ErrorHttp('error.parametro_invalido', 400, { parametro: 'idioma' });
      }
      return responderJson(res, 200, { idioma: pedido, mensajes: diccionarioDe(pedido as Idioma) });
    }

    // ---- Bandeja ----
    if (segmentos[0] === 'bandeja') {
      const id = segmentos[1] ? decodeURIComponent(segmentos[1]) : null;
      const accion = segmentos[2] ?? null;

      if (!id && metodo === 'GET') {
        return responderJson(res, 200, { bandeja: listarBandeja(db, 'pendiente') });
      }

      if (!id && metodo === 'POST') {
        const cuerpo = await leerCuerpo(req, config.limiteSubidaBytes);
        let entrada: Record<string, unknown>;
        try {
          entrada = JSON.parse(cuerpo.toString('utf8')) as Record<string, unknown>;
        } catch {
          throw new ErrorHttp('error.cuerpo_invalido', 400);
        }

        const archivoB64 = entrada.archivo as string | undefined;
        if (!archivoB64 || typeof archivoB64 !== 'string') throw new ErrorHttp('error.archivo_invalido', 400);
        let archivo: Buffer;
        try {
          archivo = Buffer.from(archivoB64, 'base64');
        } catch {
          throw new ErrorHttp('error.archivo_invalido', 400);
        }

        const formato = typeof entrada.formato === 'string' ? entrada.formato : 'svg';
        const constructorNombre = typeof entrada.constructor === 'string' ? entrada.constructor : 'otro';
        const medidas = entrada.medidas_mm ?? { ancho: 10, alto: 10 };
        const receta = (entrada.receta as Record<string, unknown>) ?? { constructor: constructorNombre };
        const largo = typeof entrada.largo_corte_mm === 'number' ? entrada.largo_corte_mm : null;
        const area = typeof entrada.area_mm2 === 'number' ? entrada.area_mm2 : null;

        try {
          const depositado = depositarEnBandeja(contexto, {
            archivo,
            formato,
            medidas_mm: medidas as any,
            receta: receta as any,
            constructor: constructorNombre,
            largo_corte_mm: largo,
            area_mm2: area,
          });
          return responderJson(res, 201, { bandeja: depositado });
        } catch (e) {
          throw new ErrorHttp(codigoDesdeError(e), 400, detallesDesdeError(e));
        }
      }

      if (id && !accion && metodo === 'GET') {
        const entrada = obtenerBandeja(db, id);
        if (!entrada) throw new ErrorHttp('error.bandeja_no_existe', 404, { id });
        return responderJson(res, 200, { bandeja: entrada });
      }

      if (id && accion === 'archivo' && metodo === 'GET') {
        const entrada = obtenerBandeja(db, id);
        if (!entrada) throw new ErrorHttp('error.bandeja_no_existe', 404, { id });
        const absoluta = rutaAbsolutaBandeja(contexto, entrada.archivo_ruta);
        const datos = fs.readFileSync(absoluta);
        const inline = url.searchParams.get('inline') === '1';
        res.writeHead(200, {
          'Content-Type': entrada.formato === 'svg' ? 'image/svg+xml' : 'application/octet-stream',
          'Content-Length': String(datos.length),
          'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${path.basename(entrada.archivo_ruta)}"`,
        });
        res.end(datos);
        return;
      }

      if (id && accion === 'guardar' && metodo === 'POST') {
        const entrada = obtenerBandeja(db, id);
        if (!entrada) throw new ErrorHttp('error.bandeja_no_existe', 404, { id });
        const absoluta = rutaAbsolutaBandeja(contexto, entrada.archivo_ruta);

        // Intentar guardar en Biblioteca
        try {
          const nombre = (entrada.receta as any)?.texto ? `Texto ${(entrada.receta as any).texto}` : `Diseno ${entrada.id}`;
          const resultado = await guardarEnBiblioteca({
            bibliotecaUrl: config.bibliotecaUrl,
            bibliotecaLlave: config.bibliotecaLlave,
            archivoAbsoluto: absoluta,
            nombre,
            medidas_mm: entrada.medidas_mm ?? { ancho: 10, alto: 10 },
            receta: entrada.receta ?? { constructor: entrada.constructor },
            formato: entrada.formato,
          });

          // Si ok, borrar de bandeja
          marcarGuardadoYBorrar(contexto, id);

          return responderJson(res, 200, {
            mensaje: traducir(idioma, 'ui.guardado_ok'),
            biblioteca: resultado,
            bandeja_id: id,
          });
        } catch (e) {
          if (e instanceof BibliotecaNoDisponibleError) {
            throw new ErrorHttp(e.codigo, estadoDeError(e.codigo), {
              url: config.bibliotecaUrl,
              detalle: e.message,
            });
          }
          throw e;
        }
      }

      if (id && accion === 'descartar' && metodo === 'POST') {
        const entrada = obtenerBandeja(db, id);
        if (!entrada) throw new ErrorHttp('error.bandeja_no_existe', 404, { id });
        descartarBandeja(contexto, id);
        return responderJson(res, 200, { mensaje: traducir(idioma, 'ui.descartado_ok'), id });
      }

      throw new ErrorHttp('error.metodo_no_permitido', 405);
    }

    // ---- Constructores ----
    if (segmentos[0] === 'constructores') {
      const tipo = segmentos[1] ?? null;

      if (tipo === 'fuentes' && metodo === 'GET') {
        return responderJson(res, 200, { tipografias: listarTipografias() });
      }

      if (tipo === 'texto' && metodo === 'POST') {
        const cuerpo = await leerCuerpo(req, config.limiteSubidaBytes);
        let entrada: Record<string, unknown>;
        try {
          entrada = JSON.parse(cuerpo.toString('utf8')) as Record<string, unknown>;
        } catch {
          throw new ErrorHttp('error.cuerpo_invalido', 400);
        }

        try {
          const opciones = {
            texto: entrada.texto as string,
            tipografia: entrada.tipografia as string,
            tamano_mm: entrada.tamano_mm as number,
            solapamiento: entrada.solapamiento as number | undefined,
          };
          validarOpciones(opciones as any);
          const resultado = await generarTexto(opciones as any);

          const depositado = depositarEnBandeja(contexto, {
            archivo: Buffer.from(resultado.svg, 'utf8'),
            formato: 'svg',
            medidas_mm: resultado.medidas_mm,
            receta: resultado.receta as any,
            constructor: 'texto',
            largo_corte_mm: resultado.largo_corte_mm,
            area_mm2: resultado.area_mm2,
          });

          return responderJson(res, 201, {
            bandeja: depositado,
            medidas_mm: resultado.medidas_mm,
            largo_corte_mm: resultado.largo_corte_mm,
            area_mm2: resultado.area_mm2,
            receta: resultado.receta,
            svg_preview: resultado.svg,
            debug: resultado.debug,
          });
        } catch (e) {
          const codigo = codigoDesdeError(e);
          const detalles = detallesDesdeError(e);
          if (codigo.startsWith('error.')) {
            throw new ErrorHttp(codigo, estadoDeError(codigo), detalles as any);
          }
          throw new ErrorHttp('error.generacion_fallo', 500, { detalle: (e as Error).message });
        }
      }

      if (tipo === 'caja' && metodo === 'POST') {
        const cuerpo = await leerCuerpo(req, config.limiteSubidaBytes);
        let entrada: Record<string, unknown>;
        try {
          entrada = JSON.parse(cuerpo.toString('utf8')) as Record<string, unknown>;
        } catch {
          throw new ErrorHttp('error.cuerpo_invalido', 400);
        }
        try {
          const opciones = {
            ancho_mm: entrada.ancho_mm as number,
            alto_mm: entrada.alto_mm as number,
            profundidad_mm: entrada.profundidad_mm as number,
            grosor_mm: entrada.grosor_mm as number | undefined,
            tipo: entrada.tipo as any,
            con_pestanas: entrada.con_pestanas as boolean | undefined,
            kerf_mm: entrada.kerf_mm as number | undefined,
          };
          validarOpcionesCaja(opciones as any);
          const resultado = await generarCaja(opciones as any);
          const depositado = depositarEnBandeja(contexto, {
            archivo: Buffer.from(resultado.svg, 'utf8'),
            formato: 'svg',
            medidas_mm: resultado.medidas_mm,
            receta: resultado.receta as any,
            constructor: 'caja',
            largo_corte_mm: resultado.largo_corte_mm,
            area_mm2: resultado.area_mm2,
          });
          return responderJson(res, 201, {
            bandeja: depositado,
            medidas_mm: resultado.medidas_mm,
            largo_corte_mm: resultado.largo_corte_mm,
            area_mm2: resultado.area_mm2,
            receta: resultado.receta,
            svg_preview: resultado.svg,
          });
        } catch (e) {
          const codigo = codigoDesdeError(e);
          const detalles = detallesDesdeError(e);
          if (codigo.startsWith('error.')) {
            throw new ErrorHttp(codigo, estadoDeError(codigo), detalles as any);
          }
          throw new ErrorHttp('error.generacion_fallo', 500, { detalle: (e as Error).message });
        }
      }

      if (tipo === 'llavero' && metodo === 'POST') {
        const cuerpo = await leerCuerpo(req, config.limiteSubidaBytes);
        let entrada: Record<string, unknown>;
        try {
          entrada = JSON.parse(cuerpo.toString('utf8')) as Record<string, unknown>;
        } catch {
          throw new ErrorHttp('error.cuerpo_invalido', 400);
        }
        try {
          const opciones = {
            texto: entrada.texto as string,
            forma: entrada.forma as any,
            tamano_mm: entrada.tamano_mm as number | undefined,
            tipografia: entrada.tipografia as string | undefined,
            incluir_agujero: entrada.incluir_agujero as boolean | undefined,
          };
          validarOpcionesLlavero(opciones as any);
          const resultado = await generarLlavero(opciones as any);
          const depositado = depositarEnBandeja(contexto, {
            archivo: Buffer.from(resultado.svg, 'utf8'),
            formato: 'svg',
            medidas_mm: resultado.medidas_mm,
            receta: resultado.receta as any,
            constructor: 'llavero',
            largo_corte_mm: resultado.largo_corte_mm,
            area_mm2: resultado.area_mm2,
          });
          return responderJson(res, 201, {
            bandeja: depositado,
            medidas_mm: resultado.medidas_mm,
            largo_corte_mm: resultado.largo_corte_mm,
            area_mm2: resultado.area_mm2,
            receta: resultado.receta,
            svg_preview: resultado.svg,
          });
        } catch (e) {
          const codigo = codigoDesdeError(e);
          const detalles = detallesDesdeError(e);
          if (codigo.startsWith('error.')) {
            throw new ErrorHttp(codigo, estadoDeError(codigo), detalles as any);
          }
          throw new ErrorHttp('error.generacion_fallo', 500, { detalle: (e as Error).message });
        }
      }

      throw new ErrorHttp('error.ruta_no_encontrada', 404);
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

export function prepararServicio(config: Configuracion, llave: string): { contexto: Contexto; servidor: Server } {
  const contexto = crearContexto(config);
  return { contexto, servidor: crearServidor({ contexto, llave }) };
}
