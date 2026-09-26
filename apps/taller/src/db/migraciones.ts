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

CREATE TABLE bandeja (
  id TEXT PRIMARY KEY,
  constructor TEXT NOT NULL CHECK (constructor IN ('texto','caja','llavero','otro')),
  formato TEXT NOT NULL,
  archivo_ruta TEXT NOT NULL,
  medidas_mm TEXT,
  receta TEXT,
  largo_corte_mm REAL,
  area_mm2 REAL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','guardado','descartado')),
  creado TEXT NOT NULL,
  actualizado TEXT NOT NULL
);

CREATE INDEX idx_bandeja_estado ON bandeja(estado);
CREATE INDEX idx_bandeja_constructor ON bandeja(constructor);
CREATE INDEX idx_bandeja_creado ON bandeja(creado);

INSERT INTO secuencias (clave, valor) VALUES ('bandeja', 0);
`;

export const MIGRACIONES: readonly Migracion[] = [
  { version: 1, nombre: '0001_inicial', sql: M0001_INICIAL },
];

export const VERSION_ESQUEMA_ACTUAL = MIGRACIONES.reduce((max, m) => Math.max(max, m.version), 0);
