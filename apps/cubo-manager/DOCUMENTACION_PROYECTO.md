(Cópialo completo y guárdalo como README.md o DOCUMENTACION_PROYECTO.md)

Nombre del Proyecto: CuboManager
Tipo de Aplicación: Aplicación de Escritorio Local (Electron + React)
Objetivo General:
Crear un sistema central de gestión completo para el taller “El Cubo de Madera”, altamente local, estable y escalable, que integre todas las operaciones del negocio sin depender de servidores web costosos.

🎯 Objetivos Principales

Gestionar todo de forma local (archivos, bases de datos, carpetas físicas).
Tener un núcleo fuerte en la Biblioteca Laser + Catálogo Fénix.
Conectar todos los módulos operativos de forma eficiente.
Preparar integraciones automáticas con canales externos (WordPress, redes sociales, WhatsApp, n8n, OpenAI).


Estructura General del Proyecto (Macro)
CuboManager/
├── electron/                  # Proceso principal de Electron
│   ├── main.js
│   ├── preload.js
│   └── builder.config.js
├── src/
│   ├── core/                  # Sistema central (transversal)
│   │   ├── config.js          # Rutas de carpetas y configuración global
│   │   ├── fileSystem.js      # Manejo de archivos, drag & drop, optimización
│   │   ├── database.js        # Gestión general de bases de datos
│   │   └── ipcHandlers.js     # Comunicación entre Electron y React
│   ├── modules/               # Micro-sistemas / Módulos principales
│   │   ├── Library/           # ← Biblioteca Laser + Catálogo Fénix (Prioridad 1)
│   │   ├── Warehouse/         # Almacén de materiales
│   │   ├── Production/        # Producción y cola de corte
│   │   ├── Quotations/        # Cotizaciones
│   │   ├── Sales/             # Ventas
│   │   ├── Finance/           # Finanzas
│   │   ├── Customers/         # Clientes
│   │   ├── Calendar/          # Calendario y programación
│   │   └── Marketing/         # Publicaciones y canales externos
│   ├── components/            # Componentes UI reutilizables
│   ├── context/               # Contextos globales de React
│   ├── utils/                 # Utilidades generales
│   ├── hooks/                 # Hooks personalizados
│   └── assets/
├── data/                      # Bases de datos locales
│   ├── inventario_laser.json
│   ├── production.db
│   ├── quotations.db
│   ├── sales.db
│   ├── finance.db
│   ├── customers.db
│   └── calendar.db
├── storage/                   # Carpetas físicas gestionadas por la app
│   ├── InventarioLaser/
│   ├── Catalogo_Laser/
│   └── TeraBox_Sincro/
└── package.json

Estrategia de Bases de Datos

Biblioteca Laser: inventario_laser.json + carpetas físicas (InventarioLaser, Catalogo_Laser, TeraBox_Sincro).
Resto de módulos: Cada uno con su propio archivo SQLite (independientes para evitar cuellos de botella).


Flujo General del Sistema

Inicio → Validación de carpetas + carga de configuración.
Biblioteca Laser → Ingreso de diseños (Drag & Drop) → Procesamiento → Registro.
Integración → Cada módulo consume información de la Biblioteca según necesite.
Salida → Marketing, WhatsApp, WordPress, n8n.
Inteligencia → Asistente IA (OpenAI o local) que controla y delega tareas.


Rol de Cada Módulo

Library: Núcleo visual y documental (vectores + imágenes + metadatos).
Warehouse: Control de materiales y stock.
Production: Cola de producción y seguimiento de trabajos.
Quotations: Generación y historial de cotizaciones.
Sales: Gestión de pedidos y ventas.
Finance: Reportes financieros y márgenes.
Customers: CRM de clientes.
Calendar: Programación y recordatorios.
Marketing: Publicaciones automáticas y envío a canales.


Integraciones Externas Planeadas

n8n → Automatizaciones (WordPress, Instagram, Facebook, WhatsApp).
OpenAI → Asistente IA inteligente.
TeraBox → Backup de vectores.
WordPress → Publicación automática del catálogo.


Estado Actual del Proyecto:
Estructura en proceso de reorganización.
Prioridad actual: Limpiar + fortalecer Core + desarrollar Biblioteca Laser.

---

## Nota sobre integración de Mini-Apps externas (Biblioteca Laser)

Modelo de integración adoptado: **lanzamiento externo**, no embebido (no iframe/webview).
La app principal (Electron) ejecuta la Mini-App como proceso separado vía `child_process.spawn`.
Esto evita mezclar tecnologías (Python + Electron) dentro de una misma ventana, lo cual es más
inestable y difícil de mantener.

Patrón de implementación:
1. Ruta de la Mini-App centralizada en `src/core/config.js` (objeto `miniApps`).
2. Lógica de lanzamiento/búsqueda en `src/core/bibliotecaBridge.js`.
3. Handlers IPC (`biblioteca:start`, `biblioteca:getStatus`, etc.) registrados en `src/core/ipcHandlers.js`.
4. API expuesta de forma segura al frontend en `electron/preload.js` (contextIsolation activo).
5. Consumida desde React en `src/modules/Library/LibraryMain.jsx` vía `window.electron.biblioteca.*`.

El mismo patrón se reutiliza para futuras Mini-Apps (Producción, Marketing, etc.): solo se agrega
una entrada nueva en `config.js` y su bloque de handlers correspondiente.
