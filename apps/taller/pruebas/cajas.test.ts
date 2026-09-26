import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generarCaja, validarOpcionesCaja } from '../src/constructores/cajas.ts';

test('validar opciones caja rechaza medidas invalidas', () => {
  assert.throws(() => validarOpcionesCaja({ ancho_mm: 0, alto_mm: 10, profundidad_mm: 10 } as any), /error/);
  assert.throws(() => validarOpcionesCaja({ ancho_mm: 10, alto_mm: -5, profundidad_mm: 10 } as any), /error/);
  assert.doesNotThrow(() => validarOpcionesCaja({ ancho_mm: 100, alto_mm: 60, profundidad_mm: 80 }));
});

test('generar caja abierta 100x60x80', async () => {
  const res = await generarCaja({ ancho_mm: 100, alto_mm: 60, profundidad_mm: 80, grosor_mm: 3, tipo: 'abierta' });
  assert.ok(res.svg.includes('<svg'), 'SVG debe contener <svg');
  assert.ok(res.svg.includes('<path'), 'SVG debe contener <path');
  assert.ok(res.medidas_mm.ancho > 0 && res.medidas_mm.alto > 0, 'medidas positivas');
  assert.ok(res.area_mm2 > 0, 'area positiva');
  assert.ok(res.largo_corte_mm > 0, 'perimetro positivo');
  assert.ok(res.poligonos_mm.length >= 5, 'caja abierta debe tener al menos 5 caras');
  // Area debe ser suma de caras: 100*80 + 2*100*60 + 2*80*60 = 8000+12000+9600=29600 aprox
  const areaEsperada = 100 * 80 + 2 * 100 * 60 + 2 * 80 * 60;
  assert.ok(Math.abs(res.area_mm2 - areaEsperada) < 500, `area ${res.area_mm2} debe ser cercana a ${areaEsperada}`);
});

test('generar caja con tapa 100x60x80', async () => {
  const res = await generarCaja({ ancho_mm: 100, alto_mm: 60, profundidad_mm: 80, tipo: 'con_tapa' });
  assert.ok(res.poligonos_mm.length >= 6, 'caja con tapa debe tener 6 caras');
  assert.ok(res.svg.includes('tapa'), 'SVG debe incluir label tapa');
});

test('caja medidas coherentes con kerf', async () => {
  const res = await generarCaja({ ancho_mm: 50, alto_mm: 30, profundidad_mm: 40, kerf_mm: 0.2 });
  assert.ok(res.medidas_mm.ancho > 50, 'ancho total debe ser mayor que ancho cara por layout');
  assert.ok(res.largo_corte_mm > 2 * (res.medidas_mm.ancho + res.medidas_mm.alto) * 0.5, 'perimetro razonable');
});
