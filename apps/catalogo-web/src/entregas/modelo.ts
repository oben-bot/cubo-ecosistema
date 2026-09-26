import type { DatabaseSync } from 'node:sqlite';
import type { Contexto } from '../contexto.ts';

export interface Entrega {
  id: string;
  pedido_id: string;
  producto_id?: string | null;
  activo_id?: string | null;
  cliente_nombre: string;
  cliente_email: string;
  tipo_pago: 'paypal' | 'cuenta';
  ubicacion: 'pc' | 'nube';
  enlace?: string | null;
  confirmacion: 'automatica' | 'manual';
  estado: 'pendiente' | 'aprobada' | 'enviada' | 'error';
  mensaje?: string | null;
  creado: string;
  actualizado: string;
}

function generarId(db: DatabaseSync, prefijo: string, secuencia: string): string {
  const row = db.prepare('UPDATE secuencias SET valor = valor + 1 WHERE nombre = ? RETURNING valor').get(secuencia) as any;
  const valor = row?.valor ?? Date.now();
  return `${prefijo}_${String(valor).padStart(6, '0')}`;
}

export function crearEntrega(contexto: Contexto, datos: {
  producto_id?: string | null;
  activo_id?: string | null;
  cliente_nombre: string;
  cliente_email: string;
  tipo_pago: 'paypal' | 'cuenta';
  ubicacion: 'pc' | 'nube';
  enlace?: string | null;
  confirmacion: 'automatica' | 'manual';
}): Entrega {
  const { db } = contexto;
  const id = generarId(db, 'ent', 'entrega');
  const pedido_id = generarId(db, 'ped', 'pedido');
  const ahora = new Date().toISOString();

  // Lógica E6: si ubicacion nube y confirmacion automatica => enviada inmediata con enlace
  // si pc => pendiente, necesita aprobación y PC encendida
  let estado: Entrega['estado'] = 'pendiente';
  let mensaje: string | null = null;
  let enlace = datos.enlace ?? null;

  if (datos.ubicacion === 'nube') {
    if (datos.confirmacion === 'automatica') {
      estado = 'enviada';
      if (!enlace) enlace = `https://drive.example.com/${datos.activo_id ?? datos.producto_id ?? 'archivo'}.zip`;
      mensaje = 'Entrega automática desde nube (TeraBox/Mega/Drive) - enviada inmediata';
    } else {
      estado = 'pendiente';
      mensaje = 'Entrega desde nube pendiente de aprobación manual';
    }
  } else {
    // pc
    estado = 'pendiente';
    mensaje = 'Archivo en PC local - requiere que la PC esté encendida. Se avisó al dueño y al cliente con mensaje de espera.';
  }

  const entrega: Entrega = {
    id,
    pedido_id,
    producto_id: datos.producto_id ?? null,
    activo_id: datos.activo_id ?? null,
    cliente_nombre: datos.cliente_nombre,
    cliente_email: datos.cliente_email,
    tipo_pago: datos.tipo_pago,
    ubicacion: datos.ubicacion,
    enlace,
    confirmacion: datos.confirmacion,
    estado,
    mensaje,
    creado: ahora,
    actualizado: ahora,
  };

  db.prepare(`
    INSERT INTO entregas (id, pedido_id, producto_id, activo_id, cliente_nombre, cliente_email, tipo_pago, ubicacion, enlace, confirmacion, estado, mensaje, creado, actualizado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entrega.id,
    entrega.pedido_id,
    entrega.producto_id ?? null,
    entrega.activo_id ?? null,
    entrega.cliente_nombre,
    entrega.cliente_email,
    entrega.tipo_pago,
    entrega.ubicacion,
    entrega.enlace ?? null,
    entrega.confirmacion,
    entrega.estado,
    entrega.mensaje ?? null,
    entrega.creado,
    entrega.actualizado,
  );

  return entrega;
}

export function listarEntregas(db: DatabaseSync, estado?: string): Entrega[] {
  const sql = estado ? 'SELECT * FROM entregas WHERE estado = ? ORDER BY creado DESC' : 'SELECT * FROM entregas ORDER BY creado DESC';
  const params = estado ? [estado] : [];
  const rows = db.prepare(sql).all(...params) as any[];
  return rows.map(mapRow);
}

export function obtenerEntrega(db: DatabaseSync, id: string): Entrega | null {
  const row = db.prepare('SELECT * FROM entregas WHERE id = ?').get(id) as any;
  return row ? mapRow(row) : null;
}

export function actualizarEntregaEstado(contexto: Contexto, id: string, nuevoEstado: Entrega['estado'], mensaje?: string, enlace?: string): Entrega | null {
  const { db } = contexto;
  const existente = obtenerEntrega(db, id);
  if (!existente) return null;
  const ahora = new Date().toISOString();
  db.prepare(`
    UPDATE entregas SET estado = ?, mensaje = COALESCE(?, mensaje), enlace = COALESCE(?, enlace), actualizado = ? WHERE id = ?
  `).run(nuevoEstado, mensaje ?? null, enlace ?? null, ahora, id);
  return obtenerEntrega(db, id);
}

function mapRow(row: any): Entrega {
  return {
    id: row.id,
    pedido_id: row.pedido_id,
    producto_id: row.producto_id,
    activo_id: row.activo_id,
    cliente_nombre: row.cliente_nombre,
    cliente_email: row.cliente_email,
    tipo_pago: row.tipo_pago,
    ubicacion: row.ubicacion,
    enlace: row.enlace,
    confirmacion: row.confirmacion,
    estado: row.estado,
    mensaje: row.mensaje,
    creado: row.creado,
    actualizado: row.actualizado,
  };
}
