/**
 * Orquestador de capturas: convierte un archivo de diseno en una imagen PNG.
 *
 * Solo SVG y DXF se pueden renderizar sin dependencias nativas. Para el resto
 * (PDF, STL, 3MF, apps) la miniatura viene de la imagen que sube el usuario o de la que
 * trae el ZIP; si no hay ninguna, la ficha queda sin imagen y la interfaz muestra una
 * insignia con el formato, en lugar de una imagen inventada.
 */
import { dxfAGeometria } from './dxf.ts';
import { svgAGeometria } from './svg.ts';
import { renderizarGeometria, type Geometria } from './lienzo.ts';

export { ErrorCaptura } from './lienzo.ts';

export function puedeGenerarCaptura(formato: string): boolean {
  return formato === 'svg' || formato === 'dxf';
}

export function geometriaDeArchivo(formato: string, contenido: Buffer): Geometria | null {
  switch (formato) {
    case 'svg': {
      const geometria = svgAGeometria(contenido.toString('utf8'));
      return geometria.trazos.length > 0 ? geometria : null;
    }
    case 'dxf':
      return dxfAGeometria(contenido);
    default:
      return null;
  }
}

export interface OpcionesCaptura {
  formato: string;
  contenido: Buffer;
  lado: number;
}

/** Genera el PNG de la captura, o null si el formato no se puede renderizar. */
export function generarCaptura(opciones: OpcionesCaptura): Buffer | null {
  if (!puedeGenerarCaptura(opciones.formato)) return null;
  const geometria = geometriaDeArchivo(opciones.formato, opciones.contenido);
  if (geometria === null) return null;
  return renderizarGeometria(geometria, { lado: opciones.lado });
}
