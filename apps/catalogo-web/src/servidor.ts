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
import { crearProducto, listarProductos, obtenerProducto } from './productos/modelo.ts';
import { crearEntrega, listarEntregas, obtenerEntrega, actualizarEntregaEstado } from './entregas/modelo.ts';
import { obtenerActivoBiblioteca, BibliotecaNoDisponibleError } from './biblioteca/cliente.ts';

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

export function estadoDeError(codigo: string, explicito?: number): number {
  if (explicito) return explicito;
  if (codigo === 'error.no_autorizado') return 401;
  if (codigo.includes('no_existe')) return 404;
  if (codigo === 'error.biblioteca_no_disponible') return 502;
  return 400;
}

export function codigoDesdeError(error: unknown): string {
  if (error instanceof ErrorHttp) return error.codigo;
  if (error instanceof BibliotecaNoDisponibleError) return error.codigo;
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.startsWith('error.')) return msg.split(':')[0];
  return 'error.servidor';
}

function detallesDesdeError(error: unknown): Record<string, string | number | undefined> | undefined {
  if (error instanceof ErrorHttp) return error.detalles;
  if (error instanceof BibliotecaNoDisponibleError) return { url: 'biblioteca', detalle: error.message };
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

  function responderJson(res: ServerResponse, estado: number, datos: unknown): void {
    const cuerpo = Buffer.from(JSON.stringify(datos, null, 2), 'utf8');
    res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': String(cuerpo.length), 'Cache-Control': 'no-store' });
    res.end(cuerpo);
  }

  function responderError(res: ServerResponse, estado: number, codigo: string, idioma: Idioma, detalles?: Record<string, string | number | undefined>): void {
    responderJson(res, estado, { error: { codigo, mensaje: traducir(idioma, codigo, detalles), detalles: detalles ?? null } });
  }

  function fallar(res: ServerResponse, idioma: Idioma, error: unknown): void {
    const codigo = codigoDesdeError(error);
    const estado = estadoDeError(codigo, error instanceof ErrorHttp ? error.estado : undefined);
    const detalles = detallesDesdeError(error);
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
        productos: listarProductos(db).length,
        entregas: listarEntregas(db).length,
      });
      return;
    }

    if (ruta === '/' && metodo === 'GET') {
      const datos = fs.existsSync(path.join(RAIZ_UI, 'index.html')) ? fs.readFileSync(path.join(RAIZ_UI, 'index.html')) : Buffer.from('<h1>Catalogo</h1>');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': String(datos.length), 'Cache-Control': 'no-cache', 'Set-Cookie': `${NOMBRE_COOKIE}=${encodeURIComponent(llave)}; HttpOnly; SameSite=Strict; Path=/` });
      res.end(datos);
      return;
    }

    // Publico: ver productos sin llave (catalogo publico)
    if (segmentos[0] === 'productos' && metodo === 'GET' && segmentos.length === 1) {
      const productos = listarProductos(db, 'publicado');
      return responderJson(res, 200, { productos });
    }
    if (segmentos[0] === 'productos' && metodo === 'GET' && segmentos[1]) {
      const prod = obtenerProducto(db, decodeURIComponent(segmentos[1]));
      if (!prod) throw new ErrorHttp('error.producto_no_existe', 404, { id: segmentos[1] });
      return responderJson(res, 200, { producto: prod });
    }

    // A partir de aqui requiere llave (Cubo Manager publica, ventas internas)
    if (!autorizado(req)) {
      responderError(res, 401, 'error.no_autorizado', idioma);
      return;
    }

    if (ruta === '/app.js' && metodo === 'GET') return servirEstatico(res, idioma, 'app.js', 'text/javascript; charset=utf-8');
    if (ruta === '/estilos.css' && metodo === 'GET') return servirEstatico(res, idioma, 'estilos.css', 'text/css; charset=utf-8');

    if (ruta === '/config-publica' && metodo === 'GET') {
      return responderJson(res, 200, { marca: config.marca, idioma, version: INFO_VERSION.version, biblioteca_url: config.bibliotecaUrl });
    }

    if (segmentos[0] === 'i18n' && metodo === 'GET') {
      const pedido = segmentos[1];
      if (!pedido || !(IDIOMAS_DISPONIBLES as readonly string[]).includes(pedido)) throw new ErrorHttp('error.parametro_invalido', 400, { parametro: 'idioma' });
      return responderJson(res, 200, { idioma: pedido, mensajes: diccionarioDe(pedido as Idioma) });
    }

    // ---- Productos (Cubo Manager -> Catalogo) ----
    if (segmentos[0] === 'productos' && metodo === 'POST' && segmentos.length === 1) {
      const cuerpo = await leerCuerpo(req, config.limiteSubidaBytes);
      let entrada: any;
      try {
        entrada = JSON.parse(cuerpo.toString('utf8'));
      } catch {
        throw new ErrorHttp('error.cuerpo_invalido', 400);
      }
      if (!entrada.nombre || !entrada.tipo_venta || typeof entrada.precio !== 'number') throw new ErrorHttp('error.parametro_invalido', 400, { parametro: 'nombre,tipo_venta,precio' });

      // Si viene activo_id, intentar verificar en Biblioteca (opcional, no bloquea)
      if (entrada.activo_id) {
        try {
          const activo = await obtenerActivoBiblioteca(config.bibliotecaUrl, config.bibliotecaLlave, entrada.activo_id);
          if (!activo) {
            // no existe pero no bloqueamos, solo aviso en mensaje
          }
        } catch (e) {
          if (e instanceof BibliotecaNoDisponibleError) {
            // Biblioteca no disponible, pero permitimos publicar igual (flujo offline)
          } else throw e;
        }
      }

      const producto = crearProducto(contexto, {
        nombre: entrada.nombre,
        descripcion: entrada.descripcion,
        categoria: entrada.categoria,
        etiquetas: entrada.etiquetas,
        imagenes: entrada.imagenes,
        especificaciones: entrada.especificaciones,
        tipo_venta: entrada.tipo_venta,
        precio: entrada.precio,
        moneda: entrada.moneda,
        contacto: entrada.contacto,
        activo_id: entrada.activo_id,
        estado: entrada.estado,
      });

      return responderJson(res, 201, { producto, mensaje: traducir(idioma, 'ui.publicado_ok') });
    }

    // ---- Ventas / Entregas (E6) ----
    if (segmentos[0] === 'ventas' && metodo === 'POST') {
      const cuerpo = await leerCuerpo(req, config.limiteSubidaBytes);
      let entrada: any;
      try {
        entrada = JSON.parse(cuerpo.toString('utf8'));
      } catch {
        throw new ErrorHttp('error.cuerpo_invalido', 400);
      }
      const { producto_id, cliente, tipo_pago, ubicacion, confirmacion, enlace } = entrada;
      if (!cliente?.nombre || !cliente?.email) throw new ErrorHttp('error.parametro_invalido', 400, { parametro: 'cliente.nombre,email' });

      let activo_id: string | null = null;
      if (producto_id) {
        const prod = obtenerProducto(db, producto_id);
        if (!prod) throw new ErrorHttp('error.producto_no_existe', 404, { id: producto_id });
        activo_id = prod.activo_id ?? null;
      } else if (entrada.activo_id) {
        activo_id = entrada.activo_id;
      }

      const entrega = crearEntrega(contexto, {
        producto_id: producto_id ?? null,
        activo_id,
        cliente_nombre: cliente.nombre,
        cliente_email: cliente.email,
        tipo_pago: tipo_pago === 'cuenta' ? 'cuenta' : 'paypal',
        ubicacion: ubicacion === 'pc' ? 'pc' : 'nube',
        confirmacion: confirmacion === 'manual' ? 'manual' : 'automatica',
        enlace: enlace ?? null,
      });

      return responderJson(res, 201, { entrega, mensaje: traducir(idioma, 'ui.venta_ok') });
    }

    if (segmentos[0] === 'entregas' && metodo === 'GET' && segmentos.length === 1) {
      const estado = url.searchParams.get('estado') ?? undefined;
      const entregas = listarEntregas(db, estado);
      return responderJson(res, 200, { entregas });
    }

    if (segmentos[0] === 'entregas' && segmentos[1] && metodo === 'GET') {
      const entrega = obtenerEntrega(db, decodeURIComponent(segmentos[1]));
      if (!entrega) throw new ErrorHttp('error.entrega_no_existe', 404, { id: segmentos[1] });
      return responderJson(res, 200, { entrega });
    }

    if (segmentos[0] === 'entregas' && segmentos[1] && segmentos[2] === 'aprobar' && metodo === 'POST') {
      const id = decodeURIComponent(segmentos[1]);
      const entrega = obtenerEntrega(db, id);
      if (!entrega) throw new ErrorHttp('error.entrega_no_existe', 404, { id });
      const actualizada = actualizarEntregaEstado(contexto, id, 'aprobada', 'Aprobada manualmente por el dueño');
      return responderJson(res, 200, { entrega: actualizada });
    }

    if (segmentos[0] === 'entregas' && segmentos[1] && segmentos[2] === 'enviar' && metodo === 'POST') {
      const id = decodeURIComponent(segmentos[1]);
      const entrega = obtenerEntrega(db, id);
      if (!entrega) throw new ErrorHttp('error.entrega_no_existe', 404, { id });
      // Simula envio: si pc, requiere PC encendida (verificamos Biblioteca como proxy de PC encendida)
      if (entrega.ubicacion === 'pc') {
        // Intentar verificar Biblioteca como señal de PC encendida
        try {
          if (entrega.activo_id) {
            await obtenerActivoBiblioteca(config.bibliotecaUrl, config.bibliotecaLlave, entrega.activo_id);
          }
        } catch (e) {
          if (e instanceof BibliotecaNoDisponibleError) {
            const actualizada = actualizarEntregaEstado(contexto, id, 'error', 'PC apagada - no se pudo enviar. Biblioteca no disponible. Se avisó al dueño.');
            return responderJson(res, 502, { entrega: actualizada, aviso: 'PC apagada - Biblioteca no disponible, se requiere encender PC' });
          }
        }
      }
      const enlaceFinal = entrega.enlace ?? `https://drive.example.com/${entrega.activo_id ?? entrega.producto_id}.zip`;
      const actualizada = actualizarEntregaEstado(contexto, id, 'enviada', 'Archivo enviado al cliente', enlaceFinal);
      return responderJson(res, 200, { entrega: actualizada });
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
