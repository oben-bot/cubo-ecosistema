/**
 * Conversor SVG -> geometria de trazos.
 *
 * Es un parseo tolerante orientado a generar una vista previa: cubre los elementos de
 * dibujo habituales (path, line, polyline, polygon, rect, circle, ellipse) y las
 * transformaciones (translate, scale, rotate, skew, matrix). No interpreta rellenos,
 * estilos, degradados, textos ni referencias <use>: se dibuja la geometria como contorno.
 */
import {
  muestrearCubica,
  muestrearCuadratica,
  type Geometria,
  type Punto,
  type Trazo,
} from './lienzo.ts';

type Matriz = [number, number, number, number, number, number]; // a b c d e f

const IDENTIDAD: Matriz = [1, 0, 0, 1, 0, 0];

function multiplicar(m1: Matriz, m2: Matriz): Matriz {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

function aplicar(m: Matriz, p: Punto): Punto {
  const [a, b, c, d, e, f] = m;
  return { x: a * p.x + c * p.y + e, y: b * p.x + d * p.y + f };
}

const RE_FUNCION = /([a-zA-Z]+)\s*\(([^)]*)\)/g;

export function analizarTransform(valor: string | undefined): Matriz {
  if (!valor) return IDENTIDAD;
  let matriz: Matriz = IDENTIDAD;
  RE_FUNCION.lastIndex = 0;
  let coincidencia: RegExpExecArray | null;
  while ((coincidencia = RE_FUNCION.exec(valor)) !== null) {
    const funcion = coincidencia[1].toLowerCase();
    const numeros = (coincidencia[2] ?? '')
      .split(/[\s,]+/)
      .filter((s) => s.length > 0)
      .map(Number)
      .filter((n) => Number.isFinite(n));
    let nueva: Matriz = IDENTIDAD;
    switch (funcion) {
      case 'translate':
        nueva = [1, 0, 0, 1, numeros[0] ?? 0, numeros[1] ?? 0];
        break;
      case 'scale': {
        const sx = numeros[0] ?? 1;
        const sy = numeros.length > 1 ? numeros[1] : sx;
        nueva = [sx, 0, 0, sy, 0, 0];
        break;
      }
      case 'rotate': {
        const angulo = ((numeros[0] ?? 0) * Math.PI) / 180;
        const cos = Math.cos(angulo);
        const sen = Math.sin(angulo);
        const cx = numeros[1] ?? 0;
        const cy = numeros[2] ?? 0;
        nueva = multiplicar(
          multiplicar([1, 0, 0, 1, cx, cy], [cos, sen, -sen, cos, 0, 0]),
          [1, 0, 0, 1, -cx, -cy],
        );
        break;
      }
      case 'skewx': {
        const t = Math.tan(((numeros[0] ?? 0) * Math.PI) / 180);
        nueva = [1, 0, t, 1, 0, 0];
        break;
      }
      case 'skewy': {
        const t = Math.tan(((numeros[0] ?? 0) * Math.PI) / 180);
        nueva = [1, t, 0, 1, 0, 0];
        break;
      }
      case 'matrix':
        if (numeros.length >= 6) {
          nueva = [numeros[0], numeros[1], numeros[2], numeros[3], numeros[4], numeros[5]];
        }
        break;
      default:
        nueva = IDENTIDAD;
    }
    matriz = multiplicar(matriz, nueva);
  }
  return matriz;
}

/** Escaner de numeros para la sintaxis compacta de `d` (arcos incluidos). */
class Escaner {
  private posicion = 0;
  private readonly texto: string;

  constructor(texto: string) {
    this.texto = texto;
  }

  esFin(): boolean {
    this.saltarSeparadores();
    return this.posicion >= this.texto.length;
  }

  private saltarSeparadores(): void {
    while (this.posicion < this.texto.length && /[\s,]/.test(this.texto[this.posicion])) this.posicion += 1;
  }

  mirarComando(): string | null {
    this.saltarSeparadores();
    const caracter = this.texto[this.posicion];
    if (caracter === undefined) return null;
    return /[a-zA-Z]/.test(caracter) ? caracter : null;
  }

  tomarComando(): string {
    this.saltarSeparadores();
    const caracter = this.texto[this.posicion];
    this.posicion += 1;
    return caracter ?? '';
  }

