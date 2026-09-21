const { app, BrowserWindow, shell, screen, ipcMain } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('../src/core/ipcHandlers');

const isDev = process.env.NODE_ENV === 'development';
let mainWindow;

function createWindow() {
  // Obtener tamaño de la pantalla
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // Tamaño inicial: 90% de la pantalla, máximo 1400x900
  const windowWidth = Math.min(Math.floor(width * 0.9), 1400);
  const windowHeight = Math.min(Math.floor(height * 0.9), 900);
  
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 800,      // Tamaño mínimo para no romper diseño
    minHeight: 600,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',  // Barra de título más limpia
    backgroundColor: '#0f0f1a',
    show: false
  });

  // Eliminar "Cubo Manager" de la barra de título
  mainWindow.setTitle('');  // Vacío o lo que el usuario ponga en onboarding
  
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Centrar la ventana
    mainWindow.center();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  
  // Manejar cambio de título dinámico
  mainWindow.webContents.on('page-title-updated', (event, title) => {
    event.preventDefault();
    // Usar el nombre del negocio en lugar del título por defecto
    if (title !== 'Mi Taller') {
      mainWindow.setTitle('');
    }
  });
}

app.whenReady().then(() => {
  registerIpcHandlers(ipcMain);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
