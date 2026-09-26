import type { DatabaseSync } from 'node:sqlite';
import type { Contexto } from '../contexto.ts';

export interface Producto {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  etiquetas: string[];
  imagenes: string[];
  especificaciones?: Record<string, unknown>;
  tipo_venta: 'fisico' | 'digital';
  precio: number;
  moneda: string;
  contacto: string[];
  activo_id?: string | null;
  estado: 'borrador' | 'publicado';
  creado: string;
  actualizado: string;
}

function generarId(db: DatabaseSync, prefijo: string, secuencia: string): string {
  const row = db.prepare('UPDATE secuencias SET valor = valor + 1 WHERE nombre = ? RETURNING valor').get(secuencia) as any;
  const valor = row?.valor ?? Date.now();
  return `${prefijo}_${String(valor).padStart(6, '0')}`;
}

export function crearProducto(contexto: Contexto, datos: {
  nombre: string;
  descripcion?: string;
  categoria?: string;
  etiquetas?: string[];
  imagenes?: string[];
  especificaciones?: Record<string, unknown>;
  tipo_venta: 'fisico' | 'digital';
  precio: number;
  moneda?: string;
  contacto?: string[];
  activo_id?: string | null;
  estado?: 'borrador' | 'publicado';
}): Producto {
  const { db } = contexto;
  const id = generarId(db, 'prod', 'producto');
  const ahora = new Date().toISOString();
  const producto: Producto = {
    id,
    nombre: datos.nombre,
    descripcion: datos.descripcion ?? '',
    categoria: datos.categoria ?? '',
    etiquetas: datos.etiquetas ?? [],
    imagenes: datos.imagenes ?? [],
    especificaciones: datos.especificaciones ?? {},
    tipo_venta: datos.tipo_venta,
    precio: datos.precio,
    moneda: datos.moneda ?? 'MXN',
    contacto: datos.contacto ?? ['whatsapp'],
    activo_id: datos.activo_id ?? null,
    estado: datos.estado ?? 'publicado',
    creado: ahora,
    actualizado: ahora,
  };

  db.prepare(`
    INSERT INTO productos (id, nombre, descripcion, categoria, etiquetas, imagenes, especificaciones, tipo_venta, precio, moneda, contacto, activo_id, estado, creado, actualizado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    producto.id,
    producto.nombre,
    producto.descripcion ?? '',
    producto.categoria ?? '',
    JSON.stringify(producto.etiquetas),
    JSON.stringify(producto.imagenes),
    JSON.stringify(producto.especificaciones ?? {}),
    producto.tipo_venta,
    producto.precio,
    producto.moneda,
    JSON.stringify(producto.contacto),
    producto.activo_id ?? null,
    producto.estado,
    producto.creado,
    producto.actualizado,
  );

  return producto;
}

export function listarProductos(db: DatabaseSync, estado?: string): Producto[] {
  const sql = estado ? 'SELECT * FROM productos WHERE estado = ? ORDER BY creado DESC' : 'SELECT * FROM productos ORDER BY creado DESC';
  const params = estado ? [estado] : [];
  const rows = db.prepare(sql).all(...params) as any[];
  return rows.map(mapRow);
}

export function obtenerProducto(db: DatabaseSync, id: string): Producto | null {
  const row = db.prepare('SELECT * FROM productos WHERE id = ?').get(id) as any;
  return row ? mapRow(row) : null;
}

function mapRow(row: any): Producto {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    categoria: row.categoria,
    etiquetas: JSON.parse(row.etiquetas ?? '[]'),
    imagenes: JSON.parse(row.imagenes ?? '[]'),
    especificaciones: JSON.parse(row.especificaciones ?? '{}'),
    tipo_venta: row.tipo_venta,
    precio: row.precio,
    moneda: row.moneda,
    contacto: JSON.parse(row.contacto ?? '[]'),
    activo_id: row.activo_id,
    estado: row.estado,
    creado: row.creado,
    actualizado: row.actualizado,
  };
}
