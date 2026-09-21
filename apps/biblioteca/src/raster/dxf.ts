/**
 * Conversor DXF (ASCII) -> geometria de trazos.
 *
 * Cubre las entidades de dibujo plano habituales: LINE, LWPOLYLINE, POLYLINE/VERTEX,
 * CIRCLE, ARC, ELLIPSE y SPLINE (esta ultima aproximada por su poligono de control).
 * No expande bloques (INSERT) ni lee DXF binario: en esos casos no se genera captura
 * y la ficha queda sin miniatura, en lugar de inventar una.
 */
import { muestrearArcoCentro, type Geometria, type Punto, type Trazo } from './lienzo.ts';

const CABECERA_BINARIO = 'AutoCAD Binary DXF';

export function esDxfBinario(datos: Buffer): boolean {
  return datos.subarray(0, CABECERA_BINARIO.length).toString('latin1') === CABECERA_BINARIO;
}

interface Par {
  codigo: number;
  valor: string;
}

function paresDe(texto: string): Par[] {
  const lineas = texto.split(/\r?\n/);
  const pares: Par[] = [];
  for (let i = 0; i + 1 < lineas.length; i += 2) {
    const codigo = Number.parseInt((lineas[i] ?? '').trim(), 10);
    if (Number.isNaN(codigo)) continue;
    pares.push({ codigo, valor: (lineas[i + 1] ?? '').trim() });
  }
  return pares;
}

function entidadesDe(pares: Par[]): Array<{ tipo: string; pares: Par[] }> {
  const salida: Array<{ tipo: string; pares: Par[] }> = [];
  let enSeccionEntidades = false;
  let actual: { tipo: string; pares: Par[] } | null = null;

  for (let i = 0; i < pares.length; i += 1) {
    const par = pares[i];
    if (par.codigo === 0) {
      if (par.valor === 'SECTION') {
        const nombre = pares[i + 1];
        enSeccionEntidades = nombre?.codigo === 2 && nombre.valor.toUpperCase() === 'ENTITIES';
        i += 1;
        continue;
      }
      if (par.valor === 'ENDSEC') {
        enSeccionEntidades = false;
        if (actual) salida.push(actual);
        actual = null;
        continue;
      }
      if (!enSeccionEntidades) continue;
      if (actual) salida.push(actual);
      actual = { tipo: par.valor.toUpperCase(), pares: [] };
      continue;
    }
    if (actual) actual.pares.push(par);
  }
  if (actual) salida.push(actual);
  return salida;
}

function primero(pares: Par[], codigo: number): number | null {
  for (const par of pares) {
    if (par.codigo === codigo) {
      const numero = Number(par.valor);
      return Number.isFinite(numero) ? numero : null;
    }
  }
  return null;
}

function todos(pares: Par[], codigo: number): number[] {
  const salida: number[] = [];
  for (const par of pares) {
    if (par.codigo !== codigo) continue;
    const numero = Number(par.valor);
    if (Number.isFinite(numero)) salida.push(numero);
  }
  return salida;
}

function puntosXY(pares: Par[]): Punto[] {
  const xs = todos(pares, 10);
  const ys = todos(pares, 20);
  const salida: Punto[] = [];
  for (let i = 0; i < Math.min(xs.length, ys.length); i += 1) {
    salida.push({ x: xs[i], y: ys[i] });
  }
  return salida;
}

function trazoCerrado(pares: Par[]): boolean {
  const bandera = primero(pares, 70);
  return bandera !== null && (bandera & 1) === 1;
}

/** Arco entre dos puntos a partir del "bulge" de una polilinea DXF. */
export function arcoDesdeBulge(p1: Punto, p2: Punto, bulge: number): Punto[] {
  if (!Number.isFinite(bulge) || Math.abs(bulge) < 1e-9) return [p2];
  const angulo = 4 * Math.atan(bulge);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const cuerda = Math.hypot(dx, dy);
  if (cuerda < 1e-9) return [p2];
  const radio = cuerda / (2 * Math.sin(Math.abs(angulo) / 2));
  const signo = angulo >= 0 ? 1 : -1;
  const distancia = radio * Math.cos(angulo / 2) * signo;
  const centro: Punto = {
    x: (p1.x + p2.x) / 2 + (-dy / cuerda) * distancia,
    y: (p1.y + p2.y) / 2 + (dx / cuerda) * distancia,
  };
  const inicio = Math.atan2(p1.y - centro.y, p1.x - centro.x);
  const pasos = Math.max(6, Math.min(96, Math.ceil((Math.abs(angulo) / (Math.PI / 12)) * 2)));
  const salida: Punto[] = [];
  for (let i = 1; i <= pasos; i += 1) {
    const a = inicio + (angulo * i) / pasos;
    salida.push({ x: centro.x + radio * Math.cos(a), y: centro.y + radio * Math.sin(a) });
  }
  return salida;
}

/** Vertices de una LWPOLYLINE: 10/20 dan el punto y 42 (opcional) el bulge de ese vertice. */
function verticesDeLwPolyline(pares: Par[]): Array<{ punto: Punto; bulge: number }> {
  const vertices: Array<{ punto: Punto; bulge: number }> = [];
  for (const par of pares) {
    if (par.codigo === 10) {
      const x = Number(par.valor);
      vertices.push({ punto: { x, y: 0 }, bulge: 0 });
    } else if (par.codigo === 20) {
      const ultimo = vertices[vertices.length - 1];
      if (ultimo) ultimo.punto.y = Number(par.valor);
    } else if (par.codigo === 42) {
      const ultimo = vertices[vertices.length - 1];
      if (ultimo) ultimo.bulge = Number(par.valor);
    }
  }
  return vertices.filter((v) => Number.isFinite(v.punto.x) && Number.isFinite(v.punto.y) && Number.isFinite(v.bulge));
}

