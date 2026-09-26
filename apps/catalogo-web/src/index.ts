import * as fs from 'node:fs';
import * as path from 'node:path';
import { cargarConfiguracion } from './config.ts';
import { crearContexto } from './contexto.ts';
import { crearServidor, escuchar } from './servidor.ts';
import { generarLlave } from './http/llave.ts';
import { INFO_VERSION } from './version.ts';

async function main(): Promise<void> {
  const config = cargarConfiguracion({ cwd: process.cwd() });

  fs.mkdirSync(config.rutaCatalogo, { recursive: true });

  let llave: string;
  if (config.llave) {
    llave = config.llave;
  } else if (fs.existsSync(config.rutaLlave)) {
    llave = fs.readFileSync(config.rutaLlave, 'utf8').trim();
    if (!llave) {
      llave = generarLlave();
      fs.writeFileSync(config.rutaLlave, llave, { mode: 0o600 });
    }
  } else {
    llave = generarLlave();
    fs.writeFileSync(config.rutaLlave, llave, { mode: 0o600 });
  }

  const contexto = crearContexto(config);
  const servidor = crearServidor({ contexto, llave });

  const { puerto, host } = await escuchar(servidor, config.host, config.puerto);
  console.log(`[${INFO_VERSION.nombre}] v${INFO_VERSION.version} escuchando en http://${host}:${puerto}`);
  console.log(`  Biblioteca: ${config.bibliotecaUrl}`);
  console.log(`  Ruta datos: ${config.rutaCatalogo}`);
  console.log(`  Llave: ${config.rutaLlave} (X-Cubo-Key)`);
}

main().catch((error) => {
  console.error('Error fatal arrancando catalogo-web:', error);
  process.exit(1);
});