  /** Lee una bandera de arco: un solo caracter 0 o 1, sin separador obligatorio. */
  leerBandera(): number {
    this.saltarSeparadores();
    const caracter = this.texto[this.posicion];
    if (caracter === '0' || caracter === '1') {
      this.posicion += 1;
      return caracter === '1' ? 1 : 0;
    }
    return this.leerNumero() === 0 ? 0 : 1;
  }

  leerNumero(): number {
    this.saltarSeparadores();
    const resto = this.texto.slice(this.posicion);
    const coincidencia = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(resto);
    if (!coincidencia) return Number.NaN;
    this.posicion += coincidencia[0].length;
    return Number(coincidencia[0]);
  }

  hayNumero(): boolean {
    this.saltarSeparadores();
    return /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.test(this.texto.slice(this.posicion));
  }
}

function convertirArco(
  desde: Punto,
  hasta: Punto,
  rxBruto: number,
  ryBruto: number,
  rotacionGrados: number,
  arcoGrande: boolean,
  sentidoHorario: boolean,
): Punto[] {
  let rx = Math.abs(rxBruto);
  let ry = Math.abs(ryBruto);
  if (rx < 1e-9 || ry < 1e-9 || (desde.x === hasta.x && desde.y === hasta.y)) {
    return [hasta];
  }
  const phi = (rotacionGrados * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const senPhi = Math.sin(phi);
  const dx = (desde.x - hasta.x) / 2;
  const dy = (desde.y - hasta.y) / 2;
  const x1p = cosPhi * dx + senPhi * dy;
  const y1p = -senPhi * dx + cosPhi * dy;

  // Correccion de radios segun la especificacion SVG.
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const factor = Math.sqrt(lambda);
    rx *= factor;
    ry *= factor;
  }

  const numerador = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const denominador = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coeficiente = (arcoGrande === sentidoHorario ? -1 : 1) * Math.sqrt(Math.max(0, numerador / (denominador || 1)));
  const cxp = (coeficiente * (rx * y1p)) / ry;
  const cyp = (coeficiente * -(ry * x1p)) / rx;
  const cx = cosPhi * cxp - senPhi * cyp + (desde.x + hasta.x) / 2;
  const cy = senPhi * cxp + cosPhi * cyp + (desde.y + hasta.y) / 2;

  const anguloDe = (ux: number, uy: number, vx: number, vy: number): number => {
    const producto = ux * vx + uy * vy;
    const norma = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy)) || 1;
    const cociente = Math.max(-1, Math.min(1, producto / norma));
    const angulo = Math.acos(cociente);
    return ux * vy - uy * vx < 0 ? -angulo : angulo;
  };

  const theta1 = anguloDe(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let deltaTheta = anguloDe((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  const dosPi = Math.PI * 2;
  if (!sentidoHorario && deltaTheta > 0) deltaTheta -= dosPi;
  if (sentidoHorario && deltaTheta < 0) deltaTheta += dosPi;

  const pasos = Math.max(8, Math.min(96, Math.ceil((Math.abs(deltaTheta) / (Math.PI / 8)) * 2)));
  const salida: Punto[] = [];
  for (let i = 1; i <= pasos; i += 1) {
    const angulo = theta1 + (deltaTheta * i) / pasos;
    const x = rx * Math.cos(angulo);
    const y = ry * Math.sin(angulo);
    salida.push({ x: cosPhi * x - senPhi * y + cx, y: senPhi * x + cosPhi * y + cy });
  }
  return salida;
}

/** Interpreta el atributo `d` de un <path> y devuelve sus trazos. */
export function tramosDePath(d: string): Trazo[] {
  const trazos: Trazo[] = [];
  if (typeof d !== 'string' || d.trim().length === 0) return trazos;
  const escaner = new Escaner(d);
  let actual: Punto[] = [];
  let inicio: Punto = { x: 0, y: 0 };
  let cursor: Punto = { x: 0, y: 0 };
  let comando = '';
  let ultimoControlCubico: Punto | null = null;
  let ultimoControlCuadratico: Punto | null = null;

  const cerrarTrazo = (): void => {
    if (actual.length > 0) {
      trazos.push({ puntos: actual, cerrado: false });
      actual = [];
    }
  };

  while (!escaner.esFin()) {
    const comandoLeido = escaner.mirarComando();
    if (comandoLeido !== null) comando = escaner.tomarComando();
    if (comando === '') break;
    const relativo = comando === comando.toLowerCase();
    const base = relativo ? cursor : { x: 0, y: 0 };
    const letra = comando.toUpperCase();

    if (letra === 'Z') {
      if (actual.length > 0) {
        trazos.push({ puntos: actual, cerrado: true });
        actual = [];
      }
      cursor = { ...inicio };
      ultimoControlCubico = null;
      ultimoControlCuadratico = null;
      continue;
    }

    if (!escaner.hayNumero() && letra !== 'Z') {
      // Sin mas datos: se evita un bucle infinito sobre una letra suelta.
      if (escaner.mirarComando() === null) break;
      continue;
    }

    switch (letra) {
      case 'M': {
        const x = escaner.leerNumero() + base.x;
        const y = escaner.leerNumero() + base.y;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return trazos;
        cerrarTrazo();
        cursor = { x, y };
        inicio = { x, y };
        actual = [{ x, y }];
        comando = relativo ? 'l' : 'L'; // pares siguientes son lineto implicito
        break;
      }
      case 'L': {
        const x = escaner.leerNumero() + base.x;
        const y = escaner.leerNumero() + base.y;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return trazos;
        if (actual.length === 0) actual = [{ ...cursor }];
        cursor = { x, y };
        actual.push({ x, y });
        ultimoControlCubico = null;
        ultimoControlCuadratico = null;
        break;
      }
      case 'H': {
        const x = escaner.leerNumero() + (relativo ? cursor.x : 0);
        if (!Number.isFinite(x)) return trazos;
        if (actual.length === 0) actual = [{ ...cursor }];
        cursor = { x, y: cursor.y };
        actual.push({ ...cursor });
        break;
      }
      case 'V': {
        const y = escaner.leerNumero() + (relativo ? cursor.y : 0);
        if (!Number.isFinite(y)) return trazos;
        if (actual.length === 0) actual = [{ ...cursor }];
        cursor = { x: cursor.x, y };
        actual.push({ ...cursor });
        break;
      }
      case 'C': {
        const x1 = escaner.leerNumero() + base.x;
        const y1 = escaner.leerNumero() + base.y;
        const x2 = escaner.leerNumero() + base.x;
        const y2 = escaner.leerNumero() + base.y;
        const x = escaner.leerNumero() + base.x;
        const y = escaner.leerNumero() + base.y;
        if (actual.length === 0) actual = [{ ...cursor }];
        actual.push(...muestrearCubica(cursor, { x: x1, y: y1 }, { x: x2, y: y2 }, { x, y }));
        ultimoControlCubico = { x: x2, y: y2 };
        ultimoControlCuadratico = null;
        cursor = { x, y };
        break;
      }
      case 'S': {
        const reflejo: Punto = ultimoControlCubico
          ? { x: 2 * cursor.x - ultimoControlCubico.x, y: 2 * cursor.y - ultimoControlCubico.y }
          : { ...cursor };
        const x2 = escaner.leerNumero() + base.x;
        const y2 = escaner.leerNumero() + base.y;
        const x = escaner.leerNumero() + base.x;
        const y = escaner.leerNumero() + base.y;
        if (actual.length === 0) actual = [{ ...cursor }];
        actual.push(...muestrearCubica(cursor, reflejo, { x: x2, y: y2 }, { x, y }));
        ultimoControlCubico = { x: x2, y: y2 };
        cursor = { x, y };
        break;
      }
      case 'Q': {
        const x1 = escaner.leerNumero() + base.x;
        const y1 = escaner.leerNumero() + base.y;
        const x = escaner.leerNumero() + base.x;
        const y = escaner.leerNumero() + base.y;
        if (actual.length === 0) actual = [{ ...cursor }];
        actual.push(...muestrearCuadratica(cursor, { x: x1, y: y1 }, { x, y }));
        ultimoControlCuadratico = { x: x1, y: y1 };
        ultimoControlCubico = null;
        cursor = { x, y };
        break;
      }
      case 'T': {
        const reflejo: Punto = ultimoControlCuadratico
          ? { x: 2 * cursor.x - ultimoControlCuadratico.x, y: 2 * cursor.y - ultimoControlCuadratico.y }
          : { ...cursor };
        const x = escaner.leerNumero() + base.x;
        const y = escaner.leerNumero() + base.y;
        if (actual.length === 0) actual = [{ ...cursor }];
        actual.push(...muestrearCuadratica(cursor, reflejo, { x, y }));
        ultimoControlCuadratico = reflejo;
        cursor = { x, y };
        break;
      }
      case 'A': {
        const rx = escaner.leerNumero();
        const ry = escaner.leerNumero();
        const rotacion = escaner.leerNumero();
        const arcoGrande = escaner.leerBandera() === 1;
        const horario = escaner.leerBandera() === 1;
        const x = escaner.leerNumero() + base.x;
        const y = escaner.leerNumero() + base.y;
        if (actual.length === 0) actual = [{ ...cursor }];
        actual.push(...convertirArco(cursor, { x, y }, rx, ry, rotacion, arcoGrande, horario));
        cursor = { x, y };
        ultimoControlCubico = null;
        ultimoControlCuadratico = null;
        break;
      }
      default:
        // Comando desconocido: se ignora el resto del atributo.
        return trazos;
    }
  }
  cerrarTrazo();
  return trazos;
}

interface Etiqueta {
  nombre: string;
  cierre: boolean;
  atributos: Record<string, string>;
  automatica: boolean;
}

const RE_ETIQUETA = /<(\/?)([a-zA-Z_][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const RE_ATRIBUTO = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

function* etiquetasDe(svg: string): Generator<Etiqueta> {
  RE_ETIQUETA.lastIndex = 0;
  let coincidencia: RegExpExecArray | null;
  while ((coincidencia = RE_ETIQUETA.exec(svg)) !== null) {
    const nombre = coincidencia[2];
    if (nombre.startsWith('?') || nombre.startsWith('!')) continue;
    const atributos: Record<string, string> = {};
    const textoAtributos = coincidencia[3] ?? '';
    RE_ATRIBUTO.lastIndex = 0;
    let atributo: RegExpExecArray | null;
    while ((atributo = RE_ATRIBUTO.exec(textoAtributos)) !== null) {
      atributos[atributo[1].toLowerCase()] = atributo[2] ?? atributo[3] ?? '';
    }
    yield {
      nombre: nombre.toLowerCase(),
      cierre: coincidencia[1] === '/',
      atributos,
      automatica: (coincidencia[0] ?? '').endsWith('/>'),
    };
  }
}

function numero(atributos: Record<string, string>, clave: string, porDefecto = 0): number {
  const valor = Number(atributos[clave]);
  return Number.isFinite(valor) ? valor : porDefecto;
}

const ETIQUETAS_IGNORADAS = new Set(['defs', 'style', 'script', 'symbol', 'clippath', 'mask', 'pattern', 'filter', 'marker', 'title', 'desc', 'metadata']);

function puntosDeLista(valor: string | undefined): Punto[] {
  if (!valor) return [];
  const numeros = valor
    .split(/[\s,]+/)
    .filter((s) => s.length > 0)
    .map(Number);
  const salida: Punto[] = [];
  for (let i = 0; i + 1 < numeros.length; i += 2) {
    const x = numeros[i];
    const y = numeros[i + 1];
    if (Number.isFinite(x) && Number.isFinite(y)) salida.push({ x, y });
  }
  return salida;
}

function circuloATrazo(centro: Punto, radioX: number, radioY: number): Trazo | null {
  if (radioX <= 0 || radioY <= 0) return null;
  const puntos: Punto[] = [];
  const pasos = 72;
  for (let i = 0; i < pasos; i += 1) {
    const angulo = (i / pasos) * Math.PI * 2;
    puntos.push({ x: centro.x + radioX * Math.cos(angulo), y: centro.y + radioY * Math.sin(angulo) });
  }
  return { puntos, cerrado: true };
}

function rectanguloATrazos(atributos: Record<string, string>): Trazo[] {
  const x = numero(atributos, 'x');
  const y = numero(atributos, 'y');
  const ancho = numero(atributos, 'width');
  const alto = numero(atributos, 'height');
  if (ancho <= 0 || alto <= 0) return [];
  let rx = numero(atributos, 'rx', Number.NaN);
  let ry = numero(atributos, 'ry', Number.NaN);
  if (!Number.isFinite(rx) && Number.isFinite(ry)) rx = ry;
  if (!Number.isFinite(ry) && Number.isFinite(rx)) ry = rx;
  if (!Number.isFinite(rx)) rx = 0;
  if (!Number.isFinite(ry)) ry = 0;
  rx = Math.min(rx, ancho / 2);
  ry = Math.min(ry, alto / 2);
  if (rx <= 0 || ry <= 0) {
    return [
      {
        puntos: [
          { x, y },
          { x: x + ancho, y },
          { x: x + ancho, y: y + alto },
          { x, y: y + alto },
        ],
        cerrado: true,
      },
    ];
  }
  const puntos: Punto[] = [];
  const esquinas: Array<[number, number, number]> = [
    [x + ancho - rx, y + ry, -Math.PI / 2],
    [x + ancho - rx, y + alto - ry, 0],
    [x + rx, y + alto - ry, Math.PI / 2],
    [x + rx, y + ry, Math.PI],
  ];
  for (const [cx, cy, inicio] of esquinas) {
    for (let i = 0; i <= 8; i += 1) {
      const angulo = inicio + (i / 8) * (Math.PI / 2);
      puntos.push({ x: cx + rx * Math.cos(angulo), y: cy + ry * Math.sin(angulo) });
    }
  }
  return [{ puntos, cerrado: true }];
}

/**
 * Extrae la geometria dibujable de un SVG. Devuelve los trazos en coordenadas del modelo
 * con Y invertida, para que el renderizador (Y hacia arriba) muestre el diseno derecho.
 */
export function svgAGeometria(texto: string): Geometria {
  const salida: Trazo[] = [];
  const pila: Matriz[] = [IDENTIDAD];
  let profundidadIgnorada = 0;

  const actual = (): Matriz => pila[pila.length - 1] ?? IDENTIDAD;
  const transformar = (trazos: Trazo[]): void => {
    const matriz = actual();
    for (const trazo of trazos) {
      salida.push({ puntos: trazo.puntos.map((p) => aplicar(matriz, p)), cerrado: trazo.cerrado });
    }
  };

  for (const etiqueta of etiquetasDe(texto)) {
    if (ETIQUETAS_IGNORADAS.has(etiqueta.nombre)) {
      if (!etiqueta.cierre && !etiqueta.automatica) profundidadIgnorada += 1;
      else if (etiqueta.cierre && profundidadIgnorada > 0) profundidadIgnorada -= 1;
      continue;
    }
    if (profundidadIgnorada > 0) continue;

    const esGrupo = etiqueta.nombre === 'g' || etiqueta.nombre === 'svg' || etiqueta.nombre === 'a';
    if (etiqueta.cierre) {
      if (esGrupo && pila.length > 1) pila.pop();
      continue;
    }

    const matrizEtiqueta = analizarTransform(etiqueta.atributos.transform);
    if (esGrupo) {
      pila.push(multiplicar(actual(), matrizEtiqueta));
      if (etiqueta.automatica) pila.pop();
      continue;
    }

    const matrizElemento = multiplicar(actual(), matrizEtiqueta);
    const transformarCon = (trazos: Trazo[]): void => {
      for (const trazo of trazos) {
        salida.push({ puntos: trazo.puntos.map((p) => aplicar(matrizElemento, p)), cerrado: trazo.cerrado });
      }
    };

    switch (etiqueta.nombre) {
      case 'path': {
        transformarCon(tramosDePath(etiqueta.atributos.d ?? ''));
        break;
      }
      case 'line': {
        transformarCon([
          {
            puntos: [
              { x: numero(etiqueta.atributos, 'x1'), y: numero(etiqueta.atributos, 'y1') },
              { x: numero(etiqueta.atributos, 'x2'), y: numero(etiqueta.atributos, 'y2') },
            ],
            cerrado: false,
          },
        ]);
        break;
      }
      case 'polyline':
        transformarCon([{ puntos: puntosDeLista(etiqueta.atributos.points), cerrado: false }]);
        break;
      case 'polygon':
        transformarCon([{ puntos: puntosDeLista(etiqueta.atributos.points), cerrado: true }]);
        break;
      case 'rect':
        transformarCon(rectanguloATrazos(etiqueta.atributos));
        break;
      case 'circle': {
        const trazo = circuloATrazo(
          { x: numero(etiqueta.atributos, 'cx'), y: numero(etiqueta.atributos, 'cy') },
          numero(etiqueta.atributos, 'r'),
          numero(etiqueta.atributos, 'r'),
        );
        if (trazo) transformarCon([trazo]);
        break;
      }
      case 'ellipse': {
        const trazo = circuloATrazo(
          { x: numero(etiqueta.atributos, 'cx'), y: numero(etiqueta.atributos, 'cy') },
          numero(etiqueta.atributos, 'rx'),
          numero(etiqueta.atributos, 'ry'),
        );
        if (trazo) transformarCon([trazo]);
        break;
      }
      default:
        break;
    }
  }

  // Y invertida: SVG crece hacia abajo, el lienzo supone Y hacia arriba.
  return { trazos: salida.map((t) => ({ puntos: t.puntos.map((p) => ({ x: p.x, y: -p.y })), cerrado: t.cerrado })) };
}
