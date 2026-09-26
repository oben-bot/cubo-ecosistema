/**
 * Constructor de llaveros paramétricos — E4 segundo tramo
 * Genera llavero circular, rectangular o hueso con agujero y texto soldado.
 * Reusa lógica de texto (opentype.js@1.2.1 + clipper2-js@1.2.4)
 */
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import { obtenerFuente } from './fuentes.ts';

const require = createRequire(import.meta.url);

export interface OpcionesLlavero {
  texto: string;
  forma?: 'circular' | 'rectangular' | 'hueso';
  tamano_mm?: number; // diámetro o ancho base
  tipografia?: string;
  incluir_agujero?: boolean;
}

export interface ResultadoLlavero {
  svg: string;
  medidas_mm: { ancho: number; alto: number };
  largo_corte_mm: number;
  area_mm2: number;
  receta: {
    constructor: 'llavero';
    texto: string;
    forma: string;
    tamano_mm: number;
    tipografia: string;
    medidas_mm: { ancho: number; alto: number };
    largo_corte_mm: number;
    area_mm2: number;
    generado: string;
  };
}

let opentypeModulo: any = null;
let clipperModulo: any = null;

function cargarOpentype(): any {
  if (opentypeModulo) return opentypeModulo;
  const mod = require('opentype.js');
  opentypeModulo = (mod as any).default ?? mod;
  return opentypeModulo;
}
function cargarClipper(): any {
  if (clipperModulo) return clipperModulo;
  clipperModulo = require('clipper2-js');
  return clipperModulo;
}

// Reusa flatten de texto.ts simplificado
function distanciaPuntoALinea(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = ((px - x1) * dx + (py - y1) * dy) / len2;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
function flattenQuadratic(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, tol: number): Array<{ x: number; y: number }> {
  const res: Array<{ x: number; y: number }> = [];
  const stack = [{ x0, y0, x1, y1, x2, y2 }];
  while (stack.length) {
    const s = stack.pop()!;
    const d = distanciaPuntoALinea(s.x1, s.y1, s.x0, s.y0, s.x2, s.y2);
    if (d <= tol) res.push({ x: s.x2, y: s.y2 });
    else {
      const x01 = (s.x0 + s.x1) / 2, y01 = (s.y0 + s.y1) / 2;
      const x12 = (s.x1 + s.x2) / 2, y12 = (s.y1 + s.y2) / 2;
      const x012 = (x01 + x12) / 2, y012 = (y01 + y12) / 2;
      stack.push({ x0: x012, y0: y012, x1: x12, y1: y12, x2: s.x2, y2: s.y2 });
      stack.push({ x0: s.x0, y0: s.y0, x1: x01, y1: y01, x2: x012, y2: y012 });
    }
  }
  return res;
}
function flattenCubic(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, tol: number): Array<{ x: number; y: number }> {
  const res: Array<{ x: number; y: number }> = [];
  const stack = [{ x0, y0, x1, y1, x2, y2, x3, y3 }];
  while (stack.length) {
    const s = stack.pop()!;
    const d1 = distanciaPuntoALinea(s.x1, s.y1, s.x0, s.y0, s.x3, s.y3);
    const d2 = distanciaPuntoALinea(s.x2, s.y2, s.x0, s.y0, s.x3, s.y3);
    if (Math.max(d1, d2) <= tol) res.push({ x: s.x3, y: s.y3 });
    else {
      const x01 = (s.x0 + s.x1) / 2, y01 = (s.y0 + s.y1) / 2;
      const x12 = (s.x1 + s.x2) / 2, y12 = (s.y1 + s.y2) / 2;
      const x23 = (s.x2 + s.x3) / 2, y23 = (s.y2 + s.y3) / 2;
      const x012 = (x01 + x12) / 2, y012 = (y01 + y12) / 2;
      const x123 = (x12 + x23) / 2, y123 = (y12 + y23) / 2;
      const x0123 = (x012 + x123) / 2, y0123 = (y012 + y123) / 2;
      stack.push({ x0: x0123, y0: y0123, x1: x123, y1: y123, x2: x23, y2: y23, x3: s.x3, y3: s.y3 });
      stack.push({ x0: s.x0, y0: s.y0, x1: x01, y1: y01, x2: x012, y2: y012, x3: x0123, y3: y0123 });
    }
  }
  return res;
}
function comandosAPoligonos(comandos: any[], tol: number): Array<Array<{ x: number; y: number }>> {
  const polys: Array<Array<{ x: number; y: number }>> = [];
  let cur: Array<{ x: number; y: number }> = [];
  let cx = 0, cy = 0, sx = 0, sy = 0;
  for (const cmd of comandos) {
    if (cmd.type === 'M') {
      if (cur.length) polys.push(cur);
      cur = [{ x: cmd.x, y: cmd.y }];
      cx = cmd.x; cy = cmd.y; sx = cmd.x; sy = cmd.y;
    } else if (cmd.type === 'L') {
      cur.push({ x: cmd.x, y: cmd.y });
      cx = cmd.x; cy = cmd.y;
    } else if (cmd.type === 'C') {
      const pts = flattenCubic(cx, cy, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y, tol);
      for (const p of pts) cur.push(p);
      cx = cmd.x; cy = cmd.y;
    } else if (cmd.type === 'Q') {
      const pts = flattenQuadratic(cx, cy, cmd.x1, cmd.y1, cmd.x, cmd.y, tol);
      for (const p of pts) cur.push(p);
      cx = cmd.x; cy = cmd.y;
    } else if (cmd.type === 'Z') {
      if (cur.length) polys.push(cur);
      cur = [];
      cx = sx; cy = sy;
    }
  }
  if (cur.length) polys.push(cur);
  return polys;
}
function areaPoligono(poly: Array<{ x: number; y: number }>): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    a += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return a / 2;
}
function perimetroPoligono(poly: Array<{ x: number; y: number }>): number {
  let p = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    p += Math.hypot(poly[j].x - poly[i].x, poly[j].y - poly[i].y);
  }
  return p;
}

