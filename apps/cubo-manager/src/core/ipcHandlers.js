const { initializeDatabase, query, run, get, getDb } = require('./database');
const fs = require('fs').promises;
const path = require('path');
const bibliotecaBridge = require('./bibliotecaBridge');

// Funciones para generar folios y números únicos
const generarFolio = () => {
  const fecha = new Date();
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const numero = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `COT-${año}${mes}-${numero}`;
};

const generarNumeroTrabajo = () => {
  const fecha = new Date();
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const count = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TR-${año}${mes}-${count}`;
};

const generarFolioVenta = () => {
  const fecha = new Date();
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const numero = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `VTA-${año}${mes}-${numero}`;
};

function registerIpcHandlers(ipcMain, mainWindow) {
  initializeDatabase();

  // Base de datos general
  ipcMain.handle('database:query', async (_, sql, params) => {
    return query(sql, params);
  });

  ipcMain.handle('database:run', async (_, sql, params) => {
    return run(sql, params);
  });

  ipcMain.handle('database:get', async (_, sql, params) => {
    return get(sql, params);
  });

  // Sistema de archivos
  ipcMain.handle('fs:readFile', async (_, filePath) => {
    return fs.readFile(filePath, 'utf-8');
  });

  ipcMain.handle('fs:writeFile', async (_, filePath, data) => {
    await fs.writeFile(filePath, data);
    return { success: true };
  });

  ipcMain.handle('fs:readDir', async (_, dirPath) => {
    return fs.readdir(dirPath);
  });

  // Configuración
  ipcMain.handle('config:get', async (_, key) => {
    const result = await get('SELECT valor FROM configuraciones WHERE clave = ?', [key]);
    return result ? result.valor : null;
  });

  ipcMain.handle('config:set', async (_, key, value) => {
    return await run(
      'INSERT OR REPLACE INTO configuraciones (clave, valor, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [key, value]
    );
  });

  // ==================== INVENTARIO HANDLERS ====================
  
  ipcMain.handle('inventario:getAll', async () => {
    return await query('SELECT * FROM inventario ORDER BY nombre');
  });

  ipcMain.handle('inventario:getById', async (_, id) => {
    return await get('SELECT * FROM inventario WHERE id = ?', [id]);
  });

  ipcMain.handle('inventario:create', async (_, producto) => {
    const sql = `INSERT INTO inventario 
      (codigo, nombre, categoria, tipo, cantidad, unidad, stock_minimo, ubicacion, proveedor, precio_compra, precio_venta, notas) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const result = await run(sql, [
      producto.codigo, producto.nombre, producto.categoria, producto.tipo,
      producto.cantidad || 0, producto.unidad || 'unidad', producto.stock_minimo || 0,
      producto.ubicacion, producto.proveedor, producto.precio_compra || 0,
      producto.precio_venta || 0, producto.notas
    ]);
    return { id: result.lastID, ...producto };
  });

  ipcMain.handle('inventario:update', async (_, id, producto) => {
    const sql = `UPDATE inventario SET 
      codigo = ?, nombre = ?, categoria = ?, tipo = ?, cantidad = ?, unidad = ?,
      stock_minimo = ?, ubicacion = ?, proveedor = ?, precio_compra = ?, precio_venta = ?, 
      notas = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await run(sql, [
      producto.codigo, producto.nombre, producto.categoria, producto.tipo,
      producto.cantidad, producto.unidad, producto.stock_minimo,
      producto.ubicacion, producto.proveedor, producto.precio_compra,
      producto.precio_venta, producto.notas, id
    ]);
    return { id, ...producto };
  });

  ipcMain.handle('inventario:delete', async (_, id) => {
    const result = await run('DELETE FROM inventario WHERE id = ?', [id]);
    return { success: result.changes > 0 };
  });

  ipcMain.handle('inventario:registrarMovimiento', async (_, movimiento) => {
    try {
      await run('BEGIN TRANSACTION');

      await run(`UPDATE inventario SET cantidad = cantidad + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [movimiento.cantidad, movimiento.producto_id]);

      const sqlMov = `INSERT INTO movimientos_inventario 
        (producto_id, tipo, cantidad, motivo, referencia_id, referencia_tipo, usuario, notas) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      await run(sqlMov, [
        movimiento.producto_id, movimiento.tipo, movimiento.cantidad,
        movimiento.motivo, movimiento.referencia_id, movimiento.referencia_tipo,
        movimiento.usuario, movimiento.notas
      ]);

      await run('COMMIT');
      return { success: true };
    } catch (err) {
      await run('ROLLBACK').catch(() => {});
      throw err;
    }
  });

  ipcMain.handle('inventario:getMovimientos', async (_, productoId) => {
    return await query(`SELECT * FROM movimientos_inventario 
      WHERE producto_id = ? ORDER BY created_at DESC LIMIT 50`, [productoId]);
  });

  ipcMain.handle('inventario:getAlertasStock', async () => {
    return await query(`SELECT * FROM inventario 
      WHERE cantidad <= stock_minimo AND stock_minimo > 0 
      ORDER BY (cantidad / stock_minimo) ASC`);
  });

  // ==================== COTIZACIONES HANDLERS ====================

  ipcMain.handle('cotizaciones:getAll', async () => {
    return await query(`
      SELECT c.*, cl.nombre as cliente_nombre 
      FROM cotizaciones c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      ORDER BY c.fecha DESC
    `);
  });

  ipcMain.handle('cotizaciones:getById', async (_, id) => {
    const cotizacion = await get(`
      SELECT c.*, cl.nombre as cliente_nombre, cl.telefono, cl.email 
      FROM cotizaciones c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      WHERE c.id = ?
    `, [id]);

    if (cotizacion) {
      cotizacion.detalles = await query('SELECT * FROM cotizaciones_detalle WHERE cotizacion_id = ?', [id]);
    }
    return cotizacion;
  });

  ipcMain.handle('cotizaciones:create', async (_, cotizacion) => {
    const folio = generarFolio();
    try {
      await run('BEGIN TRANSACTION');

      const result = await run(`INSERT INTO cotizaciones 
        (folio, cliente_id, validez_dias, subtotal, iva, total, notas) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        folio, cotizacion.cliente_id, cotizacion.validez_dias || 15,
        cotizacion.subtotal || 0, cotizacion.iva || 0, cotizacion.total || 0,
        cotizacion.notas
      ]);
      const cotizacionId = result.lastID;

      if (cotizacion.detalles && cotizacion.detalles.length > 0) {
        const sqlDetalle = `INSERT INTO cotizaciones_detalle 
          (cotizacion_id, tipo, referencia_id, descripcion, cantidad, precio_unitario, descuento, total) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        for (const detalle of cotizacion.detalles) {
          await run(sqlDetalle, [
            cotizacionId, detalle.tipo, detalle.referencia_id,
            detalle.descripcion, detalle.cantidad, detalle.precio_unitario,
            detalle.descuento || 0, detalle.total
          ]);
        }
      }

      await run('COMMIT');
      return { id: cotizacionId, folio };
    } catch (err) {
      await run('ROLLBACK').catch(() => {});
      throw err;
    }
  });

  ipcMain.handle('cotizaciones:update', async (_, id, cotizacion) => {
    try {
      await run('BEGIN TRANSACTION');

      await run(`UPDATE cotizaciones SET 
        cliente_id = ?, validez_dias = ?, subtotal = ?, iva = ?, total = ?, 
        notas = ?, estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
        cotizacion.cliente_id, cotizacion.validez_dias, cotizacion.subtotal,
        cotizacion.iva, cotizacion.total, cotizacion.notas, cotizacion.estado, id
      ]);

      await run('DELETE FROM cotizaciones_detalle WHERE cotizacion_id = ?', [id]);

      if (cotizacion.detalles && cotizacion.detalles.length > 0) {
        const sqlDetalle = `INSERT INTO cotizaciones_detalle 
          (cotizacion_id, tipo, referencia_id, descripcion, cantidad, precio_unitario, descuento, total) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        for (const detalle of cotizacion.detalles) {
          await run(sqlDetalle, [
            id, detalle.tipo, detalle.referencia_id,
            detalle.descripcion, detalle.cantidad, detalle.precio_unitario,
            detalle.descuento || 0, detalle.total
          ]);
        }
      }

      await run('COMMIT');
      return { success: true };
    } catch (err) {
      await run('ROLLBACK').catch(() => {});
      throw err;
    }
  });

  ipcMain.handle('cotizaciones:changeStatus', async (_, id, estado) => {
    await run('UPDATE cotizaciones SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [estado, id]);
    return { success: true };
  });

  ipcMain.handle('cotizaciones:delete', async (_, id) => {
    const result = await run('DELETE FROM cotizaciones WHERE id = ?', [id]);
    return { success: result.changes > 0 };
  });

  ipcMain.handle('cotizaciones:getProductosDisponibles', async () => {
    return await query(`SELECT id, nombre, codigo, precio_venta, unidad FROM inventario 
      WHERE tipo IN ('producto_terminado', 'materia_prima') AND cantidad > 0
      ORDER BY nombre`);
  });

  // ==================== PRODUCCIÓN HANDLERS ====================

  ipcMain.handle('trabajos:getAll', async () => {
    return query(`
      SELECT t.*, c.nombre as cliente_nombre, c.telefono,
             cot.folio as cotizacion_folio
      FROM trabajos t
      LEFT JOIN clientes c ON t.cliente_id = c.id
      LEFT JOIN cotizaciones cot ON t.cotizacion_id = cot.id
      ORDER BY 
        CASE t.estado 
          WHEN 'en_cola' THEN 1
          WHEN 'en_proceso' THEN 2
          WHEN 'terminado' THEN 3
          WHEN 'entregado' THEN 4
          ELSE 5
        END,
        t.prioridad DESC,
        t.created_at ASC
    `);
  });

  ipcMain.handle('trabajos:getByEstado', async (_, estado) => {
    return query(`
      SELECT t.*, c.nombre as cliente_nombre 
      FROM trabajos t
      LEFT JOIN clientes c ON t.cliente_id = c.id
      WHERE t.estado = ?
      ORDER BY t.prioridad DESC, t.created_at ASC
    `, [estado]);
  });

  ipcMain.handle('trabajos:getById', async (_, id) => {
    const trabajo = await get(`
      SELECT t.*, c.nombre as cliente_nombre, c.telefono, c.email
      FROM trabajos t
      LEFT JOIN clientes c ON t.cliente_id = c.id
      WHERE t.id = ?
    `, [id]);

    if (trabajo) {
      trabajo.evidencias = await query('SELECT * FROM evidencias WHERE trabajo_id = ? ORDER BY created_at DESC', [id]);
      trabajo.actividades = await query('SELECT * FROM trabajo_actividades WHERE trabajo_id = ? ORDER BY created_at DESC', [id]);
    }
    return trabajo;
  });

  ipcMain.handle('trabajos:crearDesdeCotizacion', async (_, cotizacionId) => {
    const cotizacion = await get(`
      SELECT c.*, cl.nombre as cliente_nombre 
      FROM cotizaciones c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      WHERE c.id = ?
    `, [cotizacionId]);

    if (!cotizacion) throw new Error('Cotización no encontrada');

    const numeroTrabajo = generarNumeroTrabajo();
    const fechaEstimada = new Date();
    fechaEstimada.setDate(fechaEstimada.getDate() + (cotizacion.validez_dias || 15));

    try {
      await run('BEGIN TRANSACTION');
      const result = await run(`INSERT INTO trabajos 
        (numero_trabajo, cotizacion_id, cliente_id, titulo, descripcion, 
         estado, fecha_entrega_estimada, precio_total, notas) 
        VALUES (?, ?, ?, ?, ?, 'en_cola', ?, ?, ?)`, [
        numeroTrabajo, cotizacionId, cotizacion.cliente_id,
        `Trabajo desde cotización ${cotizacion.folio}`,
        cotizacion.notas, fechaEstimada.toISOString(),
        cotizacion.total, `Trabajo generado desde cotización ${cotizacion.folio}`
      ]);

      await run('UPDATE cotizaciones SET estado = "convertida", updated_at = CURRENT_TIMESTAMP WHERE id = ?', [cotizacionId]);
      await run('COMMIT');

      return { id: result.lastID, numero_trabajo: numeroTrabajo };
    } catch (err) {
      await run('ROLLBACK').catch(() => {});
      throw err;
    }
  });

  ipcMain.handle('trabajos:create', async (_, trabajo) => {
    const numeroTrabajo = generarNumeroTrabajo();
    const result = await run(`INSERT INTO trabajos 
      (numero_trabajo, cliente_id, titulo, descripcion, estado, prioridad,
       fecha_entrega_estimada, costo_materiales, costo_mano_obra, precio_total, notas) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      numeroTrabajo, trabajo.cliente_id, trabajo.titulo, trabajo.descripcion,
      trabajo.estado || 'en_cola', trabajo.prioridad || 1,
      trabajo.fecha_entrega_estimada, trabajo.costo_materiales || 0,
      trabajo.costo_mano_obra || 0, trabajo.precio_total || 0,
      trabajo.notas
    ]);
    return { id: result.lastID, numero_trabajo: numeroTrabajo };
  });

  ipcMain.handle('trabajos:update', async (_, id, trabajo) => {
    await run(`UPDATE trabajos SET 
      titulo = ?, descripcion = ?, estado = ?, prioridad = ?,
      fecha_inicio = ?, fecha_entrega_estimada = ?, fecha_entrega_real = ?,
      costo_materiales = ?, costo_mano_obra = ?, precio_total = ?,
      ganancia = ?, notas = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`, [
      trabajo.titulo, trabajo.descripcion, trabajo.estado, trabajo.prioridad,
      trabajo.fecha_inicio, trabajo.fecha_entrega_estimada, trabajo.fecha_entrega_real,
      trabajo.costo_materiales, trabajo.costo_mano_obra, trabajo.precio_total,
      trabajo.ganancia, trabajo.notas, id
    ]);
    return { success: true };
  });

  ipcMain.handle('trabajos:changeStatus', async (_, id, nuevoEstado) => {
    const updates = { estado: nuevoEstado, updated_at: new Date().toISOString() };
    const current = await get('SELECT fecha_inicio FROM trabajos WHERE id = ?', [id]);
    if (!current) throw new Error('Trabajo no encontrado');

    if (nuevoEstado === 'en_proceso' && !current.fecha_inicio) {
      updates.fecha_inicio = new Date().toISOString();
    }
    if (nuevoEstado === 'entregado') {
      updates.fecha_entrega_real = new Date().toISOString();
    }

    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), id];

    await run(`UPDATE trabajos SET ${setClause} WHERE id = ?`, values);
    await run(`INSERT INTO trabajo_actividades (trabajo_id, actividad, usuario) VALUES (?, ?, ?)`,
      [id, `Estado cambiado a ${nuevoEstado}`, 'sistema']);

    return { success: true };
  });

  ipcMain.handle('trabajos:addEvidencia', async (_, trabajoId, archivoPath, descripcion) => {
    const result = await run(`INSERT INTO evidencias (trabajo_id, archivo_ruta, descripcion) VALUES (?, ?, ?)`,
      [trabajoId, archivoPath, descripcion]);
    return { id: result.lastID };
  });

  ipcMain.handle('trabajos:deleteEvidencia', async (_, id) => {
    const result = await run('DELETE FROM evidencias WHERE id = ?', [id]);
    return { success: result.changes > 0 };
  });

  ipcMain.handle('trabajos:addActividad', async (_, trabajoId, actividad, duracion) => {
    await run(`INSERT INTO trabajo_actividades (trabajo_id, actividad, duracion_minutos, usuario) VALUES (?, ?, ?, ?)`,
      [trabajoId, actividad, duracion, 'usuario']);
    return { success: true };
  });

  ipcMain.handle('trabajos:delete', async (_, id) => {
    const result = await run('DELETE FROM trabajos WHERE id = ?', [id]);
    return { success: result.changes > 0 };
  });

  ipcMain.handle('trabajos:getCotizacionesAprobadas', async () => {
    return await query(`
      SELECT c.*, cl.nombre as cliente_nombre 
      FROM cotizaciones c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      WHERE c.estado = 'aprobada' AND c.id NOT IN (
        SELECT cotizacion_id FROM trabajos WHERE cotizacion_id IS NOT NULL
      )
      ORDER BY c.fecha DESC
    `);
  });

  // ==================== VENTAS HANDLERS ====================

  ipcMain.handle('ventas:getAll', async () => {
    return await query(`
      SELECT v.*, c.nombre as cliente_nombre, t.numero_trabajo
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN trabajos t ON v.trabajo_id = t.id
      ORDER BY v.fecha DESC
    `);
  });

  ipcMain.handle('ventas:getById', async (_, id) => {
    const venta = await get(`
      SELECT v.*, c.nombre as cliente_nombre, c.telefono, c.email
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE v.id = ?
    `, [id]);

    if (venta) {
      venta.detalles = await query('SELECT * FROM ventas_detalle WHERE venta_id = ?', [id]);
    }
    return venta;
  });

  ipcMain.handle('ventas:crearDesdeTrabajo', async (_, trabajoId, metodo_pago) => {
    const trabajo = await get('SELECT * FROM trabajos WHERE id = ?', [trabajoId]);
    if (!trabajo) throw new Error('Trabajo no encontrado');

    const folio = generarFolioVenta();

    try {
      await run('BEGIN TRANSACTION');

      const result = await run(`INSERT INTO ventas 
        (folio, trabajo_id, cliente_id, total, metodo_pago, notas) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [folio, trabajoId, trabajo.cliente_id, trabajo.precio_total, metodo_pago, `Venta del trabajo ${trabajo.numero_trabajo}`]);
      const ventaId = result.lastID;

      await run(`INSERT INTO finanzas_movimientos 
        (tipo, categoria, monto, referencia_id, referencia_tipo, descripcion, usuario) 
        VALUES ('ingreso', 'venta', ?, ?, 'venta', ?, 'sistema')`,
        [trabajo.precio_total, ventaId, `Venta ${folio}`]);

      await run('UPDATE trabajos SET estado = "entregado", updated_at = CURRENT_TIMESTAMP WHERE id = ?', [trabajoId]);

      await run('COMMIT');
      return { id: ventaId, folio };
    } catch (err) {
      await run('ROLLBACK').catch(() => {});
      throw err;
    }
  });

  ipcMain.handle('ventas:create', async (_, venta) => {
    const folio = generarFolioVenta();

    try {
      await run('BEGIN TRANSACTION');

      const result = await run(`INSERT INTO ventas 
        (folio, cliente_id, subtotal, iva, total, metodo_pago, notas) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [folio, venta.cliente_id, venta.subtotal, venta.iva, venta.total, venta.metodo_pago, venta.notas]);
      const ventaId = result.lastID;

      if (venta.detalles && venta.detalles.length > 0) {
        for (const detalle of venta.detalles) {
          await run(`INSERT INTO ventas_detalle 
            (venta_id, producto_id, descripcion, cantidad, precio_unitario, total) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [ventaId, detalle.producto_id, detalle.descripcion, detalle.cantidad, detalle.precio_unitario, detalle.total]);

          if (detalle.producto_id) {
            await run(`UPDATE inventario SET cantidad = cantidad - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [detalle.cantidad, detalle.producto_id]);

            await run(`INSERT INTO movimientos_inventario 
              (producto_id, tipo, cantidad, motivo, referencia_id, referencia_tipo, notas) 
              VALUES (?, 'salida', ?, 'venta', ?, 'venta', ?)`,
              [detalle.producto_id, -detalle.cantidad, ventaId, `Venta ${folio}`]);
          }
        }
      }

      await run(`INSERT INTO finanzas_movimientos 
        (tipo, categoria, monto, referencia_id, referencia_tipo, descripcion, usuario) 
        VALUES ('ingreso', 'venta', ?, ?, 'venta', ?, 'sistema')`,
        [venta.total, ventaId, `Venta ${folio}`]);

      await run('COMMIT');
      return { id: ventaId, folio };
    } catch (err) {
      await run('ROLLBACK').catch(() => {});
      throw err;
    }
  });

  ipcMain.handle('ventas:delete', async (_, id) => {
    const result = await run('DELETE FROM ventas WHERE id = ?', [id]);
    return { success: result.changes > 0 };
  });

  // ==================== FINANZAS HANDLERS ====================

  ipcMain.handle('finanzas:getAll', async () => {
    return await query('SELECT * FROM finanzas_movimientos ORDER BY fecha DESC LIMIT 500');
  });

  ipcMain.handle('finanzas:registrarEgreso', async (_, egreso) => {
    const result = await run(`INSERT INTO finanzas_movimientos 
      (tipo, categoria, monto, descripcion, usuario) 
      VALUES ('egreso', ?, ?, ?, ?)`,
      [egreso.categoria, egreso.monto, egreso.descripcion, egreso.usuario]);
    return { id: result.lastID };
  });

  ipcMain.handle('finanzas:getResumen', async (_, periodo) => {
    let fechaInicio = '';
    const hoy = new Date();

    switch(periodo) {
      case 'dia':
        fechaInicio = new Date(hoy.setHours(0,0,0,0)).toISOString();
        break;
      case 'semana':
        fechaInicio = new Date(hoy.setDate(hoy.getDate() - 7)).toISOString();
        break;
      case 'mes':
        fechaInicio = new Date(hoy.setMonth(hoy.getMonth() - 1)).toISOString();
        break;
      case 'año':
        fechaInicio = new Date(hoy.setFullYear(hoy.getFullYear() - 1)).toISOString();
        break;
      default:
        fechaInicio = '1970-01-01';
    }

    const ingresosRow = await get(`SELECT COALESCE(SUM(monto), 0) as total FROM finanzas_movimientos 
      WHERE tipo = 'ingreso' AND fecha >= ?`, [fechaInicio]);
    const egresosRow = await get(`SELECT COALESCE(SUM(monto), 0) as total FROM finanzas_movimientos 
      WHERE tipo = 'egreso' AND fecha >= ?`, [fechaInicio]);
    const ingresos = ingresosRow.total;
    const egresos = egresosRow.total;

    return {
      periodo,
      ingresos,
      egresos,
      balance: ingresos - egresos,
      fecha_inicio: fechaInicio
    };
  });

  ipcMain.handle('finanzas:getTrabajosTerminados', async () => {
    return await query(`
      SELECT t.*, c.nombre as cliente_nombre 
      FROM trabajos t
      LEFT JOIN clientes c ON t.cliente_id = c.id
      WHERE t.estado = 'terminado' AND t.id NOT IN (
        SELECT trabajo_id FROM ventas WHERE trabajo_id IS NOT NULL
      )
      ORDER BY t.fecha_entrega_estimada ASC
    `);
  });

  // ==================== CALENDARIO HANDLERS ====================

  ipcMain.handle('calendario:getEventos', async (_, fechaInicio, fechaFin) => {
    return await query(`
      SELECT * FROM calendario_eventos 
      WHERE fecha_inicio BETWEEN ? AND ?
      ORDER BY fecha_inicio ASC
    `, [fechaInicio, fechaFin]);
  });

  ipcMain.handle('calendario:getAll', async () => {
    return await query('SELECT * FROM calendario_eventos ORDER BY fecha_inicio DESC LIMIT 200');
  });

  ipcMain.handle('calendario:create', async (_, evento) => {
    const result = await run(`INSERT INTO calendario_eventos 
      (titulo, descripcion, tipo, referencia_id, fecha_inicio, fecha_fin, color, recordatorio_minutos) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
      evento.titulo, evento.descripcion, evento.tipo, evento.referencia_id,
      evento.fecha_inicio, evento.fecha_fin, evento.color, evento.recordatorio_minutos || 0
    ]);
    return { id: result.lastID };
  });

  ipcMain.handle('calendario:update', async (_, id, evento) => {
    await run(`UPDATE calendario_eventos SET 
      titulo = ?, descripcion = ?, fecha_inicio = ?, fecha_fin = ?, color = ?, 
      recordatorio_minutos = ?, completado = ?
      WHERE id = ?`, [
      evento.titulo, evento.descripcion, evento.fecha_inicio, evento.fecha_fin,
      evento.color, evento.recordatorio_minutos, evento.completado ? 1 : 0, id
    ]);
    return { success: true };
  });

  ipcMain.handle('calendario:delete', async (_, id) => {
    const result = await run('DELETE FROM calendario_eventos WHERE id = ?', [id]);
    return { success: result.changes > 0 };
  });

  ipcMain.handle('calendario:syncTrabajos', async () => {
    const trabajos = await query(`
      SELECT id, numero_trabajo, titulo, fecha_inicio, fecha_entrega_estimada, estado 
      FROM trabajos 
      WHERE fecha_inicio IS NOT NULL OR fecha_entrega_estimada IS NOT NULL
    `);

    for (const trabajo of trabajos) {
      if (trabajo.fecha_inicio) {
        const existe = await get(`SELECT id FROM calendario_eventos 
          WHERE tipo = 'trabajo' AND referencia_id = ? AND fecha_inicio = ?`,
          [trabajo.id, trabajo.fecha_inicio]);

        if (!existe) {
          await run(`INSERT INTO calendario_eventos 
            (titulo, descripcion, tipo, referencia_id, fecha_inicio, color) 
            VALUES (?, ?, 'trabajo', ?, ?, '#3b82f6')`,
            [`Inicio: ${trabajo.numero_trabajo}`, trabajo.titulo, trabajo.id, trabajo.fecha_inicio]);
        }
      }

      if (trabajo.fecha_entrega_estimada) {
        const existe = await get(`SELECT id FROM calendario_eventos 
          WHERE tipo = 'trabajo' AND referencia_id = ? AND fecha_inicio = ? AND titulo LIKE 'Entrega%'`,
          [trabajo.id, trabajo.fecha_entrega_estimada]);

        if (!existe) {
          await run(`INSERT INTO calendario_eventos 
            (titulo, descripcion, tipo, referencia_id, fecha_inicio, color, recordatorio_minutos) 
            VALUES (?, ?, 'trabajo', ?, ?, '#f59e0b', 1440)`,
            [`Entrega: ${trabajo.numero_trabajo}`, trabajo.titulo, trabajo.id, trabajo.fecha_entrega_estimada]);
        }
      }
    }
    return { success: true, sincronizados: trabajos.length };
  });

  ipcMain.handle('calendario:getEventosHoy', async () => {
    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);
    const hoyFin = new Date();
    hoyFin.setHours(23, 59, 59, 999);

    return await query(`
      SELECT * FROM calendario_eventos 
      WHERE fecha_inicio BETWEEN ? AND ?
      ORDER BY fecha_inicio ASC
    `, [hoyInicio.toISOString(), hoyFin.toISOString()]);
  });

  // ==================== MARKETING HANDLERS ====================

  ipcMain.handle('marketing:getConfig', async (_, plataforma) => {
    return await get('SELECT * FROM marketing_config WHERE plataforma = ?', [plataforma]);
  });

  ipcMain.handle('marketing:saveConfig', async (_, plataforma, configuracion, activo) => {
    await run(`INSERT INTO marketing_config (plataforma, configuracion, activo, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(plataforma) DO UPDATE SET
        configuracion = excluded.configuracion,
        activo = excluded.activo,
        updated_at = CURRENT_TIMESTAMP`,
      [plataforma, JSON.stringify(configuracion), activo ? 1 : 0]);
    return { success: true };
  });

  // NOTA: no conectado a la API real de WordPress todavía. Deja registro
  // explícito de que es simulado para no generar falsa confianza.
  ipcMain.handle('marketing:exportToWordPress', async (_, productoId) => {
    const producto = await get('SELECT * FROM inventario WHERE id = ?', [productoId]);
    if (!producto) throw new Error('Producto no encontrado');

    await run(`INSERT INTO exportaciones (tipo, referencia_id, destino, estado, resultado) 
      VALUES ('wordpress', ?, 'wordpress', 'simulado', ?)`,
      [productoId, `(Simulado, integración pendiente) Producto "${producto.nombre}" listo para exportar`]);

    return { success: true, simulado: true, message: `(Simulado) Producto "${producto.nombre}" preparado para exportar - la conexión real con WordPress aún no está activa` };
  });

  ipcMain.handle('marketing:exportCatalogo', async (_, categoria = null) => {
    let sql = 'SELECT * FROM inventario WHERE tipo = "producto_terminado" AND cantidad > 0';
    const params = [];
    if (categoria && categoria !== 'todos') {
      sql += ' AND categoria = ?';
      params.push(categoria);
    }
    const productos = await query(sql, params);

    await run(`INSERT INTO exportaciones (tipo, destino, estado, resultado) 
      VALUES ('catalogo', 'pdf', 'simulado', ?)`,
      [`(Simulado) Catálogo con ${productos.length} productos`]);

    return { success: true, simulado: true, productos: productos, count: productos.length };
  });

  // NOTA: no conectado a la API real de WhatsApp Business todavía (simulado).
  ipcMain.handle('marketing:sendWhatsApp', async (_, cotizacionId, numeroTelefono) => {
    const cotizacion = await get(`
      SELECT c.*, cl.nombre as cliente_nombre, cl.telefono 
      FROM cotizaciones c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      WHERE c.id = ?
    `, [cotizacionId]);

    if (!cotizacion) throw new Error('Cotización no encontrada');

    const mensaje = `📋 *COTIZACIÓN ${cotizacion.folio}*\n\nCliente: ${cotizacion.cliente_nombre}\nTotal: $${cotizacion.total}\nVálida hasta: ${new Date(Date.now() + cotizacion.validez_dias * 86400000).toLocaleDateString()}`;

    await run(`INSERT INTO exportaciones (tipo, referencia_id, destino, estado, resultado) 
      VALUES ('whatsapp', ?, ?, 'simulado', ?)`,
      [cotizacionId, numeroTelefono || cotizacion.telefono, mensaje]);

    return { success: true, simulado: true, message: `(Simulado) Cotización lista para enviar a ${cotizacion.cliente_nombre} - la conexión real con WhatsApp aún no está activa` };
  });

  // NOTA: no conectado a la API real de Gumroad todavía (simulado).
  ipcMain.handle('marketing:syncGumroad', async () => {
    await run(`INSERT INTO exportaciones (tipo, destino, estado, resultado) 
      VALUES ('gumroad', 'gumroad', 'simulado', '(Simulado) Sincronización de prueba')`);
    return { success: true, simulado: true, message: '(Simulado) La conexión real con Gumroad aún no está activa' };
  });

  ipcMain.handle('marketing:getExportaciones', async (_, limit = 50) => {
    return await query('SELECT * FROM exportaciones ORDER BY created_at DESC LIMIT ?', [limit]);
  });

  // ==================== BIBLIOTECA LASER HANDLERS ====================

  ipcMain.handle('biblioteca:getStatus', async () => {
    const bibPath = await bibliotecaBridge.findBiblioteca();
    const isConnected = await bibliotecaBridge.checkConnection();
    return { instalada: !!bibPath, conectada: isConnected, ruta: bibPath };
  });

  ipcMain.handle('biblioteca:start', async () => {
    return await bibliotecaBridge.startBiblioteca();
  });

  ipcMain.handle('biblioteca:getDisenos', async (_, categoria) => {
    return await bibliotecaBridge.getDisenos(categoria);
  });

  ipcMain.handle('biblioteca:getDisenoById', async (_, id) => {
    return await bibliotecaBridge.getDisenoById(id);
  });

  ipcMain.handle('biblioteca:copiarDiseno', async (_, disenoId, trabajoId) => {
    return await bibliotecaBridge.copiarDisenoParaProduccion(disenoId, trabajoId);
  });

  ipcMain.handle('biblioteca:syncProductos', async () => {
    return await bibliotecaBridge.syncProductosToBiblioteca();
  });

  // Ventana
  ipcMain.on('window:close', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.on('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  // ==================== COSTEO (estilo LaserCalc Pro) ====================

  ipcMain.handle('costeo:getConfigMaquina', async () => {
    const cfg = await get('SELECT * FROM configuracion_maquina WHERE id = 1');
    return cfg || null;
  });

  ipcMain.handle('costeo:saveConfigMaquina', async (_, cfg) => {
    await run(`INSERT INTO configuracion_maquina
        (id, costo_adquisicion, amortizacion_meses, costo_laser, vida_util_laser_horas,
         costo_opticas, vida_util_opticas_horas, costo_filtros, vida_util_filtros_horas,
         tarifa_supervision_hora, tarifa_mano_obra_hora, watts_maquina, costo_kwh, moneda, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        costo_adquisicion=excluded.costo_adquisicion,
        amortizacion_meses=excluded.amortizacion_meses,
        costo_laser=excluded.costo_laser,
        vida_util_laser_horas=excluded.vida_util_laser_horas,
        costo_opticas=excluded.costo_opticas,
        vida_util_opticas_horas=excluded.vida_util_opticas_horas,
        costo_filtros=excluded.costo_filtros,
        vida_util_filtros_horas=excluded.vida_util_filtros_horas,
        tarifa_supervision_hora=excluded.tarifa_supervision_hora,
        tarifa_mano_obra_hora=excluded.tarifa_mano_obra_hora,
        watts_maquina=excluded.watts_maquina,
        costo_kwh=excluded.costo_kwh,
        moneda=excluded.moneda,
        updated_at=CURRENT_TIMESTAMP`,
      [cfg.costo_adquisicion, cfg.amortizacion_meses, cfg.costo_laser, cfg.vida_util_laser_horas,
       cfg.costo_opticas, cfg.vida_util_opticas_horas, cfg.costo_filtros, cfg.vida_util_filtros_horas,
       cfg.tarifa_supervision_hora, cfg.tarifa_mano_obra_hora, cfg.watts_maquina, cfg.costo_kwh, cfg.moneda || '$']);
    return { success: true };
  });

  ipcMain.handle('costeo:getMateriales', async () => {
    return await query('SELECT * FROM catalogo_materiales WHERE activo = 1 ORDER BY nombre');
  });

  ipcMain.handle('costeo:saveMaterial', async (_, m) => {
    if (m.id) {
      await run(`UPDATE catalogo_materiales SET nombre=?, tipo=?, precio_plancha=?, ancho_cm=?, alto_cm=? WHERE id=?`,
        [m.nombre, m.tipo, m.precio_plancha, m.ancho_cm, m.alto_cm, m.id]);
      return { success: true, id: m.id };
    }
    const result = await run(`INSERT INTO catalogo_materiales (nombre, tipo, precio_plancha, ancho_cm, alto_cm) VALUES (?, ?, ?, ?, ?)`,
      [m.nombre, m.tipo, m.precio_plancha, m.ancho_cm, m.alto_cm]);
    return { success: true, id: result.lastID };
  });

  ipcMain.handle('costeo:deleteMaterial', async (_, id) => {
    await run('UPDATE catalogo_materiales SET activo = 0 WHERE id = ?', [id]);
    return { success: true };
  });

  ipcMain.handle('costeo:getInsumos', async () => {
    return await query('SELECT * FROM catalogo_insumos WHERE activo = 1 ORDER BY nombre');
  });

  ipcMain.handle('costeo:saveInsumo', async (_, s) => {
    if (s.id) {
      await run(`UPDATE catalogo_insumos SET nombre=?, costo_unitario=?, unidad=? WHERE id=?`,
        [s.nombre, s.costo_unitario, s.unidad, s.id]);
      return { success: true, id: s.id };
    }
    const result = await run(`INSERT INTO catalogo_insumos (nombre, costo_unitario, unidad) VALUES (?, ?, ?)`,
      [s.nombre, s.costo_unitario, s.unidad || 'pieza']);
    return { success: true, id: result.lastID };
  });

  ipcMain.handle('costeo:deleteInsumo', async (_, id) => {
    await run('UPDATE catalogo_insumos SET activo = 0 WHERE id = ?', [id]);
    return { success: true };
  });

  // Registrar consumo de material/insumo para un trabajo o cotización específico
  ipcMain.handle('costeo:addConsumo', async (_, item) => {
    let costoCalculado = 0;
    if (item.material_id && item.area_cm2) {
      const mat = await get('SELECT * FROM catalogo_materiales WHERE id = ?', [item.material_id]);
      if (mat) {
        const costoPorCm2 = mat.precio_plancha / (mat.ancho_cm * mat.alto_cm);
        costoCalculado = costoPorCm2 * item.area_cm2;
      }
    } else if (item.insumo_id) {
      const ins = await get('SELECT * FROM catalogo_insumos WHERE id = ?', [item.insumo_id]);
      if (ins) costoCalculado = ins.costo_unitario * (item.cantidad || 1);
    }
    const result = await run(`INSERT INTO trabajo_materiales
        (referencia_tipo, referencia_id, material_id, insumo_id, area_cm2, cantidad, costo_calculado)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [item.referencia_tipo, item.referencia_id, item.material_id || null, item.insumo_id || null,
       item.area_cm2 || null, item.cantidad || 1, costoCalculado]);
    return { success: true, id: result.lastID, costo_calculado: costoCalculado };
  });

  ipcMain.handle('costeo:getConsumo', async (_, referenciaTipo, referenciaId) => {
    return await query('SELECT * FROM trabajo_materiales WHERE referencia_tipo = ? AND referencia_id = ?',
      [referenciaTipo, referenciaId]);
  });

  ipcMain.handle('costeo:saveTiempos', async (_, referenciaTipo, referenciaId, minutosLaser, minutosManoObra) => {
    await run(`INSERT INTO trabajo_tiempos (referencia_tipo, referencia_id, minutos_laser, minutos_mano_obra)
      VALUES (?, ?, ?, ?)`, [referenciaTipo, referenciaId, minutosLaser || 0, minutosManoObra || 0]);
    return { success: true };
  });

  // Cálculo de costo completo: material + desgaste de máquina + electricidad + mano de obra
  // (misma lógica que LaserCalc Pro, adaptada a nuestro esquema)
  ipcMain.handle('costeo:calcularCosto', async (_, referenciaTipo, referenciaId) => {
    const cfg = (await get('SELECT * FROM configuracion_maquina WHERE id = 1')) || {};
    const materiales = await query('SELECT * FROM trabajo_materiales WHERE referencia_tipo = ? AND referencia_id = ?',
      [referenciaTipo, referenciaId]);
    const tiempos = await query('SELECT * FROM trabajo_tiempos WHERE referencia_tipo = ? AND referencia_id = ?',
      [referenciaTipo, referenciaId]);

    const costoMaterial = materiales.reduce((sum, m) => sum + (m.costo_calculado || 0), 0);
    const minutosLaser = tiempos.reduce((sum, t) => sum + (t.minutos_laser || 0), 0);
    const minutosManoObra = tiempos.reduce((sum, t) => sum + (t.minutos_mano_obra || 0), 0);

    // Costo técnico por minuto: amortización de la máquina + desgaste de componentes
    const amortizacionPorMinuto = cfg.amortizacion_meses
      ? (cfg.costo_adquisicion || 0) / (cfg.amortizacion_meses * 30 * 24 * 60)
      : 0;
    const desgasteLaserPorMinuto = cfg.vida_util_laser_horas
      ? (cfg.costo_laser || 0) / (cfg.vida_util_laser_horas * 60) : 0;
    const desgasteOpticasPorMinuto = cfg.vida_util_opticas_horas
      ? (cfg.costo_opticas || 0) / (cfg.vida_util_opticas_horas * 60) : 0;
    const desgasteFiltrosPorMinuto = cfg.vida_util_filtros_horas
      ? (cfg.costo_filtros || 0) / (cfg.vida_util_filtros_horas * 60) : 0;
    const costoTecnicoPorMinuto = amortizacionPorMinuto + desgasteLaserPorMinuto
      + desgasteOpticasPorMinuto + desgasteFiltrosPorMinuto;

    const costoDesgaste = costoTecnicoPorMinuto * minutosLaser;
    const costoElectricidad = ((cfg.watts_maquina || 0) / 1000) * (cfg.costo_kwh || 0) * (minutosLaser / 60);
    const costoSupervision = (cfg.tarifa_supervision_hora || 0) * (minutosLaser / 60);
    const costoManoObra = (cfg.tarifa_mano_obra_hora || 0) * (minutosManoObra / 60);

    const costoTotal = costoMaterial + costoDesgaste + costoElectricidad + costoSupervision + costoManoObra;

    return {
      costo_material: Math.round(costoMaterial * 100) / 100,
      costo_desgaste_maquina: Math.round(costoDesgaste * 100) / 100,
      costo_electricidad: Math.round(costoElectricidad * 100) / 100,
      costo_supervision: Math.round(costoSupervision * 100) / 100,
      costo_mano_obra: Math.round(costoManoObra * 100) / 100,
      costo_total: Math.round(costoTotal * 100) / 100,
      moneda: cfg.moneda || '$',
    };
  });
}

module.exports = {
  registerIpcHandlers,
};
