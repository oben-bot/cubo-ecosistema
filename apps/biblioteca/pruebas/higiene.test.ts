/** Higiene del codigo: sin rutas de usuario ni secretos escritos a mano (reglas 4, 5 y 8). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ_MODULO = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function archivosDe(dir: string): string[] {
  const salida: string[] = [];
  const pila = [dir];
  while (pila.length) {
    const actual = pila.pop() as string;
    for (const nombre of fs.readdirSync(actual)) {
      const ruta = path.join(actual, nombre);
      const estado = fs.statSync(ruta);
      if (estado.isDirectory()) pila.push(ruta);
      else if (/\.(ts|js|json|html)$/.test(nombre)) salida.push(ruta);
    }
  }
  return salida;
}

test('no hay rutas de usuario ni de maquina especifica en el codigo', () => {
  const fuentes = archivosDe(path.join(RAIZ_MODULO, 'src')).concat(
    archivosDe(path.join(RAIZ_MODULO, 'ui')),
  );
  const patrones = [/C:\\Users/i, /C:\\[A-Za-z]/i, /D:\\[A-Za-z]/i, /\/home\/[a-z0-9]/, /\/Users\/[a-z0-9]/i];
  for (const ruta of fuentes) {
    const contenido = fs.readFileSync(ruta, 'utf8');
    for (const patron of patrones) {
      assert.ok(!patron.test(contenido), `ruta escrita a mano en ${path.basename(ruta)}: ${patron}`);
    }
  }
});

test('no hay secretos ni tokens en el codigo ni en los ejemplos', () => {
  const ruta = path.join(RAIZ_MODULO, 'src');
  const ejemplos = [path.join(RAIZ_MODULO, 'marca.json.example'), path.join(RAIZ_MODULO, '.env.example')];
  const fuentes = archivosDe(ruta).concat(ejemplos.filter((e) => fs.existsSync(e)));
  const patrones = [
    /sk-[A-Za-z0-9]{16,}/,
    /AIza[0-9A-Za-z\-_]{20,}/,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /ghp_[A-Za-z0-9]{20,}/,
    /xox[baprs]-[A-Za-z0-9-]{10,}/,
  ];
  for (const rutaDe of fuentes) {
    const contenido = fs.readFileSync(rutaDe, 'utf8');
    for (const patron of patrones) {
      assert.ok(!patron.test(contenido), `posible secreto en ${path.basename(rutaDe)}: ${patron}`);
    }
  }
});

test('el .env.example no contiene valores reales', () => {
  const ruta = path.join(RAIZ_MODULO, '.env.example');
  const contenido = fs.readFileSync(ruta, 'utf8');
  for (const linea of contenido.split('\n')) {
    if (linea.trim().startsWith('#') || linea.trim() === '') continue;
    const [clave, valor] = linea.split('=');
    // Solo se permiten los valores genericos del contrato.
    const permitidos = ['127.0.0.1', '7101', 'es', '200', '512', 'ssd', '4'];
    if (valor !== undefined && valor.trim() !== '') {
      assert.ok(permitidos.includes(valor.trim()), `valor real en .env.example para ${clave}`);
    }
  }
});