function polilineaConBulges(pares: Par[], cerrada: boolean): Trazo[] {
  const vertices = verticesDeLwPolyline(pares);
  if (vertices.length < 2) return [];
  const puntos: Punto[] = [vertices[0].punto];
  const total = cerrada ? vertices.length : vertices.length - 1;
  for (let i = 0; i < total; i += 1) {
    const desde = vertices[i];
    const hasta = vertices[(i + 1) % vertices.length];
    puntos.push(...arcoDesdeBulge(desde.punto, hasta.punto, desde.bulge));
  }
  return [{ puntos, cerrado: false }];
}

function trazoEntidad(entidad: { tipo: string; pares: Par[] }): Trazo[] {
  const pares = entidad.pares;
  switch (entidad.tipo) {
    case 'LINE': {
      const x1 = primero(pares, 10);
      const y1 = primero(pares, 20);
      const x2 = primero(pares, 11);
      const y2 = primero(pares, 21);
      if (x1 === null || y1 === null || x2 === null || y2 === null) return [];
      return [{ puntos: [{ x: x1, y: y1 }, { x: x2, y: y2 }], cerrado: false }];
    }
    case 'LWPOLYLINE':
      return polilineaConBulges(pares, trazoCerrado(pares));
    case 'CIRCLE': {
      const cx = primero(pares, 10);
      const cy = primero(pares, 20);
      const radio = primero(pares, 40);
      if (cx === null || cy === null || radio === null || radio <= 0) return [];
      return [
        {
          puntos: muestrearArcoCentro({ x: cx, y: cy }, radio, radio, 0, Math.PI * 2, 0, 72).slice(0, -1),
          cerrado: true,
        },
      ];
    }
    case 'ARC': {
      const cx = primero(pares, 10);
      const cy = primero(pares, 20);
      const radio = primero(pares, 40);
      const inicio = primero(pares, 50);
      const fin = primero(pares, 51);
      if (cx === null || cy === null || radio === null || radio <= 0 || inicio === null || fin === null) return [];
      const a0 = (inicio * Math.PI) / 180;
      let a1 = (fin * Math.PI) / 180;
      if (a1 < a0) a1 += Math.PI * 2;
      const pasos = Math.max(6, Math.min(128, Math.ceil(((a1 - a0) / (Math.PI / 12)) * 2)));
      return [{ puntos: muestrearArcoCentro({ x: cx, y: cy }, radio, radio, a0, a1, 0, pasos), cerrado: false }];
    }
    case 'ELLIPSE': {
      const cx = primero(pares, 10) ?? 0;
      const cy = primero(pares, 20) ?? 0;
      const mx = primero(pares, 11) ?? 1;
      const my = primero(pares, 21) ?? 0;
      const proporcion = primero(pares, 40) ?? 1;
      const inicio = primero(pares, 41) ?? 0;
      const fin = primero(pares, 42) ?? Math.PI * 2;
      const radioMayor = Math.hypot(mx, my);
      if (radioMayor <= 0) return [];
      const radioMenor = radioMayor * proporcion;
      const rotacion = Math.atan2(my, mx);
      const pasos = Math.max(12, Math.min(128, Math.ceil((Math.abs(fin - inicio) / (Math.PI / 12)) * 2)));
      return [
        { puntos: muestrearArcoCentro({ x: cx, y: cy }, radioMayor, radioMenor, inicio, fin, rotacion, pasos), cerrado: false },
      ];
    }
    case 'SPLINE': {
      // Aproximacion documentada: se dibuja el poligono de puntos de control.
      const puntos = puntosXY(pares);
      if (puntos.length < 2) return [];
      return [{ puntos, cerrado: trazoCerrado(pares) }];
    }
    default:
      return [];
  }
}

/** Devuelve la geometria de un DXF ASCII, o null si es binario o no trae entidades. */
export function dxfAGeometria(datos: Buffer): Geometria | null {
  if (esDxfBinario(datos)) return null;
  const texto = datos.toString('utf8');
  if (!/\bENTITIES\b/.test(texto) && !/\bSECTION\b/.test(texto)) return null;
  const entidades = entidadesDe(paresDe(texto));
  const trazos: Trazo[] = [];
  let esperandoVerticesDe: { cerrada: boolean; puntos: Punto[] } | null = null;

  for (const entidad of entidades) {
    if (entidad.tipo === 'POLYLINE') {
      esperandoVerticesDe = { cerrada: trazoCerrado(entidad.pares), puntos: [] };
      continue;
    }
    if (entidad.tipo === 'VERTEX' && esperandoVerticesDe) {
      const x = primero(entidad.pares, 10);
      const y = primero(entidad.pares, 20);
      if (x !== null && y !== null) esperandoVerticesDe.puntos.push({ x, y });
      continue;
    }
    if (entidad.tipo === 'SEQEND') {
      if (esperandoVerticesDe && esperandoVerticesDe.puntos.length > 1) {
        trazos.push({ puntos: esperandoVerticesDe.puntos, cerrado: esperandoVerticesDe.cerrada });
      }
      esperandoVerticesDe = null;
      continue;
    }
    trazos.push(...trazoEntidad(entidad));
  }
  if (esperandoVerticesDe && esperandoVerticesDe.puntos.length > 1) {
    trazos.push({ puntos: esperandoVerticesDe.puntos, cerrado: esperandoVerticesDe.cerrada });
  }
  if (trazos.length === 0) return null;
  return { trazos };
}