export function validarOpcionesLlavero(opciones: OpcionesLlavero): Required<OpcionesLlavero> {
  if (!opciones.texto || typeof opciones.texto !== 'string' || opciones.texto.trim().length === 0) throw new Error('error.texto_obligatorio');
  const texto = opciones.texto.trim().slice(0, 20);
  const forma = (opciones.forma === 'rectangular' || opciones.forma === 'hueso' ? opciones.forma : 'circular') as Required<OpcionesLlavero>['forma'];
  const tamano = Number(opciones.tamano_mm ?? 40);
  if (!Number.isFinite(tamano) || tamano < 15 || tamano > 150) throw new Error('error.tamano_invalido');
  const tipografia = opciones.tipografia ?? 'dejavu-sans-bold';
  const fuente = obtenerFuente(tipografia);
  if (!fuente) throw new Error('error.tipografia_no_existe');
  const incluir_agujero = opciones.incluir_agujero !== undefined ? Boolean(opciones.incluir_agujero) : true;
  return { texto, forma, tamano_mm: tamano, tipografia, incluir_agujero };
}

function generarFormaBase(forma: string, tamano: number): { contorno: Array<{ x: number; y: number }>; ancho: number; alto: number } {
  if (forma === 'circular') {
    const r = tamano / 2;
    const segmentos = 64;
    const contorno: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < segmentos; i++) {
      const ang = (i / segmentos) * Math.PI * 2;
      contorno.push({ x: r + r * Math.cos(ang), y: r + r * Math.sin(ang) });
    }
    return { contorno, ancho: tamano, alto: tamano };
  } else if (forma === 'rectangular') {
    const w = tamano;
    const h = tamano * 0.6;
    const contorno = [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ];
    return { contorno, ancho: w, alto: h };
  } else {
    // hueso: dos círculos unidos por rectángulo
    const r = tamano * 0.25;
    const w = tamano;
    const h = tamano * 0.5;
    const contorno: Array<{ x: number; y: number }> = [];
    // Aproximación hueso como rect con semicírculos
    const segmentos = 32;
    // lado izquierdo semicírculo
    for (let i = 0; i <= segmentos / 2; i++) {
      const ang = Math.PI / 2 + (i / (segmentos / 2)) * Math.PI;
      contorno.push({ x: r + r * Math.cos(ang), y: h / 2 + r * Math.sin(ang) });
    }
    // lado derecho semicírculo
    for (let i = 0; i <= segmentos / 2; i++) {
      const ang = (3 * Math.PI) / 2 + (i / (segmentos / 2)) * Math.PI;
      contorno.push({ x: w - r + r * Math.cos(ang), y: h / 2 + r * Math.sin(ang) });
    }
    return { contorno, ancho: w, alto: h };
  }
}

function generarAgujero(x: number, y: number, r: number, segmentos = 24): Array<{ x: number; y: number }> {
  const c: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < segmentos; i++) {
    const ang = (i / segmentos) * Math.PI * 2;
    c.push({ x: x + r * Math.cos(ang), y: y + r * Math.sin(ang) });
  }
  return c;
}

