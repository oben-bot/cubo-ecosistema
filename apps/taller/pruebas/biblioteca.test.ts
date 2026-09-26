import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { guardarEnBiblioteca, BibliotecaNoDisponibleError } from '../src/biblioteca/cliente.ts';

test('guardarEnBiblioteca avisa con claridad si Biblioteca no esta corriendo', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taller-bib-'));
  const archivo = path.join(tmp, 'test.svg');
  fs.writeFileSync(archivo, '<svg></svg>');

  try {
    await guardarEnBiblioteca({
      bibliotecaUrl: 'http://127.0.0.1:59999', // puerto que no existe
      bibliotecaLlave: null,
      archivoAbsoluto: archivo,
      nombre: 'Test',
      medidas_mm: { ancho: 10, alto: 10 },
      receta: { constructor: 'texto' },
      formato: 'svg',
    });
    assert.fail('deberia haber lanzado BibliotecaNoDisponibleError');
  } catch (e) {
    assert.ok(e instanceof BibliotecaNoDisponibleError, 'debe ser BibliotecaNoDisponibleError');
    const err = e as BibliotecaNoDisponibleError;
    assert.equal(err.codigo, 'error.biblioteca_no_disponible');
    assert.ok(err.message.includes('Biblioteca'), 'mensaje debe mencionar Biblioteca');
    assert.ok(err.message.includes('127.0.0.1:59999') || err.message.includes('¿Esta corriendo?'), 'mensaje debe ser claro');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
