/**
 * Migraciones versionadas de la base de datos de la Biblioteca.
 *
 * Cada entrada es inmutable una vez entregada: si el esquema cambia, se agrega una
 * migracion nueva (regla 7 de ARQUITECTURA.md). El SQL vive aqui, y no en archivos .sql
 * sueltos, para que la compilacion con `tsc` no requiera copiar recursos.
 *
 * La tabla de control `migraciones` la crea el propio migrador (ver db/index.ts), no es
 * una migracion: asi el registro de versiones existe antes de aplicar la primera.
 */
export interface Migracion {
  version: number;
  nombre: string;
  sql: string;
}

const M0001_INICIAL = `
CREATE TABLE secuencias (
  clave TEXT PRIMARY KEY,
  valor INTEGER NOT NULL
);

CREATE TABLE activos (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('laser2d','modelo3d','software','app','otro')),
  espacio TEXT NOT NULL CHECK (espacio IN ('original','trabajo')),
  original_id TEXT REFERENCES activos(id) ON DELETE RESTRICT,
  nombre TEXT NOT NULL,
  categoria TEXT,
  material TEXT,
  ancho_mm REAL,
  alto_mm REAL,
  profundidad_mm REAL,
  origen TEXT NOT NULL,
  licencia TEXT NOT NULL CHECK (licencia IN ('propia','comercial_ok','solo_personal','desconocida')),
  vendible_digital INTEGER NOT NULL DEFAULT 0 CHECK (vendible_digital IN (0,1)),
  receta TEXT,
  ubicacion_almacen TEXT NOT NULL DEFAULT 'ssd' CHECK (ubicacion_almacen IN ('ssd','hdd','nube')),
  notas TEXT,
  creado TEXT NOT NULL,
  actualizado TEXT NOT NULL,
  -- Un "trabajo" siempre enlaza a su original; un "original" nunca enlaza a otro.
  CHECK ((espacio = 'trabajo') = (original_id IS NOT NULL))
);

CREATE INDEX idx_activos_espacio ON activos(espacio);
CREATE INDEX idx_activos_tipo ON activos(tipo);
CREATE INDEX idx_activos_categoria ON activos(categoria);
CREATE INDEX idx_activos_original ON activos(original_id);

CREATE TABLE archivos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activo_id TEXT NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
  ruta_relativa TEXT NOT NULL UNIQUE,
  formato TEXT NOT NULL,
  tamano INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  posicion INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_archivos_activo ON archivos(activo_id);
CREATE INDEX idx_archivos_sha256 ON archivos(sha256);

CREATE TABLE imagenes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activo_id TEXT NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
  ruta_relativa TEXT NOT NULL UNIQUE,
  origen_imagen TEXT NOT NULL CHECK (origen_imagen IN ('zip','web','captura','foto_terminado')),
  posicion INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_imagenes_activo ON imagenes(activo_id);

CREATE TABLE etiquetas (
  activo_id TEXT NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
  etiqueta TEXT NOT NULL,
  PRIMARY KEY (activo_id, etiqueta)
);

CREATE INDEX idx_etiquetas_texto ON etiquetas(etiqueta);

-- Indice de busqueda por palabra clave (nombre, categoria, etiquetas, origen, notas).
CREATE VIRTUAL TABLE activos_fts USING fts5(
  texto,
  activo_id UNINDEXED,
  tokenize = 'unicode61 remove_diacritics 2'
);

-- Regla de negocio en la propia base: vendible_digital solo con licencia propia o comercial_ok.
CREATE TRIGGER trg_vendible_digital_insert
BEFORE INSERT ON activos
FOR EACH ROW WHEN NEW.vendible_digital = 1 AND NEW.licencia NOT IN ('propia','comercial_ok')
BEGIN
  SELECT RAISE(ABORT, 'licencia_no_permite_venta_digital');
END;

CREATE TRIGGER trg_vendible_digital_update
BEFORE UPDATE ON activos
FOR EACH ROW WHEN NEW.vendible_digital = 1 AND NEW.licencia NOT IN ('propia','comercial_ok')
BEGIN
  SELECT RAISE(ABORT, 'licencia_no_permite_venta_digital');
END;

-- Los archivos e imagenes de un activo "original" son de solo lectura: ni la API ni la
-- interfaz pueden reescribirlos ni borrarlos.
CREATE TRIGGER trg_archivos_original_sin_update
BEFORE UPDATE ON archivos
FOR EACH ROW WHEN (SELECT espacio FROM activos WHERE id = OLD.activo_id) = 'original'
BEGIN
  SELECT RAISE(ABORT, 'original_de_solo_lectura');
END;

CREATE TRIGGER trg_archivos_original_sin_delete
BEFORE DELETE ON archivos
FOR EACH ROW WHEN (SELECT espacio FROM activos WHERE id = OLD.activo_id) = 'original'
BEGIN
  SELECT RAISE(ABORT, 'original_de_solo_lectura');
END;

CREATE TRIGGER trg_imagenes_original_sin_update
BEFORE UPDATE ON imagenes
FOR EACH ROW WHEN (SELECT espacio FROM activos WHERE id = OLD.activo_id) = 'original'
BEGIN
  SELECT RAISE(ABORT, 'original_de_solo_lectura');
END;

CREATE TRIGGER trg_imagenes_original_sin_delete
BEFORE DELETE ON imagenes
FOR EACH ROW WHEN (SELECT espacio FROM activos WHERE id = OLD.activo_id) = 'original'
BEGIN
  SELECT RAISE(ABORT, 'original_de_solo_lectura');
END;

INSERT INTO secuencias (clave, valor) VALUES ('activo', 0);
`;

export const MIGRACIONES: readonly Migracion[] = [
  { version: 1, nombre: '0001_inicial', sql: M0001_INICIAL },
];

export const VERSION_ESQUEMA_ACTUAL = MIGRACIONES.reduce((max, m) => Math.max(max, m.version), 0);
