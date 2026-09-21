/** Traduccion: paridad es/en y cobertura de las claves usadas por la interfaz y el codigo. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DICCIONARIOS, traducir } from '../src/i18n.ts';

const DIRECTORIO_ACTUAL = path.dirname(fileURLToPath(import.meta.url));

test('es y en tienen exactamente las mismas claves', () => {
  const es = Object.keys(DICCIONARIOS.es).sort();
  const en = Object.keys(DICCIONARIOS.en).sort();
  assert.deepEqual(en, es);
});

test('las familias dinamicas de la interfaz estan completas en es', () => {
  const requeridas = [
    'ui.espacio.original', 'ui.espacio.trabajo',
    'ui.tipo.laser2d', 'ui.tipo.modelo3d', 'ui.tipo.software', 'ui.tipo.app', 'ui.tipo.otro',
    'ui.licencia.propia', 'ui.licencia.comercial_ok', 'ui.licencia.solo_personal', 'ui.licencia.desconocida',
    'ui.ubicacion.ssd', 'ui.ubicacion.hdd', 'ui.ubicacion.nube',
    'ui.origen_imagen.zip', 'ui.origen_imagen.web', 'ui.origen_imagen.captura', 'ui.origen_imagen.foto_terminado',
  ];
  for (const clave of requeridas) {
    assert.ok(DICCIONARIOS.es[clave], `falta la clave ${clave} en es`);
  }
});

test('toda clave data-i18n del HTML y t("...") del JS existe en es', () => {
  const ui = path.join(DIRECTORIO_ACTUAL, '..', 'ui');
  const html = fs.readFileSync(path.join(ui, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(ui, 'app.js'), 'utf8');

  const claves = new Set<string>();
  for (const coincidencia of html.matchAll(/data-i18n(?:-placeholder)?="([^"]+)"/g)) claves.add(coincidencia[1]);
  for (const coincidencia of js.matchAll(/\bt\('([\w.]+)'\)/g)) claves.add(coincidencia[1]);
  // Plantillas literales t(`ui.espacio.${activo.espacio}`) etc.: se comprueban por familia arriba.

  const faltantes = [...claves].filter((clave) => !DICCIONARIOS.es[clave]);
  assert.deepEqual(faltantes, [], `claves sin traduccion en es: ${faltantes.join(', ')}`);
});

test('traducir interpola variables y recae en es para zh', () => {
  const conVariables = traducir('es', 'ui.resultados', { total: 42 });
  assert.equal(conVariables, '42 resultados');
  // zh no define esta clave => debe recaer en es.
  const zh = traducir('zh', 'error.campo_obligatorio', { campo: 'nombre' });
  assert.match(zh, /nombre/);
});
