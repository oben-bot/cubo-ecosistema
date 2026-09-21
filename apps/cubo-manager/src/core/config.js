const path = require('path');
const os = require('os');

const userHome = os.homedir();
const appName = 'MiTaller';
const basePath = path.join(userHome, appName);

const sqliteFiles = {
  inventory: 'inventario_laser.db',
  warehouse: 'warehouse.db',
  production: 'production.db',
  quotations: 'quotations.db',
  sales: 'sales.db',
  finance: 'finance.db',
  customers: 'customers.db',
  calendar: 'calendar.db',
  marketing: 'marketing.db',
};

module.exports = {
  appName,
  storageBase: basePath,
  inventoryFolder: path.join(basePath, 'InventarioLaser'),
  catalogFolder: path.join(basePath, 'Catalogo_Laser'),
  syncFolder: path.join(basePath, 'TeraBox_Sincro'),
  dataPath: path.join(basePath, 'data'),
  inventoryFile: path.join(basePath, 'data', 'inventario_laser.json'),
  settingsFile: path.join(basePath, 'data', 'settings.json'),
  sqliteFiles,
  // Mini-Apps externas (lanzadas como proceso separado, no embebidas).
  // Se agrega una entrada por cada Mini-App; el mismo patrón sirve para
  // futuras herramientas (Producción, Marketing, etc.).
  miniApps: {
    biblioteca: {
      // Ruta real de la Mini-App en la máquina del taller.
      // TODO: mover a settings.json / onboarding para no hardcodear
      // rutas de un usuario específico.
      windowsPath: 'C:\\Users\\HP\\Documents\\Logica_Biblioteca_Laser\\organizador_laser.pyw',
    },
  },
};
