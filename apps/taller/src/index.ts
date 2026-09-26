/**
 * Arranque del servicio Taller.
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
    process.stderr.write(`[taller] ${error.codigo}: ${traducir('es', error.codigo, error.detalles)}\n`);
  } else {
    process.stderr.write(`[taller] ${(error as Error).message}\n`);
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
        `[taller] ${INFO_VERSION.nombre} v${INFO_VERSION.version} (esquema ${VERSION_ESQUEMA_ACTUAL})`,
        `[taller] escuchando en http://${config.host}:${puerto}`,
        `[taller] datos en ${config.rutaTaller}`,
        `[taller] biblioteca en ${config.bibliotecaUrl}`,
        `[taller] idioma ${idioma}${config.rutaMarca ? ` · marca ${config.marca.nombre}` : ' · marca generica'}`,
        `[taller] cabecera de autenticacion: ${NOMBRE_CABECERA}`,
        llave.generada
          ? `[taller] llave local generada y guardada en ${llave.ruta ?? '(memoria)'}: ${llave.llave}`
          : `[taller] llave local cargada${llave.ruta ? ` de ${llave.ruta}` : ' desde la configuracion'}`,
        '',
      ].join('\n'),
    );
  } catch (error) {
    process.stderr.write(`[taller] no se pudo iniciar el servicio: ${(error as Error).message}\n`);
    process.exit(1);
  }

  const apagar = (senal: string): void => {
    process.stdout.write(`[taller] ${senal} recibido, cerrando...\n`);
    servidor.close(() => {
      cerrarContexto(contexto);
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on('SIGINT', () => apagar('SIGINT'));
  process.on('SIGTERM', () => apagar('SIGTERM'));
}

void main();
