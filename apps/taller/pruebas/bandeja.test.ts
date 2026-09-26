import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { crearEntornoTemporal, SVG_SIMPLE } from './util.ts';
import { depositarEnBandeja, listarBandeja, obtenerBandeja, descartarBandeja, contarBandeja } from '../src/bandeja/modelo.ts';

test('bandeja: depositar, listar, obtener y descartar borra archivo sin huerfanos', () => {
  const entorno = crearEntornoTemporal();
  try {
    const depositado = depositarEnBandeja(entorno.contexto, {
      archivo: SVG_SIMPLE,
      formato: 'svg',
      medidas_mm: { ancho: 100, alto: 50 },
      receta: { constructor: 'texto', texto: 'HOLA', tipografia: 'anton', tamano_mm: 80 },
      constructor: 'texto',
      largo_corte_mm: 300,
      area_mm2: 5000,
    });

    assert.ok(depositado.id.startsWith('ban_'));
    assert.equal(depositado.constructor, 'texto');
    assert.equal(depositado.formato, 'svg');
    assert.deepEqual(depositado.medidas_mm, { ancho: 100, alto: 50, profundidad: null });

    const lista = listarBandeja(entorno.contexto.db, 'pendiente');
    assert.equal(lista.length, 1);
    assert.equal(lista[0].id, depositado.id);

    const obtenido = obtenerBandeja(entorno.contexto.db, depositado.id);
    assert.ok(obtenido);
    assert.equal(obtenido?.id, depositado.id);

    const rutaAbs = path.join(entorno.config.rutaBandeja, depositado.archivo_ruta);
    assert.ok(fs.existsSync(rutaAbs), 'archivo temporal debe existir');

    const conteo = contarBandeja(entorno.contexto.db);
    assert.equal(conteo.pendientes, 1);

    // descartar
    descartarBandeja(entorno.contexto, depositado.id);

    assert.ok(!fs.existsSync(rutaAbs), 'archivo temporal debe borrarse al descartar');
    const lista2 = listarBandeja(entorno.contexto.db, 'pendiente');
    assert.equal(lista2.length, 0);
    const conteo2 = contarBandeja(entorno.contexto.db);
    assert.equal(conteo2.pendientes, 0);
  } finally {
    entorno.limpiar();
  }
});

test('bandeja: medidas invalidas lanzan error', () => {
  const entorno = crearEntornoTemporal();
  try {
    assert.throws(() =>
      depositarEnBandeja(entorno.contexto, {
        archivo: SVG_SIMPLE,
        formato: 'svg',
        medidas_mm: { ancho: -10, alto: 0 } as any,
        receta: { constructor: 'texto' },
        constructor: 'texto',
      }),
    );
  } finally {
    entorno.limpiar();
  }
});

test('bandeja: formato no admitido lanza error', () => {
  const entorno = crearEntornoTemporal();
  try {
    assert.throws(() =>
      depositarEnBandeja(entorno.contexto, {
        archivo: SVG_SIMPLE,
        formato: 'exe',
        medidas_mm: { ancho: 10, alto: 10 },
        receta: { constructor: 'texto' },
        constructor: 'texto',
      }),
    );
  } finally {
    entorno.limpiar();
  }
});
