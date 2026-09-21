/**
 * Lienzo y trazos: geometria vectorial -> imagen PNG.
 *
 * Estrategia: se dibuja cada segmento "estampando" discos sobre un buffer de cobertura
 * con supersampling, y luego se reduce. Da un resultado con bordes suaves sin depender
 * de librerias nativas de rasterizado.
 */
import { codificarPng } from './png.ts';

export interface Punto {
  x: number;
  y: number;
}

export interface Trazo {
  puntos: Punto[];
  cerrado: boolean;
}

export interface Geometria {
  trazos: Trazo[];
}

export interface Limites {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Limite de puntos por captura: por encima no se intenta renderizar. */
export const MAX_PUNTOS_POR_CAPTURA = 200000;

export class ErrorCaptura extends Error {
  readonly codigo: string;

  constructor(codigo: string, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorCaptura';
    this.codigo = codigo;
  }
}

export function contarPuntos(geometria: Geometria): number {
  let total = 0;
  for (const trazo of geometria.trazos) total += trazo.puntos.length;
  return total;
}

export function limitesDe(geometria: Geometria): Limites | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let alguno = false;
  for (const trazo of geometria.trazos) {
    for (const punto of trazo.puntos) {
      if (!Number.isFinite(punto.x) || !Number.isFinite(punto.y)) continue;
      alguno = true;
      if (punto.x < minX) minX = punto.x;
      if (punto.y < minY) minY = punto.y;
      if (punto.x > maxX) maxX = punto.x;
      if (punto.y > maxY) maxY = punto.y;
    }
  }
  if (!alguno) return null;
  return { minX, minY, maxX, maxY };
}

export function geometriaVacia(geometria: Geometria): boolean {
  return limitesDe(geometria) === null;
}

export interface OpcionesRender {
  /** Lado del cuadrado de salida, en pixeles. */
  lado: number;
  /** Factor de supersampling (2 da buen resultado con coste razonable). */
  supersampling?: number;
  /** Grosor del trazo, en pixeles finales. */
  grosor?: number;
  /** Margen libre alrededor del diseno, en pixeles finales. */
  margen?: number;
  /** Color del trazo (RGB 0-255). El fondo es blanco. */
  color?: [number, number, number];
}

const COLOR_POR_DEFECTO: [number, number, number] = [43, 33, 24];

/**
 * Convierte la geometria en un PNG cuadrado. El modelo se supone con Y hacia arriba
 * (los conversores de SVG invierten su Y para cumplirlo) y se ajusta al lienzo
 * conservando la proporcion.
 */