export async function generarLlavero(opciones: OpcionesLlavero): Promise<ResultadoLlavero> {
  const { texto, forma, tamano_mm, tipografia, incluir_agujero } = validarOpcionesLlavero(opciones);
  const fuenteInfo = obtenerFuente(tipografia);
  if (!fuenteInfo) throw new Error('error.tipografia_no_existe');

  const opentype = cargarOpentype();
  const clipperLib = cargarClipper();
  const { Clipper, FillRule } = clipperLib;

  let font: any;
  try {
    if (fuenteInfo.archivo.endsWith('.woff') || fuenteInfo.archivo.endsWith('.woff2')) {
      const buf = fs.readFileSync(fuenteInfo.archivo);
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      font = opentype.parse(ab);
    } else {
      font = opentype.loadSync(fuenteInfo.archivo);
    }
  } catch (e) {
    throw new Error(`error.generacion_fallo: ${(e as Error).message}`);
  }

  const formaBase = generarFormaBase(forma, tamano_mm);
  const agujero = incluir_agujero ? generarAgujero(formaBase.ancho / 2, 3, 2.5) : null;

  // Texto: generar contornos y centrar dentro de forma
  const fontSizePx = 1000;
  const tolerancia = 0.8;
  const todosPoligonos: Array<Array<{ x: number; y: number }>> = [];
  let cursorX = 0;
  for (const char of texto) {
    if (char === ' ') {
      const adv = font.getAdvanceWidth(' ', fontSizePx);
      cursorX += adv * 0.8;
      continue;
    }
    const glyph = font.charToGlyph(char);
    const glyphPath = glyph.getPath(cursorX, 0, fontSizePx);
    const polys = comandosAPoligonos(glyphPath.commands as any, tolerancia);
    for (const poly of polys) if (poly.length >= 3) todosPoligonos.push(poly);
    const adv = glyph.advanceWidth !== undefined ? (glyph.advanceWidth / font.unitsPerEm) * fontSizePx : font.getAdvanceWidth(char, fontSizePx);
    cursorX += (Number.isFinite(adv) ? adv : fontSizePx * 0.6) - fontSizePx * 0.15;
  }

  // BBox texto y escalar para que quepa dentro de forma (80% del tamaño)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of todosPoligonos) for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const textoAncho = maxX - minX;
  const textoAlto = maxY - minY;
  const escala = Math.min((formaBase.ancho * 0.7) / textoAncho, (formaBase.alto * 0.5) / textoAlto);
  const textoPoligonosEscalados = todosPoligonos.map((poly) => poly.map((p) => ({
    x: (p.x - minX) * escala + (formaBase.ancho - textoAncho * escala) / 2,
    y: -(p.y - minY) * escala + formaBase.alto * 0.65, // flip Y y centrar vertical
  })));

  // Union: forma base + texto
  const factor = 1000;
  const pathsEnteros: Array<Array<{ x: number; y: number }>> = [];
  pathsEnteros.push(formaBase.contorno.map((p) => ({ x: Math.round(p.x * factor), y: Math.round(p.y * factor) })));
  for (const poly of textoPoligonosEscalados) {
    pathsEnteros.push(poly.map((p) => ({ x: Math.round(p.x * factor), y: Math.round(p.y * factor) })));
  }

  let unionResult: Array<Array<{ x: number; y: number }>>;
  try {
    unionResult = Clipper.Union(pathsEnteros, [], FillRule.NonZero, FillRule.NonZero) as any;
  } catch (e) {
    throw new Error(`error.generacion_fallo: union ${ (e as Error).message }`);
  }

  // Filtrar degenerados y convertir a mm (ya están en mm)
  let poligonosMm: Array<Array<{ x: number; y: number }>> = [];
  for (const path of unionResult) {
    const poly = path.map((p: any) => ({ x: p.x / factor, y: p.y / factor }));
    if (poly.length < 3) continue;
    if (Math.abs(areaPoligono(poly)) < 0.01) continue;
    poligonosMm.push(poly);
  }

  // Si hay agujero, añadir como hueco (área positiva si exterior negativa, pero con NonZero se maneja)
  if (agujero) {
    poligonosMm.push(agujero);
  }

  // Calcular medidas, área, perímetro
  let areaTotal = 0;
  let perimTotal = 0;
  let minXf = Infinity, minYf = Infinity, maxXf = -Infinity, maxYf = -Infinity;
  for (const poly of poligonosMm) {
    const a = areaPoligono(poly);
    areaTotal += a;
    perimTotal += perimetroPoligono(poly);
    for (const p of poly) {
      if (p.x < minXf) minXf = p.x;
      if (p.y < minYf) minYf = p.y;
      if (p.x > maxXf) maxXf = p.x;
      if (p.y > maxYf) maxYf = p.y;
    }
  }
  const areaNeta = Math.abs(areaTotal);
  const medidas = { ancho: Number((maxXf - minXf).toFixed(3)), alto: Number((maxYf - minYf).toFixed(3)) };

  const svgPaths = poligonosMm.map((poly) => {
    if (poly.length === 0) return '';
    let d = `M ${poly[0].x.toFixed(3)} ${poly[0].y.toFixed(3)}`;
    for (let i = 1; i < poly.length; i++) d += ` L ${poly[i].x.toFixed(3)} ${poly[i].y.toFixed(3)}`;
    d += ' Z';
    return d;
  }).join(' ');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${medidas.ancho}mm" height="${medidas.alto}mm" viewBox="0 0 ${medidas.ancho} ${medidas.alto}" fill-rule="evenodd">
  <path d="${svgPaths}" fill="black" stroke="none"/>
</svg>`;

  return {
    svg,
    medidas_mm: medidas,
    largo_corte_mm: Number(perimTotal.toFixed(3)),
    area_mm2: Number(areaNeta.toFixed(3)),
    receta: {
      constructor: 'llavero',
      texto,
      forma,
      tamano_mm,
      tipografia,
      medidas_mm: medidas,
      largo_corte_mm: Number(perimTotal.toFixed(3)),
      area_mm2: Number(areaNeta.toFixed(3)),
      generado: new Date().toISOString(),
    },
  };
}
