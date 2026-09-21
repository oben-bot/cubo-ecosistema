/** Importacion masiva: 200+ archivos con ZIP, duplicados y sin tocar el origen. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { zipSync } from 'fflate';

import { importarCarpeta } from '../src/importar.ts';
import { sha256DeArchivo } from '../src/hash.ts';
import { crearEntornoTemporal, SVG_CAJA } from './util.ts';

function svgVariante(i: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="10" y="10" width="${20 + (i % 60)}" height="40"/><circle cx="${20 + (i % 50)}" cy="60" r="${5 + (i % 10)}"/></svg>`,
    'utf8',
  );
}

interface EstadoFuente {
  ruta: string;
  mtime: number;
  sha: string;
}

function instantaneaCarpeta(raiz: string): EstadoFuente[] {
  const salida: EstadoFuente[] = [];
  const pila = [raiz];
  while (pila.length) {
    const dir = pila.pop() as string;
    for (const nombre of fs.readdirSync(dir)) {
      const ruta = path.join(dir, nombre);
      const estado = fs.statSync(ruta);
      if (estado.isDirectory()) pila.push(ruta);
      else salida.push({ ruta, mtime: estado.mtimeMs, sha: fs.readFileSync(ruta).toString('base64') });
    }
  }
  return salida;
}

test('importa 200+ archivos con zip y duplicados sin modificar el origen', async (t) => {
  const entorno = crearEntornoTemporal();
  t.after(entorno.limpiar);

  const fuente = fs.mkdtempSync(path.join(os.tmpdir(), 'fuente-'));
  fs.mkdirSync(path.join(fuente, 'cajas'));
  fs.mkdirSync(path.join(fuente, 'llaveros'));

  // 200 archivos svg repartidos en dos carpetas.
  for (let i = 0; i < 110; i += 1) fs.writeFileSync(path.join(fuente, 'cajas', `caja_${i}.svg`), svgVariante(i));
  for (let i = 0; i < 100; i += 1) fs.writeFileSync(path.join(fuente, 'llaveros', `llavero_${i}.svg`), svgVariante(200 + i));

  // Un ZIP con un diseno dentro.
  const zip = Buffer.from(zipSync({ 'diseno/caja.svg': new Uint8Array(SVG_CAJA) }));
  fs.writeFileSync(path.join(fuente, 'paquete.zip'), zip);

  // Un duplicado exacto de una caja ya existente.
  fs.writeFileSync(path.join(fuente, 'cajas', 'copia_de_caja_0.svg'), fs.readFileSync(path.join(fuente, 'cajas', 'caja_0.svg')));

  // Un formato no admitido que debe quedar omitido.
  fs.writeFileSync(path.join(fuente, 'leer.txt'), 'no es un diseno');

  const antes = instantaneaCarpeta(fuente);

  const informe = await importarCarpeta(entorno.contexto, { ruta: fuente, licencia: 'desconocida', origen: 'prueba-import' });

  // El origen no se ha movido ni modificado.
  const despues = instantaneaCarpeta(fuente);
  assert.equal(antes.length, despues.length, 'no deben crearse ni borrarse archivos en el origen');
  for (let i = 0; i < antes.length; i += 1) {
    assert.equal(antes[i].mtime, despues[i].mtime, `el mtime de ${antes[i].ruta} no debe cambiar`);
    assert.equal(antes[i].sha, despues[i].sha, `el contenido de ${antes[i].ruta} no debe cambiar`);
  }

  assert.equal(informe.escaneados, 213); // 210 svg + 1 zip + 1 duplicado + 1 txt
  assert.ok(informe.nuevos.length >= 211, `espera >=211 nuevos, obtuvo ${informe.nuevos.length}`);
  assert.equal(informe.duplicados.length, 1, 'el duplicado debe detectarse');
  assert.equal(informe.omitidos.length, 1, 'el .txt debe omitirse');
  assert.equal(informe.omitidos[0].motivo, 'motivo.formato_no_admitido');

  // La ficha del ZIP obtuvo miniatura por captura del diseno interior.
  const delZip = informe.nuevos.find((n) => n.ruta === 'paquete.zip');
  assert.ok(delZip, 'debe existir la ficha del zip');
  assert.equal(delZip?.con_miniatura, true);

  // Reimportar la misma carpeta no crea nada nuevo: todo duplicado.
  const segundo = await importarCarpeta(entorno.contexto, { ruta: fuente, licencia: 'desconocida' });
  assert.equal(segundo.nuevos.length, 0, 'la segunda importacion no debe crear fichas');
  assert.ok(segundo.duplicados.length >= 211, `espera todos duplicados, obtuvo ${segundo.duplicados.length}`);
});

test('importar dentro de la propia biblioteca se rechaza', async (t) => {
  const entorno = crearEntornoTemporal();
  t.after(entorno.limpiar);
  await assert.rejects(importarCarpeta(entorno.contexto, { ruta: entorno.config.rutaBiblioteca }), /ruta_dentro_de_biblioteca|error\.ruta_dentro_de_biblioteca/);
});
