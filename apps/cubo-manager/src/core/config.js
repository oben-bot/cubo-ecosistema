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
  // La Biblioteca (fase E1) ya no se lanza como proceso desde aquí: es un
  // servicio HTTP independiente (ver src/core/bibliotecaBridge.js y
  // BIBLIOTECA_URL/BIBLIOTECA_KEY en el .env).
};
