import type { DatabaseSync } from 'node:sqlite';

export function migrar(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS esquema_version (
      version INTEGER PRIMARY KEY,
      aplicado_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS productos (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      categoria TEXT,
      etiquetas TEXT, -- JSON array
      imagenes TEXT, -- JSON array
      especificaciones TEXT, -- JSON
      tipo_venta TEXT NOT NULL CHECK (tipo_venta IN ('fisico','digital')),
      precio REAL NOT NULL,
      moneda TEXT NOT NULL DEFAULT 'MXN',
      contacto TEXT, -- JSON array
      activo_id TEXT,
      estado TEXT NOT NULL DEFAULT 'publicado' CHECK (estado IN ('borrador','publicado')),
      creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      actualizado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS entregas (
      id TEXT PRIMARY KEY,
      pedido_id TEXT NOT NULL,
      producto_id TEXT,
      activo_id TEXT,
      cliente_nombre TEXT NOT NULL,
      cliente_email TEXT NOT NULL,
      tipo_pago TEXT NOT NULL CHECK (tipo_pago IN ('paypal','cuenta')),
      ubicacion TEXT NOT NULL CHECK (ubicacion IN ('pc','nube')),
      enlace TEXT,
      confirmacion TEXT NOT NULL CHECK (confirmacion IN ('automatica','manual')),
      estado TEXT NOT NULL CHECK (estado IN ('pendiente','aprobada','enviada','error')),
      mensaje TEXT,
      creado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      actualizado TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS secuencias (
      nombre TEXT PRIMARY KEY,
      valor INTEGER NOT NULL DEFAULT 0
    );
    INSERT OR IGNORE INTO secuencias (nombre, valor) VALUES ('producto', 0), ('entrega', 0), ('pedido', 0);
  `);

  const row = db.prepare('SELECT MAX(version) as v FROM esquema_version').get() as any;
  const actual = row?.v ?? 0;
  if (actual < 1) {
    db.prepare('INSERT OR IGNORE INTO esquema_version (version) VALUES (1)').run();
  }
}