export function renderizarGeometria(geometria: Geometria, opciones: OpcionesRender): Buffer {
  const lado = Math.max(16, Math.floor(opciones.lado));
  const ss = Math.max(1, Math.min(4, Math.floor(opciones.supersampling ?? 2)));
  const grosor = Math.max(0.2, opciones.grosor ?? Math.max(0.9, lado / 480));
  const margen = Math.max(0, opciones.margen ?? Math.max(6, Math.round(lado * 0.05)));
  const color = opciones.color ?? COLOR_POR_DEFECTO;

  const total = contarPuntos(geometria);
  if (total > MAX_PUNTOS_POR_CAPTURA) {
    throw new ErrorCaptura('error.captura_demasiado_compleja', 'El diseno tiene demasiados puntos para generar la captura.');
  }
  const limites = limitesDe(geometria);
  if (limites === null) {
    throw new ErrorCaptura('error.captura_sin_geometria', 'No se encontro geometria dibujable en el archivo.');
  }

  const anchoModelo = Math.max(limites.maxX - limites.minX, 1e-6);
  const altoModelo = Math.max(limites.maxY - limites.minY, 1e-6);
  const ladoUtil = Math.max(1, lado - margen * 2);
  const escala = Math.min(ladoUtil / anchoModelo, ladoUtil / altoModelo) * ss;
  const ancho = lado * ss;
  const alto = lado * ss;
  const desfaseX = (ancho - anchoModelo * escala) / 2;
  const desfaseY = (alto - altoModelo * escala) / 2;

  const proyectar = (p: Punto): Punto => ({
    x: desfaseX + (p.x - limites.minX) * escala,
    y: alto - (desfaseY + (p.y - limites.minY) * escala), // Y hacia arriba en el modelo
  });

  const cobertura = new Float32Array(ancho * alto);
  const radio = (grosor * ss) / 2;
  const radioExt = radio + 0.5;

  const estampar = (cx: number, cy: number): void => {
    const xInicio = Math.max(0, Math.floor(cx - radioExt));
    const xFin = Math.min(ancho - 1, Math.ceil(cx + radioExt));
    const yInicio = Math.max(0, Math.floor(cy - radioExt));
    const yFin = Math.min(alto - 1, Math.ceil(cy + radioExt));
    for (let y = yInicio; y <= yFin; y += 1) {
      const dy = y + 0.5 - cy;
      const base = y * ancho;
      for (let x = xInicio; x <= xFin; x += 1) {
        const dx = x + 0.5 - cx;
        const distancia = Math.sqrt(dx * dx + dy * dy);
        const valor = radio - distancia + 0.5;
        if (valor <= 0) continue;
        const c = valor > 1 ? 1 : valor;
        const indice = base + x;
        if (c > cobertura[indice]) cobertura[indice] = c;
      }
    }
  };

  const segmento = (a: Punto, b: Punto): void => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const largo = Math.sqrt(dx * dx + dy * dy);
    if (!Number.isFinite(largo)) return;
    if (largo < 0.5) {
      estampar(a.x, a.y);
      return;
    }
    const paso = Math.max(0.4, radio * 0.5);
    const pasos = Math.ceil(largo / paso);
    for (let i = 0; i <= pasos; i += 1) {
      const t = i / pasos;
      estampar(a.x + dx * t, a.y + dy * t);
    }
  };

  for (const trazo of geometria.trazos) {
    if (trazo.puntos.length === 0) continue;
    if (trazo.puntos.length === 1) {
      estampar(proyectar(trazo.puntos[0]).x, proyectar(trazo.puntos[0]).y);
      continue;
    }
    let anterior = proyectar(trazo.puntos[0]);
    for (let i = 1; i < trazo.puntos.length; i += 1) {
      const actual = proyectar(trazo.puntos[i]);
      segmento(anterior, actual);
      anterior = actual;
    }
    if (trazo.cerrado) segmento(anterior, proyectar(trazo.puntos[0]));
  }

  // Reduccion del supersampling y composicion sobre fondo blanco.
  const rgba = new Uint8Array(lado * lado * 4);
  const [cr, cg, cb] = color;
  for (let y = 0; y < lado; y += 1) {
    for (let x = 0; x < lado; x += 1) {
      let suma = 0;
      for (let sy = 0; sy < ss; sy += 1) {
        const base = (y * ss + sy) * ancho + x * ss;
        for (let sx = 0; sx < ss; sx += 1) suma += cobertura[base + sx];
      }
      let alpha = suma / (ss * ss);
      if (alpha > 1) alpha = 1;
      const indice = (y * lado + x) * 4;
      rgba[indice] = Math.round(255 + (cr - 255) * alpha);
      rgba[indice + 1] = Math.round(255 + (cg - 255) * alpha);
      rgba[indice + 2] = Math.round(255 + (cb - 255) * alpha);
      rgba[indice + 3] = 255;
    }
  }
  return codificarPng(lado, lado, rgba);
}

/** Curva de Bezier cubica muestreada como polylinea. */
export function muestrearCubica(p0: Punto, p1: Punto, p2: Punto, p3: Punto, pasos = 16): Punto[] {
  const salida: Punto[] = [];
  for (let i = 1; i <= pasos; i += 1) {
    const t = i / pasos;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    salida.push({
      x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
      y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
    });
  }
  return salida;
}

/** Curva de Bezier cuadratica muestreada como polylinea. */
export function muestrearCuadratica(p0: Punto, p1: Punto, p2: Punto, pasos = 12): Punto[] {
  const salida: Punto[] = [];
  for (let i = 1; i <= pasos; i += 1) {
    const t = i / pasos;
    const u = 1 - t;
    salida.push({
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
    });
  }
  return salida;
}

/** Arco eliptico (parametrizacion de centro) muestreado como polylinea. */
export function muestrearArcoCentro(
  centro: Punto,
  radioX: number,
  radioY: number,
  anguloInicio: number,
  anguloFin: number,
  rotacionRad = 0,
  pasos = 24,
): Punto[] {
  const salida: Punto[] = [];
  const cos = Math.cos(rotacionRad);
  const sen = Math.sin(rotacionRad);
  let delta = anguloFin - anguloInicio;
  while (delta < 0) delta += Math.PI * 2;
  const total = Math.max(1, pasos);
  for (let i = 0; i <= total; i += 1) {
    const angulo = anguloInicio + (delta * i) / total;
    const x = radioX * Math.cos(angulo);
    const y = radioY * Math.sin(angulo);
    salida.push({ x: centro.x + x * cos - y * sen, y: centro.y + x * sen + y * cos });
  }
  return salida;
}
