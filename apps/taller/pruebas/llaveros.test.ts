import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generarLlavero, validarOpcionesLlavero } from '../src/constructores/llaveros.ts';

test('validar opciones llavero rechaza texto vacio', () => {
  assert.throws(() => validarOpcionesLlavero({ texto: '' } as any), /error/);
  assert.throws(() => validarOpcionesLlavero({ texto: 'HOLA', tamano_mm: 5 } as any), /error/);
  assert.doesNotThrow(() => validarOpcionesLlavero({ texto: 'HOLA', tamano_mm: 40 }));
});

test('generar llavero circular con texto', async () => {
  const res = await generarLlavero({ texto: 'CUBO', forma: 'circular', tamano_mm: 40, tipografia: 'dejavu-sans-bold' });
  assert.ok(res.svg.includes('<svg'), 'SVG debe contener <svg');
  assert.ok(res.svg.includes('<path'), 'SVG debe contener <path');
  assert.ok(res.medidas_mm.ancho > 0 && res.medidas_mm.alto > 0, 'medidas positivas');
  assert.ok(res.area_mm2 > 0, 'area positiva');
  assert.ok(res.largo_corte_mm > 0, 'perimetro positivo');
  assert.ok(Math.abs(res.medidas_mm.ancho - 40) < 5, `ancho debe ser cercano a 40, fue ${res.medidas_mm.ancho}`);
});

test('generar llavero rectangular', async () => {
  const res = await generarLlavero({ texto: 'A', forma: 'rectangular', tamano_mm: 50 });
  assert.ok(res.svg.includes('<svg'));
  assert.ok(res.medidas_mm.ancho > 0);
});

test('generar llavero hueso', async () => {
  const res = await generarLlavero({ texto: 'PET', forma: 'hueso', tamano_mm: 60 });
  assert.ok(res.svg.includes('<svg'));
  assert.ok(res.area_mm2 > 0);
});

test('llavero sin agujero', async () => {
  const res = await generarLlavero({ texto: 'TEST', forma: 'circular', tamano_mm: 40, incluir_agujero: false });
  assert.ok(res.svg.includes('<svg'));
  // sin agujero, area debe ser mayor que con agujero? no testeamos exacto, solo que genera
  assert.ok(res.area_mm2 > 0);
});
