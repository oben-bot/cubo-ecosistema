const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let db = null;

function getDatabase() {
  if (db) return db;
  
  const dbPath = path.join(__dirname, '../../data/cubo_manager.db');
  const dbDir = path.dirname(dbPath);
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  db = new sqlite3.Database(dbPath);
  
  // Inicializar tablas
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS configuraciones (
      clave TEXT PRIMARY KEY,
      valor TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      telefono TEXT,
      email TEXT,
      direccion TEXT,
      notas TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS inventario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE,
      nombre TEXT NOT NULL,
      categoria TEXT DEFAULT 'material',
      tipo TEXT DEFAULT 'materia_prima',
      cantidad REAL DEFAULT 0,
      unidad TEXT DEFAULT 'unidad',
      stock_minimo REAL DEFAULT 0,
      ubicacion TEXT,
      proveedor TEXT,
      precio_compra REAL DEFAULT 0,
      precio_venta REAL DEFAULT 0,
      notas TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS cotizaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT UNIQUE,
      cliente_id INTEGER,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      validez_dias INTEGER DEFAULT 15,
      subtotal REAL DEFAULT 0,
      iva REAL DEFAULT 0,
      total REAL DEFAULT 0,
      estado TEXT DEFAULT 'pendiente',
      notas TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS cotizaciones_detalle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cotizacion_id INTEGER NOT NULL,
      tipo TEXT DEFAULT 'producto',
      referencia_id INTEGER,
      descripcion TEXT NOT NULL,
      cantidad REAL DEFAULT 1,
      precio_unitario REAL DEFAULT 0,
      descuento REAL DEFAULT 0,
      total REAL DEFAULT 0
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS trabajos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_trabajo TEXT UNIQUE,
      cotizacion_id INTEGER,
      cliente_id INTEGER NOT NULL,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      estado TEXT DEFAULT 'en_cola',
      prioridad INTEGER DEFAULT 1,
      fecha_inicio DATETIME,
      fecha_entrega_estimada DATETIME,
      fecha_entrega_real DATETIME,
      costo_materiales REAL DEFAULT 0,
      costo_mano_obra REAL DEFAULT 0,
      precio_total REAL DEFAULT 0,
      ganancia REAL DEFAULT 0,
      notas TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS evidencias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trabajo_id INTEGER NOT NULL,
      tipo TEXT DEFAULT 'imagen',
      archivo_ruta TEXT NOT NULL,
      descripcion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS trabajo_actividades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trabajo_id INTEGER NOT NULL,
      actividad TEXT NOT NULL,
      usuario TEXT,
      duracion_minutos INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS movimientos_inventario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      cantidad REAL NOT NULL,
      motivo TEXT,
      referencia_id INTEGER,
      referencia_tipo TEXT,
      usuario TEXT,
      notas TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT UNIQUE,
      trabajo_id INTEGER,
      cliente_id INTEGER NOT NULL,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      subtotal REAL DEFAULT 0,
      iva REAL DEFAULT 0,
      total REAL DEFAULT 0,
      metodo_pago TEXT DEFAULT 'efectivo',
      notas TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS ventas_detalle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL,
      producto_id INTEGER,
      descripcion TEXT NOT NULL,
      cantidad REAL DEFAULT 1,
      precio_unitario REAL DEFAULT 0,
      total REAL DEFAULT 0
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS finanzas_movimientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      categoria TEXT,
      monto REAL NOT NULL,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      referencia_id INTEGER,
      referencia_tipo TEXT,
      descripcion TEXT,
      usuario TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS calendario_eventos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      tipo TEXT NOT NULL,
      referencia_id INTEGER,
      fecha_inicio DATETIME NOT NULL,
      fecha_fin DATETIME,
      color TEXT,
      recordatorio_minutos INTEGER DEFAULT 0,
      completado BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ==================== COSTEO (estilo LaserCalc Pro) ====================
    // Config de máquina: una sola fila, se actualiza (no se inserta de nuevo)
    db.run(`CREATE TABLE IF NOT EXISTS configuracion_maquina (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      costo_adquisicion REAL DEFAULT 0,
      amortizacion_meses INTEGER DEFAULT 24,
      costo_laser REAL DEFAULT 0,
      vida_util_laser_horas REAL DEFAULT 0,
      costo_opticas REAL DEFAULT 0,
      vida_util_opticas_horas REAL DEFAULT 0,
      costo_filtros REAL DEFAULT 0,
      vida_util_filtros_horas REAL DEFAULT 0,
      tarifa_supervision_hora REAL DEFAULT 0,
      tarifa_mano_obra_hora REAL DEFAULT 0,
      watts_maquina REAL DEFAULT 0,
      costo_kwh REAL DEFAULT 0,
      moneda TEXT DEFAULT '$',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Catálogo de láminas/planchas de material
    db.run(`CREATE TABLE IF NOT EXISTS catalogo_materiales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      tipo TEXT,
      precio_plancha REAL NOT NULL,
      ancho_cm REAL NOT NULL,
      alto_cm REAL NOT NULL,
      activo BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Catálogo de insumos/extras (unitarios)
    db.run(`CREATE TABLE IF NOT EXISTS catalogo_insumos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      costo_unitario REAL NOT NULL,
      unidad TEXT DEFAULT 'pieza',
      activo BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Consumo de materiales/insumos por trabajo o cotización (el "BOM" real)
    db.run(`CREATE TABLE IF NOT EXISTS trabajo_materiales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referencia_tipo TEXT NOT NULL,
      referencia_id INTEGER NOT NULL,
      material_id INTEGER REFERENCES catalogo_materiales(id),
      insumo_id INTEGER REFERENCES catalogo_insumos(id),
      area_cm2 REAL,
      cantidad REAL DEFAULT 1,
      costo_calculado REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tiempos de máquina y mano de obra por trabajo o cotización
    db.run(`CREATE TABLE IF NOT EXISTS trabajo_tiempos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referencia_tipo TEXT NOT NULL,
      referencia_id INTEGER NOT NULL,
      minutos_laser REAL DEFAULT 0,
      minutos_mano_obra REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ==================== MARKETING (integraciones externas) ====================
    // NOTA: las integraciones reales (WordPress, WhatsApp, Gumroad) aún no están
    // conectadas a ninguna API externa - ver ipcHandlers.js, quedan marcadas
    // explícitamente como "simulado" hasta que se conecten de verdad.
    db.run(`CREATE TABLE IF NOT EXISTS marketing_config (
      plataforma TEXT PRIMARY KEY,
      configuracion TEXT,
      activo BOOLEAN DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS exportaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      referencia_id INTEGER,
      destino TEXT,
      estado TEXT DEFAULT 'pendiente',
      resultado TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
  
  return db;
}

// Funciones helper para promesas
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const dbInstance = getDatabase();
    dbInstance.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const dbInstance = getDatabase();
    dbInstance.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const dbInstance = getDatabase();
    dbInstance.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  getDatabase,
  runQuery,
  getQuery,
  allQuery,
  // Alias de compatibilidad: ipcHandlers.js fue escrito contra una versión
  // anterior de este módulo que usaba estos nombres. Se mantienen ambos
  // para no tener que reescribir todos los handlers.
  getDb: getDatabase,
  run: runQuery,
  get: getQuery,
  query: allQuery,
  initializeDatabase: getDatabase, // getDatabase() ya crea las tablas si no existen
};
