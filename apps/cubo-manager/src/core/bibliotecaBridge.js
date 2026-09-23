// Cliente HTTP de la Biblioteca real (apps/biblioteca, fase E1).
// Contrato: docs/ARQUITECTURA.md, seccion 3.2. Nunca escribe en su base de
// datos directamente: todo pasa por su API local.
const http = require('http');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const BASE_URL = process.env.BIBLIOTECA_URL || 'http://127.0.0.1:7101';
const API_KEY = process.env.BIBLIOTECA_KEY || '';
const TIMEOUT_MS = 4000;

class BibliotecaNoDisponibleError extends Error {
  constructor(mensaje, codigoHttp = null) {
    super(mensaje);
    this.name = 'BibliotecaNoDisponibleError';
    this.codigoHttp = codigoHttp;
  }
}

function mensajeSinConexion() {
  return (
    `No se pudo conectar con la Biblioteca en ${BASE_URL}. ` +
    `¿Esta corriendo? (entra a apps/biblioteca y corre "npm start")`
  );
}

function peticion(rutaConQuery, { binario = false } = {}) {
  return new Promise((resolve, reject) => {
    let base;
    try {
      base = new URL(BASE_URL);
    } catch {
      reject(new BibliotecaNoDisponibleError(`BIBLIOTECA_URL invalida: "${BASE_URL}"`));
      return;
    }

    const req = http.request(
      {
        hostname: base.hostname,
        port: base.port || (base.protocol === 'https:' ? 443 : 80),
        path: rutaConQuery,
        method: 'GET',
        headers: API_KEY ? { 'x-cubo-key': API_KEY } : {},
        timeout: TIMEOUT_MS,
      },
      (res) => {
        const trozos = [];
        res.on('data', (t) => trozos.push(t));
        res.on('end', () => {
          const buffer = Buffer.concat(trozos);
          const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 300;
          if (ok) {
            if (binario) {
              resolve({ buffer, contentType: res.headers['content-type'] || 'application/octet-stream' });
            } else {
              try {
                resolve(JSON.parse(buffer.toString('utf8')));
              } catch {
                reject(new BibliotecaNoDisponibleError('La Biblioteca devolvio una respuesta invalida.'));
              }
            }
            return;
          }
          let mensaje = `La Biblioteca respondio con un error (${res.statusCode}).`;
          try {
            const cuerpo = JSON.parse(buffer.toString('utf8'));
            if (cuerpo?.error?.mensaje) mensaje = cuerpo.error.mensaje;
          } catch {
            // sin cuerpo JSON, se usa el mensaje generico
          }
          reject(new BibliotecaNoDisponibleError(mensaje, res.statusCode));
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new BibliotecaNoDisponibleError(mensajeSinConexion()));
    });
    req.on('error', () => reject(new BibliotecaNoDisponibleError(mensajeSinConexion())));
    req.end();
  });
}

function aQueryString(params) {
  const partes = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return partes.length ? `?${partes.join('&')}` : '';
}

class BibliotecaBridge {
  /** Estado de conexion. Nunca lanza: la UI siempre debe poder mostrar algo. */
  async getEstado() {
    try {
      const salud = await peticion('/salud');
      return { conectada: true, url: BASE_URL, ...salud };
    } catch (error) {
      return { conectada: false, url: BASE_URL, mensaje: error.message };
    }
  }

  /** Busca activos por palabra clave, categoria o tipo. */
  async buscar({ q = '', categoria = '', tipo = '', espacio = '', limite = 60, offset = 0 } = {}) {
    const qs = aQueryString({ q, categoria, tipo, espacio, limite, offset });
    return peticion(`/activos${qs}`);
  }

  /** Ficha completa de un activo (nombre, categoria, medidas, material, licencia, etc). */
  async getFicha(id) {
    return peticion(`/activos/${encodeURIComponent(id)}`);
  }

  /** Miniatura del activo como data URL, lista para <img src=...>. */
  async getImagenBase64(id, indice = 0) {
    const { buffer, contentType } = await peticion(
      `/activos/${encodeURIComponent(id)}/miniatura?indice=${indice}`,
      { binario: true }
    );
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  }

  /**
   * Descarga el archivo de un activo y lo copia a la carpeta de evidencias
   * del trabajo, para producirlo sin modificar el original en la Biblioteca.
   */
  async descargarParaProduccion(id, trabajoId, rutaRelativa = null) {
    const ficha = await this.getFicha(id);
    const qs = rutaRelativa ? `?ruta=${encodeURIComponent(rutaRelativa)}` : '';
    const { buffer } = await peticion(`/activos/${encodeURIComponent(id)}/archivo${qs}`, { binario: true });

    const archivoInfo = rutaRelativa
      ? (ficha.archivos || []).find((a) => a.ruta_relativa === rutaRelativa)
      : (ficha.archivos || [])[0];
    const nombreArchivo = archivoInfo
      ? path.basename(archivoInfo.ruta_relativa)
      : `${id}.bin`;

    const destinoCarpeta = path.join(config.storageBase, 'Trabajos_Evidencias', `trabajo_${trabajoId}`);
    if (!fs.existsSync(destinoCarpeta)) fs.mkdirSync(destinoCarpeta, { recursive: true });
    const destinoArchivo = path.join(destinoCarpeta, nombreArchivo);
    fs.writeFileSync(destinoArchivo, buffer);

    return { success: true, ruta: destinoArchivo, nombre: nombreArchivo, ficha };
  }
}

module.exports = new BibliotecaBridge();
module.exports.BibliotecaNoDisponibleError = BibliotecaNoDisponibleError;
