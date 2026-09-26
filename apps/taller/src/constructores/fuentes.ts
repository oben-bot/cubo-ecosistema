/**
 * Registro de tipografias disponibles para el constructor de texto.
 * Usa fuentes con licencia libre documentadas.
 * Incluye DejaVu (Bitstream Vera + Arev, licencia libre permite uso comercial)
 * y las OFL Anton, Oswald, Bebas Neue.
 *
 * Nota tecnica: para DejaVu (y Anton/Oswald/Bebas) el contorno exterior tiene area negativa,
 * por eso se usa area negativa como criterio de exterior (ver texto.ts).
 *
 * Se buscan en orden:
 * 1. apps/taller/recursos/fuentes/
 * 2. /usr/share/fonts/truetype/dejavu/ (sistema)
 * 3. node_modules/@fontsource/.../files/*.woff
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR_ACTUAL = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_TALLER = path.resolve(DIR_ACTUAL, '..', '..');
const RECURSOS_FUENTES = path.join(RAIZ_TALLER, 'recursos', 'fuentes');

export interface FuenteInfo {
  id: string;
  nombre: string;
  archivo: string;
  licencia: string;
  autor: string;
  peso: string;
  descripcion: string;
}

const FUENTES_DEFINIDAS: Array<Omit<FuenteInfo, 'archivo'> & { candidatos: string[] }> = [
  {
    id: 'dejavu-sans-bold',
    nombre: 'DejaVu Sans Bold',
    licencia: 'Bitstream Vera + Arev + DejaVu (libre, permite uso comercial)',
    autor: 'DejaVu Project (derivada de Bitstream Vera)',
    peso: '700 - Bold',
    descripcion: 'Sans bold muy legible, trazo grueso, soldadura excelente con solapamiento 12-15%. Exterior area negativa.',
    candidatos: [
      '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
      path.join(RECURSOS_FUENTES, 'DejaVuSans-Bold.ttf'),
      path.join(RECURSOS_FUENTES, 'dejavu-sans-bold.ttf'),
      path.join(RAIZ_TALLER, 'node_modules', '@fontsource', 'dejavu-sans', 'files', 'dejavu-sans-latin-700-normal.woff'),
    ],
  },
  {
    id: 'dejavu-sans',
    nombre: 'DejaVu Sans',
    licencia: 'Bitstream Vera + Arev + DejaVu (libre)',
    autor: 'DejaVu Project',
    peso: '400 - Regular',
    descripcion: 'Sans regular, buena para pruebas de soldadura con fuentes no tan negritas. Exterior area negativa.',
    candidatos: [
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      path.join(RECURSOS_FUENTES, 'DejaVuSans.ttf'),
    ],
  },
  {
    id: 'anton',
    nombre: 'Anton Regular',
    licencia: 'SIL Open Font License 1.1',
    autor: 'The Anton Project Authors (https://github.com/googlefonts/AntonFont)',
    peso: '400 - Bold display',
    descripcion: 'Fuente display muy negrita, ideal para corte laser. Ancho generoso, buena soldadura entre letras. Exterior area negativa.',
    candidatos: [
      path.join(RECURSOS_FUENTES, 'anton-latin-400-normal.woff'),
      path.join(RAIZ_TALLER, 'node_modules', '@fontsource', 'anton', 'files', 'anton-latin-400-normal.woff'),
      path.join(RAIZ_TALLER, '..', 'biblioteca', 'node_modules', '@fontsource', 'anton', 'files', 'anton-latin-400-normal.woff'),
      '/tmp/testfonts2/node_modules/@fontsource/anton/files/anton-latin-400-normal.woff',
    ],
  },
  {
    id: 'oswald-bold',
    nombre: 'Oswald Bold',
    licencia: 'SIL Open Font License 1.1',
    autor: 'The Oswald Project Authors (https://github.com/googlefonts/OswaldFont)',
    peso: '700 - Bold',
    descripcion: 'Grotesca condensada, muy usada en carteleria. Buen equilibrio entre legibilidad y soldadura. Exterior area negativa.',
    candidatos: [
      path.join(RECURSOS_FUENTES, 'oswald-latin-700-normal.woff'),
      path.join(RAIZ_TALLER, 'node_modules', '@fontsource', 'oswald', 'files', 'oswald-latin-700-normal.woff'),
      '/tmp/testfonts2/node_modules/@fontsource/oswald/files/oswald-latin-700-normal.woff',
    ],
  },
  {
    id: 'bebas-neue',
    nombre: 'Bebas Neue Regular',
    licencia: 'SIL Open Font License 1.1',
    autor: 'The Bebas Neue Project Authors (https://github.com/dharmatype/Bebas-Neue)',
    peso: '400 - Regular',
    descripcion: 'Condensada alta, muy popular para letreros. Requiere algo mas de solapamiento por ser estrecha. Exterior area negativa.',
    candidatos: [
      path.join(RECURSOS_FUENTES, 'bebas-neue-latin-400-normal.woff'),
      path.join(RAIZ_TALLER, 'node_modules', '@fontsource', 'bebas-neue', 'files', 'bebas-neue-latin-400-normal.woff'),
      '/tmp/testfonts2/node_modules/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff',
    ],
  },
];

let cacheFuentes: FuenteInfo[] | null = null;

export function listarFuentes(): FuenteInfo[] {
  if (cacheFuentes) return cacheFuentes;

  const encontradas: FuenteInfo[] = [];

  for (const def of FUENTES_DEFINIDAS) {
    let archivoEncontrado: string | null = null;
    for (const candidato of def.candidatos) {
      if (fs.existsSync(candidato)) {
        archivoEncontrado = candidato;
        break;
      }
    }
    if (archivoEncontrado) {
      encontradas.push({
        id: def.id,
        nombre: def.nombre,
        archivo: archivoEncontrado,
        licencia: def.licencia,
        autor: def.autor,
        peso: def.peso,
        descripcion: def.descripcion,
      });
    }
  }

  // Si no se encontro ninguna, intentar buscar cualquier woff/ttf en recursos/fuentes
  if (encontradas.length === 0 && fs.existsSync(RECURSOS_FUENTES)) {
    const archivos = fs.readdirSync(RECURSOS_FUENTES).filter((f) => f.endsWith('.woff') || f.endsWith('.ttf') || f.endsWith('.otf'));
    for (const archivo of archivos) {
      encontradas.push({
        id: path.parse(archivo).name,
        nombre: path.parse(archivo).name,
        archivo: path.join(RECURSOS_FUENTES, archivo),
        licencia: 'Desconocida - verificar',
        autor: 'Desconocido',
        peso: '400',
        descripcion: 'Fuente local sin metadatos',
      });
    }
  }

  cacheFuentes = encontradas;
  return encontradas;
}

export function obtenerFuente(id: string): FuenteInfo | null {
  const todas = listarFuentes();
  return todas.find((f) => f.id === id) ?? null;
}

export function limpiarCacheFuentes(): void {
  cacheFuentes = null;
}
