const { contextBridge, ipcRenderer } = require('electron');

// Exponer API segura al frontend
contextBridge.exposeInMainWorld('electron', {
  // Clientes
  clientes: {
    getAll: () => ipcRenderer.invoke('clientes:getAll'),
    create: (cliente) => ipcRenderer.invoke('clientes:create', cliente),
    update: (id, cliente) => ipcRenderer.invoke('clientes:update', id, cliente),
    delete: (id) => ipcRenderer.invoke('clientes:delete', id)
  },
  // Configuración
  config: {
    get: (key) => ipcRenderer.invoke('config:get', key),
    set: (key, value) => ipcRenderer.invoke('config:set', key, value),
    getFondoModulo: (modulo) => ipcRenderer.invoke('config:getFondoModulo', modulo),
    setFondo: (modulo, tipo, valor) => ipcRenderer.invoke('config:setFondo', modulo, tipo, valor)
  },
  // Inventario
  inventario: {
    getAll: () => ipcRenderer.invoke('inventario:getAll'),
    getById: (id) => ipcRenderer.invoke('inventario:getById', id),
    create: (producto) => ipcRenderer.invoke('inventario:create', producto),
    update: (id, producto) => ipcRenderer.invoke('inventario:update', id, producto),
    delete: (id) => ipcRenderer.invoke('inventario:delete', id),
    registrarMovimiento: (movimiento) => ipcRenderer.invoke('inventario:registrarMovimiento', movimiento),
    getMovimientos: (productoId) => ipcRenderer.invoke('inventario:getMovimientos', productoId),
    getAlertasStock: () => ipcRenderer.invoke('inventario:getAlertasStock'),
    getProductosTerminados: (opciones) => ipcRenderer.invoke('inventario:getProductosTerminados', opciones)
  },
  // Cotizaciones
  cotizaciones: {
    getAll: () => ipcRenderer.invoke('cotizaciones:getAll'),
    getById: (id) => ipcRenderer.invoke('cotizaciones:getById', id),
    create: (cotizacion) => ipcRenderer.invoke('cotizaciones:create', cotizacion),
    update: (id, cotizacion) => ipcRenderer.invoke('cotizaciones:update', id, cotizacion),
    changeStatus: (id, estado) => ipcRenderer.invoke('cotizaciones:changeStatus', id, estado),
    delete: (id) => ipcRenderer.invoke('cotizaciones:delete', id),
    getProductosDisponibles: () => ipcRenderer.invoke('cotizaciones:getProductosDisponibles')
  },
  // Producción
  trabajos: {
    getAll: () => ipcRenderer.invoke('trabajos:getAll'),
    getByEstado: (estado) => ipcRenderer.invoke('trabajos:getByEstado', estado),
    getById: (id) => ipcRenderer.invoke('trabajos:getById', id),
    crearDesdeCotizacion: (cotizacionId) => ipcRenderer.invoke('trabajos:crearDesdeCotizacion', cotizacionId),
    create: (trabajo) => ipcRenderer.invoke('trabajos:create', trabajo),
    update: (id, trabajo) => ipcRenderer.invoke('trabajos:update', id, trabajo),
    changeStatus: (id, estado) => ipcRenderer.invoke('trabajos:changeStatus', id, estado),
    addEvidencia: (trabajoId, archivoPath, descripcion) => ipcRenderer.invoke('trabajos:addEvidencia', trabajoId, archivoPath, descripcion),
    deleteEvidencia: (id) => ipcRenderer.invoke('trabajos:deleteEvidencia', id),
    addActividad: (trabajoId, actividad, duracion) => ipcRenderer.invoke('trabajos:addActividad', trabajoId, actividad, duracion),
    delete: (id) => ipcRenderer.invoke('trabajos:delete', id),
    getCotizacionesAprobadas: () => ipcRenderer.invoke('trabajos:getCotizacionesAprobadas')
  },
  // Ventas
  ventas: {
    getAll: () => ipcRenderer.invoke('ventas:getAll'),
    getById: (id) => ipcRenderer.invoke('ventas:getById', id),
    crearDesdeTrabajo: (trabajoId, metodo_pago) => ipcRenderer.invoke('ventas:crearDesdeTrabajo', trabajoId, metodo_pago),
    create: (venta) => ipcRenderer.invoke('ventas:create', venta),
    delete: (id) => ipcRenderer.invoke('ventas:delete', id)
  },
  // Finanzas
  finanzas: {
    getAll: () => ipcRenderer.invoke('finanzas:getAll'),
    registrarEgreso: (egreso) => ipcRenderer.invoke('finanzas:registrarEgreso', egreso),
    getResumen: (periodo) => ipcRenderer.invoke('finanzas:getResumen', periodo),
    getTrabajosTerminados: () => ipcRenderer.invoke('finanzas:getTrabajosTerminados')
  },
  // Calendario
  calendario: {
    getEventos: (fechaInicio, fechaFin) => ipcRenderer.invoke('calendario:getEventos', fechaInicio, fechaFin),
    getAll: () => ipcRenderer.invoke('calendario:getAll'),
    create: (evento) => ipcRenderer.invoke('calendario:create', evento),
    update: (id, evento) => ipcRenderer.invoke('calendario:update', id, evento),
    delete: (id) => ipcRenderer.invoke('calendario:delete', id),
    syncTrabajos: () => ipcRenderer.invoke('calendario:syncTrabajos'),
    getEventosHoy: () => ipcRenderer.invoke('calendario:getEventosHoy')
  },
  // Marketing
  marketing: {
    getConfig: (plataforma) => ipcRenderer.invoke('marketing:getConfig', plataforma),
    saveConfig: (plataforma, configuracion, activo) => ipcRenderer.invoke('marketing:saveConfig', plataforma, configuracion, activo),
    exportToWordPress: (productoId) => ipcRenderer.invoke('marketing:exportToWordPress', productoId),
    exportCatalogo: (categoria) => ipcRenderer.invoke('marketing:exportCatalogo', categoria),
    sendWhatsApp: (cotizacionId, numeroTelefono) => ipcRenderer.invoke('marketing:sendWhatsApp', cotizacionId, numeroTelefono),
    syncGumroad: () => ipcRenderer.invoke('marketing:syncGumroad'),
    getExportaciones: (limit) => ipcRenderer.invoke('marketing:getExportaciones', limit)
  },
  // Biblioteca (fase E1, servicio real en 127.0.0.1:7101 - ver ARQUITECTURA.md 3.2)
  biblioteca: {
    getEstado: () => ipcRenderer.invoke('biblioteca:getEstado'),
    buscar: (filtros) => ipcRenderer.invoke('biblioteca:buscar', filtros),
    getFicha: (id) => ipcRenderer.invoke('biblioteca:getFicha', id),
    getImagenBase64: (id, indice) => ipcRenderer.invoke('biblioteca:getImagenBase64', id, indice),
    descargarParaProduccion: (id, trabajoId, rutaRelativa) =>
      ipcRenderer.invoke('biblioteca:descargarParaProduccion', id, trabajoId, rutaRelativa)
  },
  // Autenticacion local (contrasena con hash, ver src/core/auth.js)
  auth: {
    tieneContrasena: () => ipcRenderer.invoke('auth:tieneContrasena'),
    establecerContrasena: (password) => ipcRenderer.invoke('auth:establecerContrasena', password),
    verificarCredenciales: (email, password) => ipcRenderer.invoke('auth:verificarCredenciales', email, password),
    cambiarContrasena: (actual, nueva) => ipcRenderer.invoke('auth:cambiarContrasena', actual, nueva)
  },
  // Ventana
  window: {
    close: () => ipcRenderer.send('window:close'),
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize')
  }
});
