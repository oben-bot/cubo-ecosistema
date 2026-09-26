/**
 * Constructor de texto conectado — v2
 * Usa opentype.js@1.2.1 (no 2.0.0, rompe con DejaVu) y clipper2-js@1.2.4
 * Criterio de contorno exterior: area negativa (para DejaVu y OFL probadas)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { obtenerFuente, listarFuentes } from './fuentes.ts';

const DIR_ACTUAL = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

interface Punto {
  x: number;
  y: number;
}
type Poligono = Punto[];

export interface OpcionesTexto {
  texto: string;
  tipografia: string;
  tamano_mm: number;
  solapamiento?: number;
  tolerancia_curva?: number;
}

export interface ResultadoTexto {
  svg: string;
  medidas_mm: { ancho: number; alto: number };
  largo_corte_mm: number;
  area_mm2: number;
  poligonos_mm: Poligono[];
  receta: {
    constructor: 'texto';
    texto: string;
    tipografia: string;
    tamano_mm: number;
    solapamiento: number;
    fuente: { id: string; nombre: string; licencia: string };
    medidas_mm: { ancho: number; alto: number };
    largo_corte_mm: number;
    area_mm2: number;
    generado: string;
  };
  debug: {
    num_contornos_originales: number;
    num_poligonos_union: number;
    fuente_archivo: string;
    bbox_px: { minX: number; minY: number; maxX: number; maxY: number; ancho: number; alto: number };
    escala_mm_por_px: number;
  };
}

let opentypeModulo: any = null;
let clipperModulo: any = null;

function cargarOpentype(): any {
  if (opentypeModulo) return opentypeModulo;
  // opentype.js@1.2.1 es CommonJS
  const mod = require('opentype.js');
  opentypeModulo = (mod as any).default ?? mod;
  return opentypeModulo;
}

function cargarClipper(): any {
  if (clipperModulo) return clipperModulo;
  // clipper2-js@1.2.4
  const mod = require('clipper2-js');
  clipperModulo = mod;
  return clipperModulo;
}

// Geometria

function distanciaPuntoALinea(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = ((px - x1) * dx + (py - y1) * dy) / len2;
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

function flattenQuadratic(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tolerancia: number,
): Punto[] {
  const resultado: Punto[] = [];
  const stack: Array<{ x0: number; y0: number; x1: number; y1: number; x2: number; y2: number }> = [
    { x0, y0, x1, y1, x2, y2 },
  ];
  while (stack.length > 0) {
    const seg = stack.pop()!;
    const d = distanciaPuntoALinea(seg.x1, seg.y1, seg.x0, seg.y0, seg.x2, seg.y2);
    if (d <= tolerancia) {
      resultado.push({ x: seg.x2, y: seg.y2 });
    } else {
      const x01 = (seg.x0 + seg.x1) / 2;
      const y01 = (seg.y0 + seg.y1) / 2;
      const x12 = (seg.x1 + seg.x2) / 2;
      const y12 = (seg.y1 + seg.y2) / 2;
      const x012 = (x01 + x12) / 2;
      const y012 = (y01 + y12) / 2;
      stack.push({ x0: x012, y0: y012, x1: x12, y1: y12, x2: seg.x2, y2: seg.y2 });
      stack.push({ x0: seg.x0, y0: seg.y0, x1: x01, y1: y01, x2: x012, y2: y012 });
    }
  }
  return resultado;
}

function flattenCubic(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  tolerancia: number,
): Punto[] {
  const resultado: Punto[] = [];
  const stack: Array<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    x3: number;
    y3: number;
  }> = [{ x0, y0, x1, y1, x2, y2, x3, y3 }];
  while (stack.length > 0) {
    const seg = stack.pop()!;
    const d1 = distanciaPuntoALinea(seg.x1, seg.y1, seg.x0, seg.y0, seg.x3, seg.y3);
    const d2 = distanciaPuntoALinea(seg.x2, seg.y2, seg.x0, seg.y0, seg.x3, seg.y3);
    if (Math.max(d1, d2) <= tolerancia) {
      resultado.push({ x: seg.x3, y: seg.y3 });
    } else {
      const x01 = (seg.x0 + seg.x1) / 2;
      const y01 = (seg.y0 + seg.y1) / 2;
      const x12 = (seg.x1 + seg.x2) / 2;
      const y12 = (seg.y1 + seg.y2) / 2;
      const x23 = (seg.x2 + seg.x3) / 2;
      const y23 = (seg.y2 + seg.y3) / 2;
      const x012 = (x01 + x12) / 2;
      const y012 = (y01 + y12) / 2;
      const x123 = (x12 + x23) / 2;
      const y123 = (y12 + y23) / 2;
      const x0123 = (x012 + x123) / 2;
      const y0123 = (y012 + y123) / 2;
      stack.push({
        x0: x0123,
        y0: y0123,
        x1: x123,
        y1: y123,
        x2: x23,
        y2: y23,
        x3: seg.x3,
        y3: seg.y3,
      });
      stack.push({
        x0: seg.x0,
        y0: seg.y0,
        x1: x01,
        y1: y01,
        x2: x012,
        y2: y012,
        x3: x0123,
        y3: y0123,
      });
    }
  }
  return resultado;
}

function comandosAPoligonos(
  comandos: Array<{ type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number }>,
  tolerancia: number,
): Poligono[] {
  const poligonos: Poligono[] = [];
  let contornoActual: Poligono = [];
  let cx = 0;
  let cy = 0;
  let inicioX = 0;
  let inicioY = 0;

  for (const cmd of comandos) {
    switch (cmd.type) {
      case 'M': {
        if (contornoActual.length > 0) poligonos.push(contornoActual);
        contornoActual = [];
        if (cmd.x !== undefined && cmd.y !== undefined) {
          contornoActual.push({ x: cmd.x, y: cmd.y });
          cx = cmd.x;
          cy = cmd.y;
          inicioX = cmd.x;
          inicioY = cmd.y;
        }
        break;
      }
      case 'L': {
        if (cmd.x !== undefined && cmd.y !== undefined) {
          contornoActual.push({ x: cmd.x, y: cmd.y });
          cx = cmd.x;
          cy = cmd.y;
        }
        break;
      }
      case 'C': {
        if (
          cmd.x !== undefined &&
          cmd.y !== undefined &&
          cmd.x1 !== undefined &&
          cmd.y1 !== undefined &&
          cmd.x2 !== undefined &&
          cmd.y2 !== undefined
        ) {
          const pts = flattenCubic(cx, cy, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y, tolerancia);
          for (const p of pts) contornoActual.push(p);
          cx = cmd.x;
          cy = cmd.y;
        }
        break;
      }
      case 'Q': {
        if (cmd.x !== undefined && cmd.y !== undefined && cmd.x1 !== undefined && cmd.y1 !== undefined) {
          const pts = flattenQuadratic(cx, cy, cmd.x1, cmd.y1, cmd.x, cmd.y, tolerancia);
          for (const p of pts) contornoActual.push(p);
          cx = cmd.x;
          cy = cmd.y;
        }
        break;
      }
      case 'Z': {
        if (contornoActual.length > 0) {
          poligonos.push(contornoActual);
          contornoActual = [];
        }
        cx = inicioX;
        cy = inicioY;
        break;
      }
    }
  }
  if (contornoActual.length > 0) poligonos.push(contornoActual);
  return poligonos;
}

function calcularBBox(poligonos: Poligono[]): { minX: number; minY: number; maxX: number; maxY: number; ancho: number; alto: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of poligonos) {
    for (const p of poly) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, ancho: 0, alto: 0 };
  }
  return { minX, minY, maxX, maxY, ancho: maxX - minX, alto: maxY - minY };
}

function areaPoligono(poly: Poligono): number {
  let area = 0;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return area / 2;
}

function perimetroPoligono(poly: Poligono): number {
  let perim = 0;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = poly[j].x - poly[i].x;
    const dy = poly[j].y - poly[i].y;
    perim += Math.hypot(dx, dy);
  }
  return perim;
}

function poligonoASvgPath(poly: Poligono): string {
  if (poly.length === 0) return '';
  let d = `M ${poly[0].x.toFixed(3)} ${poly[0].y.toFixed(3)}`;
  for (let i = 1; i < poly.length; i++) {
    d += ` L ${poly[i].x.toFixed(3)} ${poly[i].y.toFixed(3)}`;
  }
  d += ' Z';
  return d;
}

export function validarOpciones(opciones: OpcionesTexto): {
  texto: string;
  tipografia: string;
  tamano_mm: number;
  solapamiento: number;
  tolerancia: number;
} {
  if (typeof opciones.texto !== 'string') throw new Error('error.texto_obligatorio');
  const texto = opciones.texto.trim();
  if (texto.length === 0) throw new Error('error.texto_vacio');
  if (texto.length > 50) throw new Error('error.texto_demasiado_largo');

  if (typeof opciones.tipografia !== 'string' || opciones.tipografia.trim().length === 0) {
    throw new Error('error.tipografia_obligatoria');
  }
  const fuente = obtenerFuente(opciones.tipografia);
  if (!fuente) throw new Error('error.tipografia_no_existe');

  const tamano = Number(opciones.tamano_mm);
  if (!Number.isFinite(tamano) || tamano < 5 || tamano > 1000) {
    throw new Error('error.tamano_invalido');
  }

  const solapamiento = opciones.solapamiento !== undefined ? Number(opciones.solapamiento) : 0.15;
  const solap = Number.isFinite(solapamiento) ? Math.max(0, Math.min(0.5, solapamiento)) : 0.15;

  const tolerancia = opciones.tolerancia_curva !== undefined ? Number(opciones.tolerancia_curva) : 0.8;
  const tol = Number.isFinite(tolerancia) ? Math.max(0.1, Math.min(5, tolerancia)) : 0.8;

  return { texto, tipografia: opciones.tipografia, tamano_mm: tamano, solapamiento: solap, tolerancia: tol };
}

export async function generarTexto(opciones: OpcionesTexto): Promise<ResultadoTexto> {
  const { texto, tipografia, tamano_mm, solapamiento, tolerancia } = validarOpciones(opciones);

  const fuenteInfo = obtenerFuente(tipografia);
  if (!fuenteInfo) throw new Error('error.tipografia_no_existe');

  const opentype = cargarOpentype();
  const clipperLib = cargarClipper();
  const { Clipper, FillRule } = clipperLib;

  // Cargar fuente (soporta ttf, otf, woff)
  let font: any;
  try {
    if (fuenteInfo.archivo.endsWith('.woff') || fuenteInfo.archivo.endsWith('.woff2')) {
      const buffer = fs.readFileSync(fuenteInfo.archivo);
      const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      font = opentype.parse(ab);
    } else {
      font = opentype.loadSync(fuenteInfo.archivo);
    }
  } catch (e) {
    throw new Error(`error.generacion_fallo: no se pudo cargar fuente ${tipografia}: ${(e as Error).message}`);
  }

  const fontSizePx = 1000;
  const todosPoligonos: Poligono[] = [];
  let cursorX = 0;

  for (const char of texto) {
    if (char === ' ') {
      const adv = font.getAdvanceWidth(' ', fontSizePx);
      cursorX += adv * (1 - solapamiento * 0.5);
      continue;
    }
    const glyph = font.charToGlyph(char);
    if (!glyph) {
      const adv = font.getAdvanceWidth(char, fontSizePx);
      cursorX += isNaN(adv) ? fontSizePx * 0.5 : adv;
      continue;
    }
    const glyphPath = glyph.getPath(cursorX, 0, fontSizePx);
    const poligonos = comandosAPoligonos(glyphPath.commands as any, tolerancia);
    for (const poly of poligonos) {
      if (poly.length >= 3) todosPoligonos.push(poly);
    }
    const advance =
      glyph.advanceWidth !== undefined ? (glyph.advanceWidth / font.unitsPerEm) * fontSizePx : font.getAdvanceWidth(char, fontSizePx);
    const adv = Number.isFinite(advance) ? advance : fontSizePx * 0.6;
    const overlapPx = fontSizePx * solapamiento;
    cursorX += adv - overlapPx;
  }

  if (todosPoligonos.length === 0) throw new Error('error.generacion_fallo: no se genero geometria');

  const bboxPx = calcularBBox(todosPoligonos);
  if (bboxPx.ancho === 0 || bboxPx.alto === 0) throw new Error('error.generacion_fallo: bbox cero');

  // Flip Y: opentype Y negativo arriba -> Y positivo abajo, luego trasladar a origen
  const poligonosFlipped: Poligono[] = todosPoligonos.map((poly) => poly.map((p) => ({ x: p.x, y: -p.y })));
  const bboxFlipped = calcularBBox(poligonosFlipped);
  const trasladados: Poligono[] = poligonosFlipped.map((poly) =>
    poly.map((p) => ({ x: p.x - bboxFlipped.minX, y: p.y - bboxFlipped.minY })),
  );
  const bboxTrasladado = calcularBBox(trasladados);

  // Escalar a mm
  const escala = tamano_mm / bboxTrasladado.alto;
  const poligonosMm: Poligono[] = trasladados.map((poly) => poly.map((p) => ({ x: p.x * escala, y: p.y * escala })));
  const bboxMm = calcularBBox(poligonosMm);

  // Union con clipper2-js: convertir a enteros (precision 0.001 mm)
  const factorEntero = 1000;
  const pathsEnteros: Array<Array<{ x: number; y: number }>> = [];
  for (const poly of poligonosMm) {
    if (poly.length < 3) continue;
    const path = poly.map((p) => ({
      x: Math.round(p.x * factorEntero),
      y: Math.round(p.y * factorEntero),
    }));
    pathsEnteros.push(path);
  }

  let unionResult: Array<Array<{ x: number; y: number }>>;
  try {
    // Union de todos contra vacio = union self
    unionResult = Clipper.Union(pathsEnteros, [], FillRule.NonZero, FillRule.NonZero) as any;
  } catch (e) {
    throw new Error(`error.generacion_fallo: union Clipper fallo: ${(e as Error).message}`);
  }

  // Convertir de vuelta a mm y filtrar degenerados (clipper2-js genera poligonos de area ~0 por solapamiento)
  let poligonosUnionMm: Poligono[] = [];
  for (const path of unionResult) {
    const poly: Poligono = path.map((p: any) => ({
      x: p.x / factorEntero,
      y: p.y / factorEntero,
    }));
    if (poly.length < 3) continue;
    const a = areaPoligono(poly);
    if (Math.abs(a) < 0.01) continue; // filtrar artefactos <0.01 mm2
    poligonosUnionMm.push(poly);
  }

  if (poligonosUnionMm.length === 0) {
    poligonosUnionMm = poligonosMm.filter((poly) => Math.abs(areaPoligono(poly)) >= 0.01);
    if (poligonosUnionMm.length === 0) poligonosUnionMm.push(...poligonosMm);
  }

  // Calcular area y perimetro usando criterio de area negativa para exterior (DejaVu y OFL)
  // Exterior tiene area negativa, huecos positiva. Suma con signo luego abs = neta.
  let areaTotal = 0;
  let perimetroTotal = 0;
  let numExteriores = 0;
  let numHuecos = 0;
  for (const poly of poligonosUnionMm) {
    const a = areaPoligono(poly);
    areaTotal += a;
    perimetroTotal += perimetroPoligono(poly);
    if (a < 0) numExteriores++;
    else numHuecos++;
  }
  const areaNeta = Math.abs(areaTotal);

  const bboxFinal = calcularBBox(poligonosUnionMm);
  const medidas = { ancho: Number(bboxFinal.ancho.toFixed(3)), alto: Number(bboxFinal.alto.toFixed(3)) };

  const svgPaths = poligonosUnionMm.map(poligonoASvgPath).join(' ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${medidas.ancho}mm" height="${medidas.alto}mm" viewBox="0 0 ${medidas.ancho} ${medidas.alto}" fill-rule="evenodd">
  <path d="${svgPaths}" fill="black" stroke="none"/>
</svg>`;

  const receta = {
    constructor: 'texto' as const,
    texto,
    tipografia,
    tamano_mm,
    solapamiento,
    fuente: { id: fuenteInfo.id, nombre: fuenteInfo.nombre, licencia: fuenteInfo.licencia },
    medidas_mm: medidas,
    largo_corte_mm: Number(perimetroTotal.toFixed(3)),
    area_mm2: Number(areaNeta.toFixed(3)),
    generado: new Date().toISOString(),
  };

  return {
    svg,
    medidas_mm: medidas,
    largo_corte_mm: receta.largo_corte_mm,
    area_mm2: receta.area_mm2,
    poligonos_mm: poligonosUnionMm,
    receta,
    debug: {
      num_contornos_originales: todosPoligonos.length,
      num_poligonos_union: poligonosUnionMm.length,
      fuente_archivo: fuenteInfo.archivo,
      bbox_px: bboxPx,
      escala_mm_por_px: escala,
    },
  };
}

export function listarTipografias(): Array<{ id: string; nombre: string; licencia: string; autor: string; descripcion: string }> {
  return listarFuentes().map((f) => ({
    id: f.id,
    nombre: f.nombre,
    licencia: f.licencia,
    autor: f.autor,
    descripcion: f.descripcion,
  }));
}
