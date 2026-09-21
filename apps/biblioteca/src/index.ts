/**
 * Arranque del servicio Biblioteca.
 *
 * Toda la configuracion sale de `.env` y `marca.json` (reglas 4 y 5 de AGENTS.md):
 * aqui no hay rutas, puertos ni nombres escritos a mano.
 */
import { cargarConfiguracion, ErrorConfiguracion, type Configuracion } from './config.ts';
import { cerrarContexto, type Contexto } from './contexto.ts';
import { VERSION_ESQUEMA_ACTUAL } from './db/index.ts';
import { cargarOGenerarLlave, NOMBRE_CABECERA } from './http/llave.ts';
import { traducir } from './i18n.ts';
import { escuchar, prepararServicio } from './servidor.ts';
import { INFO_VERSION } from './version.ts';

function registrarErrorConfiguracion(error: unknown): void {
  if (error instanceof ErrorConfiguracion) {
    process.stderr.write(`[biblioteca] ${error.codigo}: ${traducir('es', error.codigo, error.detalles)}\n`);
  } else {
    process.stderr.write(`[biblioteca] ${(error as Error).message}\n`);
  }
}

async function main(): Promise<void> {
  let config: Configuracion;
  try {
    config = cargarConfiguracion();
  } catch (error) {
    registrarErrorConfiguracion(error);
    process.exit(1);
  }

  const llave = cargarOGenerarLlave(config.rutaLlave, config.llave);

  let contexto: Contexto;
  let servidor: ReturnType<typeof prepararServicio>['servidor'];
  try {
    const preparado = prepararServicio(config, llave.llave);
    contexto = preparado.contexto;
    servidor = preparado.servidor;
  } catch (error) {
    registrarErrorConfiguracion(error);
    process.exit(1);
  }

  try {
    const { puerto } = await escuchar(servidor, config.host, config.puerto);
    const idioma = config.idioma;
    process.stdout.write(
      [
        `[biblioteca] ${INFO_VERSION.nombre} v${INFO_VERSION.version} (esquema ${VERSION_ESQUEMA_ACTUAL})`,
        `[biblioteca] escuchando en http://${config.host}:${puerto}`,
        `[biblioteca] datos en ${config.rutaBiblioteca}`,
        `[biblioteca] idioma ${idioma}${config.rutaMarca ? ` · marca ${config.marca.nombre}` : ' · marca generica'}`,
        `[biblioteca] cabecera de autenticacion: ${NOMBRE_CABECERA}`,
        llave.generada
          ? `[biblioteca] llave local generada y guardada en ${llave.ruta ?? '(memoria)'}: ${llave.llave}`
          : `[biblioteca] llave local cargada${llave.ruta ? ` de ${llave.ruta}` : ' desde la configuracion'}`,
        '',
      ].join('\n'),
    );
  } catch (error) {
    process.stderr.write(`[biblioteca] no se pudo iniciar el servicio: ${(error as Error).message}\n`);
    process.exit(1);
  }

  const apagar = (senal: string): void => {
    process.stdout.write(`[biblioteca] ${senal} recibido, cerrando...\n`);
    servidor.close(() => {
      cerrarContexto(contexto);
      process.exit(0);
    });
    // Si hay conexiones abiertas que no cierran, se forza la salida.
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on('SIGINT', () => apagar('SIGINT'));
  process.on('SIGTERM', () => apagar('SIGTERM'));
}

void main();
