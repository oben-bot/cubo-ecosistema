// Bridge para comunicación con la Biblioteca Laser (app externa)
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const config = require('./config');

class BibliotecaBridge {
  constructor() {
    this.bibliotecaPath = null;
    this.bibliotecaPort = 3001;
    this.bibliotecaProcess = null;
    this.isConnected = false;
  }

  // Buscar la app de Biblioteca Laser en el sistema
  async findBiblioteca() {
    // Ruta configurada centralmente (ver src/core/config.js -> miniApps.biblioteca)
    const configuredPath = config.miniApps?.biblioteca?.windowsPath;
    if (configuredPath && fs.existsSync(configuredPath)) {
      return configuredPath;
    }

    // Rutas alternativas por si se ejecuta en otro sistema/instalación
    const possiblePaths = [
      path.join(process.cwd(), '..', 'BibliotecaLaser'),
      '/home/ubuntu/BibliotecaLaser',
      'C:/BibliotecaLaser'
    ];

    for (const basePath of possiblePaths) {
      const exePath = path.join(basePath, 'BibliotecaLaser.exe');
      const pywPath = path.join(basePath, 'biblioteca.pyw');
      const mainPath = path.join(basePath, 'main.py');
      
      if (fs.existsSync(exePath)) return exePath;
      if (fs.existsSync(pywPath)) return pywPath;
      if (fs.existsSync(mainPath)) return mainPath;
      if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) return basePath;
    }
    
    return null;
  }

  // Iniciar la Biblioteca Laser si no está corriendo
  async startBiblioteca() {
    const bibPath = await this.findBiblioteca();
    if (!bibPath) {
      return { success: false, message: 'Biblioteca Laser no instalada' };
    }
    
    try {
      if (bibPath.endsWith('.exe')) {
        this.bibliotecaProcess = spawn(bibPath, [], { detached: true, stdio: 'ignore' });
        this.bibliotecaProcess.unref();
      } else if (bibPath.endsWith('.pyw')) {
        // pythonw evita que se abra una ventana de consola junto a la Mini-App
        this.bibliotecaProcess = spawn('pythonw', [bibPath], { detached: true, stdio: 'ignore' });
        this.bibliotecaProcess.unref();
      } else if (bibPath.endsWith('.py')) {
        this.bibliotecaProcess = spawn('python3', [bibPath], { detached: true, stdio: 'ignore' });
        this.bibliotecaProcess.unref();
      }
      
      return { success: true, message: 'Biblioteca Laser iniciada' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Verificar conexión con la API de la biblioteca
  async checkConnection() {
    return new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: this.bibliotecaPort,
        path: '/api/health',
        method: 'GET',
        timeout: 1000
      }, (res) => {
        this.isConnected = res.statusCode === 200;
        resolve(this.isConnected);
      });
      
      req.on('error', () => {
        this.isConnected = false;
        resolve(false);
      });
      
      req.end();
    });
  }

  // Obtener diseños de la biblioteca
  async getDisenos(categoria = null) {
    if (!await this.checkConnection()) {
      return this.getDisenosFromStorage();
    }
    
    return new Promise((resolve) => {
      const url = categoria 
        ? `/api/disenos?categoria=${encodeURIComponent(categoria)}`
        : '/api/disenos';
      
      const req = http.request({
        hostname: 'localhost',
        port: this.bibliotecaPort,
        path: url,
        method: 'GET'
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve([]);
          }
        });
      });
      
      req.on('error', () => resolve(this.getDisenosFromStorage()));
      req.end();
    });
  }

  // Fallback: leer diseños desde carpeta compartida
  getDisenosFromStorage() {
    const catalogoPath = path.join(process.cwd(), 'storage', 'Catalogo_Laser');
    const disenos = [];
    
    if (fs.existsSync(catalogoPath)) {
      const categories = fs.readdirSync(catalogoPath);
      for (const category of categories) {
        const categoryPath = path.join(catalogoPath, category);
        if (fs.statSync(categoryPath).isDirectory()) {
          const files = fs.readdirSync(categoryPath);
          for (const file of files) {
            if (file.match(/\.(cdr|eps|svg|ai|pdf)$/i)) {
              disenos.push({
                id: `${category}_${file}`,
                nombre: file.replace(/\.[^/.]+$/, ''),
                categoria: category,
                archivo: path.join(categoryPath, file),
                preview: null,
                tienePreview: false
              });
            }
          }
        }
      }
    }
    
    return disenos;
  }

  // Obtener un diseño específico
  async getDisenoById(id) {
    const disenos = await this.getDisenos();
    return disenos.find(d => d.id === id);
  }

  // Copiar diseño para producción
  async copiarDisenoParaProduccion(disenoId, trabajoId) {
    const diseno = await this.getDisenoById(disenoId);
    if (!diseno) return { success: false, message: 'Diseño no encontrado' };
    
    const destinoPath = path.join(process.cwd(), 'storage', 'Trabajos_Evidencias', `trabajo_${trabajoId}`);
    if (!fs.existsSync(destinoPath)) fs.mkdirSync(destinoPath, { recursive: true });
    
    const nombreArchivo = path.basename(diseno.archivo);
    const destinoArchivo = path.join(destinoPath, nombreArchivo);
    
    fs.copyFileSync(diseno.archivo, destinoArchivo);
    
    return { 
      success: true, 
      message: 'Diseño copiado para producción',
      ruta: destinoArchivo
    };
  }

  // Sincronizar productos desde Mi Taller a Biblioteca
  async syncProductosToBiblioteca() {
    const { query } = require('./database');
    const productos = query(`SELECT * FROM inventario WHERE tipo = 'producto_terminado' AND cantidad > 0`);
    
    const exportPath = path.join(process.cwd(), 'storage', 'Catalogo_Laser', '_sync');
    if (!fs.existsSync(exportPath)) fs.mkdirSync(exportPath, { recursive: true });
    
    const catalogData = {
      timestamp: new Date().toISOString(),
      productos: productos.map(p => ({
        id: p.id,
        nombre: p.nombre,
        codigo: p.codigo,
        precio: p.precio_venta,
        categoria: p.categoria,
        stock: p.cantidad
      }))
    };
    
    fs.writeFileSync(
      path.join(exportPath, 'catalogo_sync.json'),
      JSON.stringify(catalogData, null, 2)
    );
    
    return { success: true, productos: productos.length };
  }
}

module.exports = new BibliotecaBridge();
