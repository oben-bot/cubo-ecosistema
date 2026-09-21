/** API HTTP: salud, autenticacion, busqueda con 5000 activos, alta multipart y reglas. */
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

import { crearServidor, escuchar } from '../src/servidor.ts';
import { crearEntornoTemporal, cuerpoMultipart, SVG_CAJA } from './util.ts';
import type { Entorno } from './util.ts';
import type { Server } from 'node:http';

const LLAVE = 'clave-de-prueba-0123456789abcdef';

let entorno: Entorno;
let servidor: Server;
let puerto = 0;

const base = () => `http://127.0.0.1:${puerto}`;

async function json(ruta: string, opciones: RequestInit = {}, conLlave = true): Promise<{ estado: number; datos: Record<string, unknown> }> {
  const respuesta = await fetch(`${base()}${ruta}`, {
    ...opciones,
    headers: { ...(conLlave ? { 'x-cubo-key': LLAVE } : {}), ...(opciones.headers ?? {}) },
  });
  let datos: Record<string, unknown> = {};
  const tipo = respuesta.headers.get('content-type') ?? '';
  if (tipo.includes('json')) datos = (await respuesta.json()) as Record<string, unknown>;
  return { estado: respuesta.status, datos };
}

before(async () => {
  entorno = crearEntornoTemporal();
  servidor = crearServidor({ contexto: entorno.contexto, llave: LLAVE });
  const escuchado = await escuchar(servidor, '127.0.0.1', 0);
  puerto = escuchado.puerto;
});

after(() => {
  servidor.close();
  entorno.limpiar();
});

test('GET /salud responde con la version sin autenticacion', async () => {
  const { estado, datos } = await json('/salud', {}, false);
  assert.equal(estado, 200);
  assert.equal(datos.version, '1.0.0');
  assert.ok(datos.estado);
  assert.ok(Array.isArray(datos.idiomas));
});

test('sin llave las rutas de datos devuelven 401', async () => {
  const { estado } = await json('/activos', {}, false);
  assert.equal(estado, 401);
});

test('alta multipart crea la ficha y devuelve 201', async () => {
  const { boundary, cuerpo } = cuerpoMultipart([
    { nombre: 'nombre', valor: 'Caja API' },
    { nombre: 'categoria', valor: 'cajas' },
    { nombre: 'origen', valor: 'prueba api' },
    { nombre: 'licencia', valor: 'propia' },
    { nombre: 'tipo', valor: 'laser2d' },
    { nombre: 'archivo', nombreArchivo: 'caja.svg', tipoContenido: 'image/svg+xml', datos: SVG_CAJA },
  ]);
  const { estado, datos } = await json('/activos', {
    method: 'POST',
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    body: new Uint8Array(cuerpo),
  });
  assert.equal(estado, 201);
  const activo = datos.activo as { id: string; nombre: string; imagenes: unknown[] };
  assert.equal(activo.nombre, 'Caja API');
  assert.ok(activo.imagenes.length >= 1);
});

test('vendible_digital con licencia invalida devuelve 409/400 por API', async () => {
  const { boundary, cuerpo } = cuerpoMultipart([
    { nombre: 'nombre', valor: 'Restrictiva' },
    { nombre: 'origen', valor: 'x' },
    { nombre: 'licencia', valor: 'solo_personal' },
    { nombre: 'vendible_digital', valor: '1' },
    { nombre: 'archivo', nombreArchivo: 'a.svg', tipoContenido: 'image/svg+xml', datos: SVG_CAJA },
  ]);
  const { estado } = await json('/activos', {
    method: 'POST',
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    body: new Uint8Array(cuerpo),
  });
  assert.ok(estado === 409 || estado === 400, `espera 400/409, obtuvo ${estado}`);
});

test('editar el espacio de un activo por API se rechaza', async () => {
  const busqueda = await json('/activos?q=caja');
  const primero = (busqueda.datos.activos as Array<{ id: string }>)[0];
  assert.ok(primero, 'debe existir una caja');
  const { estado } = await json(`/activos/${primero.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ espacio: 'trabajo' }),
  });
  assert.ok(estado === 409 || estado === 400, `espera rechazo, obtuvo ${estado}`);
});

test('la busqueda con 5000 activos tarda menos de 1 segundo', async () => {
  const { db } = entorno.contexto;
  // Inserta 5000 activos directamente para llenar el indice de busqueda.
  db.exec('BEGIN');
  const insertar = db.prepare(
    `INSERT INTO activos (id, tipo, espacio, nombre, categoria, origen, licencia, vendible_digital, ubicacion_almacen, creado, actualizado)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const insertarFts = db.prepare('INSERT INTO activos_fts (texto, activo_id) VALUES (?,?)');
  const ahora = new Date().toISOString();
  for (let i = 0; i < 5000; i += 1) {
    const id = `act_perf_${i}`;
    insertar.run(id, 'laser2d', 'original', `Diseno muestra ${i}`, 'muestras', 'origen perf', 'propia', 0, 'ssd', ahora, ahora);
    insertarFts.run(`Diseno muestra ${i} muestras`, id);
  }
  db.exec('COMMIT');

  const inicio = performance.now();
  const { estado, datos } = await json('/activos?q=muestra&limite=48');
  const duracion = performance.now() - inicio;
  assert.equal(estado, 200);
  assert.ok((datos.total as number) >= 5000, `espera >=5000 coincidencias, obtuvo ${datos.total}`);
  assert.equal((datos.activos as unknown[]).length, 48);
  assert.ok(duracion < 1000, `la busqueda tardo ${duracion.toFixed(1)} ms, debe ser < 1000 ms`);
});

test('el archivo de una ficha se puede descargar', async () => {
  const busqueda = await json('/activos?q=caja&limite=1');
  const primero = (busqueda.datos.activos as Array<{ id: string }>)[0];
  const respuesta = await fetch(`${base()}/activos/${primero.id}/archivo`, { headers: { 'x-cubo-key': LLAVE } });
  assert.equal(respuesta.status, 200);
  const contenido = Buffer.from(await respuesta.arrayBuffer());
  assert.ok(contenido.includes(Buffer.from('<svg')), 'debe devolver el svg original');
});
