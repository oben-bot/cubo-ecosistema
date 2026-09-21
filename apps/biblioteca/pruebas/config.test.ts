/** Configuracion por .env y marca.json, sin valores escritos a mano. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { analizarEnv, cargarConfiguracion, ErrorConfiguracion, leerMarca } from '../src/config.ts';

test('analizarEnv ignora comentarios y vacios y respeta comillas', () => {
  const resultado = analizarEnv(`# comentario\nA=1\nB="hola"\nC='x y'\nD=\n\nE=5`);
  assert.deepEqual(resultado, { A: '1', B: 'hola', C: 'x y', E: '5' });
});

test('valores por defecto del contrato', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
  const config = cargarConfiguracion({ cwd: raiz, env: {}, archivoEnv: null });
  assert.equal(config.puerto, 7101);
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.idioma, 'es');
  fs.rmSync(raiz, { recursive: true, force: true });
});

test('idioma y puerto vienen del entorno', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
  const config = cargarConfiguracion({ cwd: raiz, env: { BIBLIOTECA_PUERTO: '8001', BIBLIOTECA_IDIOMA: 'en' }, archivoEnv: null });
  assert.equal(config.puerto, 8001);
  assert.equal(config.idioma, 'en');
  fs.rmSync(raiz, { recursive: true, force: true });
});

test('idioma invalido lanza ErrorConfiguracion', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
  assert.throws(() => cargarConfiguracion({ cwd: raiz, env: { BIBLIOTECA_IDIOMA: 'xx' }, archivoEnv: null }), ErrorConfiguracion);
  fs.rmSync(raiz, { recursive: true, force: true });
});

test('sin marca.json arranca con marca generica; con marca.json la aplica', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
  const sinMarca = leerMarca(null);
  assert.equal(sinMarca.rutaUsada, null);
  assert.ok(sinMarca.marca.nombre.length > 0);

  fs.writeFileSync(path.join(raiz, 'marca.json'), JSON.stringify({ nombre: 'Mi Taller', idioma: 'en', colores: { primario: '#112233' } }));
  const conMarca = leerMarca(null);
  // leerMarca busca <cwd>/marca.json, no el tmp; por eso pasamos la ruta explicita.
  const explicita = leerMarca(path.join(raiz, 'marca.json'));
  assert.equal(explicita.marca.nombre, 'Mi Taller');
  assert.equal(explicita.marca.idioma, 'en');
  assert.equal(explicita.marca.colores.primario, '#112233');
  assert.ok(conMarca);
  fs.rmSync(raiz, { recursive: true, force: true });
});
