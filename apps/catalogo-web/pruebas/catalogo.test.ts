import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { cargarConfiguracion } from '../src/config.ts';
import { crearContexto } from '../src/contexto.ts';
import { crearProducto, listarProductos, obtenerProducto } from '../src/productos/modelo.ts';
import { crearEntrega, listarEntregas, obtenerEntrega, actualizarEntregaEstado } from '../src/entregas/modelo.ts';

function contextoTemporal() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catalogo-test-'));
  const config = cargarConfiguracion({ cwd: tmp, env: { CATALOGO_RUTA: tmp } as any });
  const contexto = crearContexto(config);
  return { contexto, tmp, config };
}

test('E5: publicar producto de Biblioteca al catalogo publico', () => {
  const { contexto, tmp } = contextoTemporal();
  const prod = crearProducto(contexto, {
    nombre: 'Caja MDF 100x60',
    descripcion: 'Caja con tapa',
    categoria: 'cajas',
    tipo_venta: 'fisico',
    precio: 150,
    activo_id: 'act_000001',
  });
  assert.ok(prod.id.startsWith('prod_'));
  assert.equal(prod.activo_id, 'act_000001');
  assert.equal(prod.estado, 'publicado');

  const lista = listarProductos(contexto.db, 'publicado');
  assert.equal(lista.length, 1);
  assert.equal(lista[0].id, prod.id);

  const obtenido = obtenerProducto(contexto.db, prod.id);
  assert.ok(obtenido);
  assert.equal(obtenido?.nombre, 'Caja MDF 100x60');

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('E6: venta digital nube automatica -> enviada inmediata', () => {
  const { contexto, tmp } = contextoTemporal();
  const prod = crearProducto(contexto, {
    nombre: 'Archivo digital SVG',
    tipo_venta: 'digital',
    precio: 50,
    activo_id: 'act_000002',
  });

  const entrega = crearEntrega(contexto, {
    producto_id: prod.id,
    activo_id: prod.activo_id,
    cliente_nombre: 'Juan Perez',
    cliente_email: 'juan@example.com',
    tipo_pago: 'paypal',
    ubicacion: 'nube',
    confirmacion: 'automatica',
  });

  assert.equal(entrega.estado, 'enviada');
  assert.ok(entrega.enlace?.includes('drive.example.com'));
  assert.ok(entrega.mensaje?.includes('nube'));

  const lista = listarEntregas(contexto.db);
  assert.equal(lista.length, 1);

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('E6: venta pc -> pendiente con aviso PC apagada', () => {
  const { contexto, tmp } = contextoTemporal();
  const entrega = crearEntrega(contexto, {
    activo_id: 'act_000003',
    cliente_nombre: 'Maria',
    cliente_email: 'maria@example.com',
    tipo_pago: 'cuenta',
    ubicacion: 'pc',
    confirmacion: 'manual',
  });

  assert.equal(entrega.estado, 'pendiente');
  assert.equal(entrega.ubicacion, 'pc');
  assert.ok(entrega.mensaje?.toLowerCase().includes('pc'));

  // Simular aprobacion manual y envio (sin Biblioteca, fallaria en servidor real, pero aqui actualizamos directo)
  const aprobada = actualizarEntregaEstado(contexto, entrega.id, 'aprobada', 'Aprobada manual');
  assert.equal(aprobada?.estado, 'aprobada');

  const enviada = actualizarEntregaEstado(contexto, entrega.id, 'enviada', 'Enviada tras encender PC', 'https://example.com/archivo.zip');
  assert.equal(enviada?.estado, 'enviada');
  assert.ok(enviada?.enlace);

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('E6: cola entregas filtra por estado', () => {
  const { contexto, tmp } = contextoTemporal();
  crearEntrega(contexto, {
    cliente_nombre: 'A',
    cliente_email: 'a@example.com',
    tipo_pago: 'paypal',
    ubicacion: 'nube',
    confirmacion: 'automatica',
  });
  crearEntrega(contexto, {
    cliente_nombre: 'B',
    cliente_email: 'b@example.com',
    tipo_pago: 'cuenta',
    ubicacion: 'pc',
    confirmacion: 'manual',
  });

  const todas = listarEntregas(contexto.db);
  assert.equal(todas.length, 2);
  const enviadas = listarEntregas(contexto.db, 'enviada');
  assert.equal(enviadas.length, 1);
  const pendientes = listarEntregas(contexto.db, 'pendiente');
  assert.equal(pendientes.length, 1);

  fs.rmSync(tmp, { recursive: true, force: true });
});
