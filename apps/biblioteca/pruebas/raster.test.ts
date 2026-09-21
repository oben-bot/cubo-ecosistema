/** Capturas SVG/DXF -> PNG. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { generarCaptura, puedeGenerarCaptura } from '../src/raster/captura.ts';
import { dimensionesPng, esPng } from '../src/raster/png.ts';
import { svgAGeometria } from '../src/raster/svg.ts';
import { dxfAGeometria } from '../src/raster/dxf.ts';
import { SVG_CAJA, DXF_LINEA } from './util.ts';

test('svg genera una geometria con varios trazos', () => {
  const geometria = svgAGeometria(SVG_CAJA.toString('utf8'));
  assert.ok(geometria.trazos.length >= 3, `espera al menos 3 trazos, obtuvo ${geometria.trazos.length}`);
});

test('captura svg produce un png valido y con contenido', () => {
  const png = generarCaptura({ formato: 'svg', contenido: SVG_CAJA, lado: 256 });
  assert.ok(png, 'deberia generar captura');
  assert.ok(esPng(png), 'debe ser un PNG');
  const dimensiones = dimensionesPng(png);
  assert.deepEqual(dimensiones, { ancho: 256, alto: 256 });
  // No puede ser un lienzo completamente en blanco: el PNG de la caja tiene trazo.
  assert.ok(png.length > 500, `el PNG deberia tener contenido, obtuvo ${png.length} bytes`);
});

test('captura dxf produce un png valido', () => {
  const geometria = dxfAGeometria(DXF_LINEA);
  assert.ok(geometria, 'el DXF deberia tener geometria');
  const png = generarCaptura({ formato: 'dxf', contenido: DXF_LINEA, lado: 128 });
  assert.ok(png && esPng(png));
});

test('formatos sin captura devuelven null', () => {
  assert.equal(puedeGenerarCaptura('stl'), false);
  assert.equal(generarCaptura({ formato: 'stl', contenido: Buffer.from('x'), lado: 64 }), null);
  assert.equal(puedeGenerarCaptura('svg'), true);
});

test('svg sin geometria no produce captura', () => {
  const vacio = svgAGeometria('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  assert.equal(vacio.trazos.length, 0);
  const png = generarCaptura({ formato: 'svg', contenido: Buffer.from('<svg xmlns="x"></svg>'), lado: 64 });
  assert.equal(png, null);
});
