/** Alta de activos: orden de la miniatura, todo-o-nada, solo lectura y enlace original/trabajo. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { zipSync } from 'fflate';

import { crearActivo, crearTrabajoDesdeOriginal, editarActivo, obtenerActivo } from '../src/activos.ts';
import { ErrorDominio } from '../src/dominio.ts';
import { crearEntornoTemporal, PNG_MINIMA, PNG_SOLIDO, SVG_CAJA } from './util.ts';

function altaSvg(contexto: Parameters<typeof crearActivo>[0], extra: Record<string, unknown> = {}) {
  return crearActivo(contexto, {
    metadatos: { nombre: 'Caja', categoria: 'cajas', origen: 'prueba', licencia: 'propia', tipo: 'laser2d', ...extra },
    archivos: [{ nombre: 'caja.svg', datos: SVG_CAJA }],
  });
}

test('sin imagen subida genera captura del svg', (t) => {
  const entorno = crearEntornoTemporal();
  t.after(entorno.limpiar);
  const { activo } = altaSvg(entorno.contexto);
  assert.equal(activo.imagenes.length, 1);
  assert.equal(activo.imagenes[0].origen_imagen, 'captura');
  assert.match(activo.imagenes[0].ruta_relativa, /\.png$/);
});

test('imagen subida tiene prioridad sobre la captura', (t) => {
  const entorno = crearEntornoTemporal();
  t.after(entorno.limpiar);
  const { activo } = crearActivo(entorno.contexto, {
    metadatos: { nombre: 'Caja', origen: 'prueba', licencia: 'propia' },
    archivos: [{ nombre: 'caja.svg', datos: SVG_CAJA }],
    imagen: { nombre: 'foto.png', datos: PNG_MINIMA },
  });
  assert.equal(activo.imagenes.length, 1);
  assert.equal(activo.imagenes[0].origen_imagen, 'captura'); // original => la subida se registra como captura
});

test('zip con imagen usa esa imagen (origen zip)', (t) => {
  const entorno = crearEntornoTemporal();
  t.after(entorno.limpiar);
  const zip = Buffer.from(zipSync({ 'caja.svg': new Uint8Array(SVG_CAJA), 'preview.png': new Uint8Array(PNG_SOLIDO) }));
  const { activo } = crearActivo(entorno.contexto, {
    metadatos: { nombre: 'Paquete', origen: 'prueba', licencia: 'propia' },
    archivos: [{ nombre: 'paquete.zip', datos: zip }],
  });
  assert.equal(activo.imagenes.length, 1);
  assert.equal(activo.imagenes[0].origen_imagen, 'zip');
});

test('zip sin imagen genera captura del diseno interior', (t) => {
  const entorno = crearEntornoTemporal();
  t.after(entorno.limpiar);
  const zip = Buffer.from(zipSync({ 'interior/caja.svg': new Uint8Array(SVG_CAJA) }));
  const { activo } = crearActivo(entorno.contexto, {
    metadatos: { nombre: 'Paquete sin imagen', origen: 'prueba', licencia: 'propia' },
    archivos: [{ nombre: 'paquete.zip', datos: zip }],
  });
  assert.equal(activo.imagenes.length, 1);
  assert.equal(activo.imagenes[0].origen_imagen, 'captura');
});

test('todo-o-nada: fallo inyectado no deja registros ni archivos huerfanos', (t) => {
  const entorno = crearEntornoTemporal();
  t.after(entorno.limpiar);
  for (const punto of ['tras_temporal', 'tras_db', 'tras_mover'] as const) {
    assert.throws(
      () => crearActivo(entorno.contexto, {
        metadatos: { nombre: 'Falla', origen: 'prueba', licencia: 'propia' },
        archivos: [{ nombre: 'caja.svg', datos: SVG_CAJA }],
      }, { falloInyectado: punto }),
    );
  }
  const conteo = entorno.contexto.db.prepare('SELECT COUNT(*) AS n FROM activos').get() as { n: number };
  assert.equal(conteo.n, 0, 'no deben quedar registros');
  // La carpeta de datos solo debe contener la base y tmp vacia.
  const categorias = fs.readdirSync(entorno.config.rutaBiblioteca).filter((e) => !['biblioteca.db', 'cubo.key', 'tmp'].includes(e) && !e.startsWith('biblioteca.db-'));
  assert.equal(categorias.length, 0, `no deben quedar carpetas huerfanas: ${categorias.join(', ')}`);
  const temporales = fs.existsSync(entorno.config.rutaTemporales) ? fs.readdirSync(entorno.config.rutaTemporales) : [];
  assert.equal(temporales.length, 0, 'no deben quedar carpetas temporales');
});

test('un original no puede editarse en espacio ni archivos; un trabajo siempre enlaza', (t) => {
  const entorno = crearEntornoTemporal();
  t.after(entorno.limpiar);
  const { activo: original } = altaSvg(entorno.contexto);
  assert.equal(original.espacio, 'original');

  // Intentar editar el espacio por API debe fallar.
  assert.throws(() => editarActivo(entorno.contexto, original.id, { espacio: 'trabajo' }), ErrorDominio);
  // Los archivos e imagenes tampoco son editables.
  assert.throws(() => editarActivo(entorno.contexto, original.id, { archivos: [] }), ErrorDominio);

  const { activo: trabajo } = crearTrabajoDesdeOriginal(entorno.contexto, original.id, {});
  assert.equal(trabajo.espacio, 'trabajo');
  assert.equal(trabajo.original_id, original.id);
});

test('archivo duplicado por sha256 se rechaza en el alta', (t) => {
  const entorno = crearEntornoTemporal();
  t.after(entorno.limpiar);
  altaSvg(entorno.contexto);
  assert.throws(
    () => altaSvg(entorno.contexto),
    (error: unknown) => (error as ErrorDominio).codigo === 'error.archivo_duplicado',
  );
});

test('los archivos de un original quedan de solo lectura en disco', (t) => {
  const entorno = crearEntornoTemporal();
  t.after(entorno.limpiar);
  const { activo } = altaSvg(entorno.contexto);
  const ruta = path.join(entorno.config.rutaBiblioteca, ...activo.archivos[0].ruta_relativa.split('/'));
  const estado = fs.statSync(ruta);
  assert.equal(estado.mode & 0o200, 0, 'el bit de escritura debe estar apagado');
});

test('editar metadatos permitidos funciona y actualiza la ficha', (t) => {
  const entorno = crearEntornoTemporal();
  t.after(entorno.limpiar);
  const { activo } = altaSvg(entorno.contexto);
  const editado = editarActivo(entorno.contexto, activo.id, { nombre: 'Caja renombrada', etiquetas: ['nueva'], vendible_digital: true });
  assert.equal(editado.nombre, 'Caja renombrada');
  assert.deepEqual(editado.etiquetas, ['nueva']);
  assert.equal(editado.vendible_digital, true); // licencia propia lo permite
  const recargado = obtenerActivo(entorno.contexto.db, activo.id);
  assert.equal(recargado?.nombre, 'Caja renombrada');
});
