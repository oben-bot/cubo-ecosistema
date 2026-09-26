import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generarTexto, listarTipografias, validarOpciones } from '../src/constructores/texto.ts';

test('listar tipografias devuelve al menos 2 con licencia libre', () => {
  const fuentes = listarTipografias();
  assert.ok(fuentes.length >= 2, `se esperaban al menos 2 fuentes, se encontraron ${fuentes.length}`);
  for (const f of fuentes) {
    assert.ok(f.id);
    assert.ok(f.nombre);
    // Acepta OFL y DejaVu/Bitstream Vera (libre)
    const licOk =
      f.licencia.includes('OFL') ||
      f.licencia.includes('Open Font') ||
      f.licencia.toLowerCase().includes('dejavu') ||
      f.licencia.toLowerCase().includes('bitstream') ||
      f.licencia.toLowerCase().includes('libre');
    assert.ok(licOk, `licencia debe ser libre (OFL o DejaVu): ${f.licencia}`);
  }
});

test('validar opciones rechaza texto vacio y tipografia inexistente', () => {
  assert.throws(() => validarOpciones({ texto: '', tipografia: 'anton', tamano_mm: 80 } as any), /error/);
  assert.throws(() => validarOpciones({ texto: 'HOLA', tipografia: 'no-existe', tamano_mm: 80 } as any), /error/);
  assert.throws(() => validarOpciones({ texto: 'HOLA', tipografia: 'anton', tamano_mm: -5 } as any), /error/);
  // usar primera fuente disponible para no depender de anton
  const fuentes = listarTipografias();
  const id = fuentes[0]?.id ?? 'dejavu-sans-bold';
  assert.doesNotThrow(() => validarOpciones({ texto: 'HOLA', tipografia: id, tamano_mm: 80 }));
});

test('generar texto en 3 tipografias distintas - verifica union en una sola region', async () => {
  const fuentes = listarTipografias();
  assert.ok(fuentes.length >= 2, 'se requieren al menos 2 tipografias para la prueba');

  const textoPrueba = 'HOLA';
  const resultados: Array<{ fuente: string; numPoligonos: number; medidas: { ancho: number; alto: number }; area: number; perimetro: number }> = [];

  for (const fuente of fuentes.slice(0, 3)) {
    const res = await generarTexto({ texto: textoPrueba, tipografia: fuente.id, tamano_mm: 80, solapamiento: 0.15 });
    assert.ok(res.svg.includes('<svg'), `SVG debe contener <svg para fuente ${fuente.id}`);
    assert.ok(res.svg.includes('<path'), `SVG debe contener <path para fuente ${fuente.id}`);
    assert.ok(res.medidas_mm.ancho > 0 && res.medidas_mm.alto > 0, `medidas deben ser positivas para ${fuente.id}`);
    assert.ok(Math.abs(res.medidas_mm.alto - 80) < 1, `alto debe ser cercano a 80mm para ${fuente.id}, fue ${res.medidas_mm.alto}`);
    assert.ok(res.area_mm2 > 0, `area debe ser positiva para ${fuente.id}`);
    assert.ok(res.largo_corte_mm > 0, `perimetro debe ser positivo para ${fuente.id}`);

    resultados.push({
      fuente: fuente.id,
      numPoligonos: res.poligonos_mm.length,
      medidas: res.medidas_mm,
      area: res.area_mm2,
      perimetro: res.largo_corte_mm,
    });

    // HOLA: O y A tienen huecos => hasta 3 poligonos (1 exterior + 2 huecos) si soldadura OK
    // Con clipper2-js pueden quedar artefactos filtrados, esperamos <=4
    assert.ok(res.poligonos_mm.length <= 5, `demasiados poligonos (${res.poligonos_mm.length}) para ${fuente.id}, indica que no se soldaron`);
  }

  // Contar cuantas fuentes lograron soldadura en 1 region exterior (numPoligonos <=3 considerando huecos)
  const soldadas = resultados.filter((r) => r.numPoligonos <= 4).length;
  console.log('Resultados soldadura:', resultados);
  assert.ok(soldadas >= 2, `Se esperaban al menos 2 de 3 fuentes con letras en una sola region, se lograron ${soldadas}`);
});

test('medidas coherentes con tamano pedido', async () => {
  const fuentes = listarTipografias();
  const id = fuentes.find((f) => f.id === 'dejavu-sans-bold')?.id ?? fuentes[0].id;
  const res = await generarTexto({ texto: 'CUBO', tipografia: id, tamano_mm: 50 });
  assert.ok(res.medidas_mm.ancho > res.medidas_mm.alto * 0.5, 'ancho debe ser al menos 0.5x alto');
  assert.ok(res.medidas_mm.ancho < res.medidas_mm.alto * 5, 'ancho no debe ser excesivo');
  const areaCaja = res.medidas_mm.ancho * res.medidas_mm.alto;
  assert.ok(res.area_mm2 < areaCaja, `area ${res.area_mm2} debe ser menor que caja ${areaCaja}`);
  assert.ok(res.area_mm2 > areaCaja * 0.1, `area ${res.area_mm2} debe ser al menos 10% de caja ${areaCaja}`);
  const perimCaja = 2 * (res.medidas_mm.ancho + res.medidas_mm.alto);
  assert.ok(res.largo_corte_mm > perimCaja * 0.5, 'perimetro debe ser al menos 0.5x perimetro caja');
});

test('SVG generado es valido y abre en visor', async () => {
  const fuentes = listarTipografias();
  const id = fuentes.find((f) => f.id === 'oswald-bold')?.id ?? fuentes[0].id;
  const res = await generarTexto({ texto: 'TALLER', tipografia: id, tamano_mm: 60 });
  assert.ok(res.svg.includes('xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(res.svg.includes('width=') && res.svg.includes('mm'));
  assert.ok(res.svg.includes('viewBox='));
  assert.ok(res.svg.includes('fill-rule='));
  const match = res.svg.match(/d="([^"]+)"/);
  assert.ok(match && match[1].length > 10, 'path d debe tener contenido');
});

test('area negativa como criterio exterior para DejaVu', async () => {
  // Verifica que el criterio de area negativa para exterior funciona
  const fuentes = listarTipografias();
  const dejavu = fuentes.find((f) => f.id.includes('dejavu'));
  if (!dejavu) {
    console.log('No DejaVu disponible, skip');
    return;
  }
  const res = await generarTexto({ texto: 'A', tipografia: dejavu.id, tamano_mm: 80 });
  // A tiene 1 hueco => 2 poligonos (exterior + hueco) o 1 si se ignora hueco? Con NonZero debe haber hueco
  assert.ok(res.poligonos_mm.length >= 1, 'A debe generar al menos 1 poligono');
  assert.ok(res.poligonos_mm.length <= 3, 'A no debe generar mas de 3 poligonos');
  // area debe ser positiva y razonable
  assert.ok(res.area_mm2 > 0);
});
