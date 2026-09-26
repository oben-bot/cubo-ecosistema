import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarConfiguracion } from '../src/config.ts';

test('configuracion por defecto usa puerto 7102 y host 127.0.0.1', () => {
  const config = cargarConfiguracion({ cwd: '/tmp', env: {} });
  assert.equal(config.puerto, 7102);
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.bibliotecaUrl, 'http://127.0.0.1:7101');
});

test('configuracion respeta variables TALLER_', () => {
  const config = cargarConfiguracion({
    cwd: '/tmp',
    env: { TALLER_PUERTO: '7202', TALLER_BIBLIOTECA_URL: 'http://127.0.0.1:7101' },
  });
  assert.equal(config.puerto, 7202);
});
