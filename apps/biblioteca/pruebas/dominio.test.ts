/** Reglas de dominio: licencia/vendible_digital y enlace original/trabajo. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ErrorDominio,
  licenciaPermiteVentaDigital,
  normalizarEtiquetas,
  normalizarMedidas,
  validarEnlaceOriginal,
  validarMetadatos,
  validarVentaDigital,
} from '../src/dominio.ts';

test('vendible_digital solo con licencia propia o comercial_ok', () => {
  assert.doesNotThrow(() => validarVentaDigital('propia', true));
  assert.doesNotThrow(() => validarVentaDigital('comercial_ok', true));
  assert.doesNotThrow(() => validarVentaDigital('desconocida', false));
  assert.throws(() => validarVentaDigital('desconocida', true), ErrorDominio);
  assert.throws(() => validarVentaDigital('solo_personal', true), ErrorDominio);
  assert.equal(licenciaPermiteVentaDigital('solo_personal'), false);
});

test('un trabajo requiere original y un original no enlaza', () => {
  assert.throws(() => validarEnlaceOriginal('trabajo', null), ErrorDominio);
  assert.throws(() => validarEnlaceOriginal('original', 'act_000001'), ErrorDominio);
  assert.doesNotThrow(() => validarEnlaceOriginal('trabajo', 'act_000001'));
  assert.doesNotThrow(() => validarEnlaceOriginal('original', null));
});

test('metadatos completos exigen nombre, origen y licencia; vendible por defecto falso', () => {
  const metadatos = validarMetadatos({ nombre: 'Caja', origen: 'web', licencia: 'propia', tipo: 'laser2d' });
  assert.equal(metadatos.vendible_digital, false);
  assert.equal(metadatos.licencia, 'propia');
  assert.throws(() => validarMetadatos({ origen: 'x', licencia: 'propia' }), ErrorDominio); // sin nombre
  assert.throws(() => validarMetadatos({ nombre: 'x', licencia: 'propia' }), ErrorDominio); // sin origen
});

test('validarMetadatos rechaza vendible con licencia restrictiva', () => {
  assert.throws(
    () => validarMetadatos({ nombre: 'a', origen: 'o', licencia: 'desconocida', vendible_digital: true }),
    ErrorDominio,
  );
});

test('etiquetas se normalizan: minusculas, sin duplicados ni vacias', () => {
  assert.deepEqual(normalizarEtiquetas('Caja, caja ,  regalo'), ['caja', 'regalo']);
  assert.deepEqual(normalizarEtiquetas(['A', 'b', 'A']), ['a', 'b']);
  assert.throws(() => normalizarEtiquetas(['x'.repeat(80)]), ErrorDominio);
});

test('medidas invalidas lanzan error', () => {
  assert.throws(() => normalizarMedidas({ ancho: -5 }), ErrorDominio);
  assert.deepEqual(normalizarMedidas({ ancho: 100 }), { ancho: 100, alto: null, profundidad: null });
  assert.deepEqual(normalizarMedidas(null), { ancho: null, alto: null, profundidad: null });
});
