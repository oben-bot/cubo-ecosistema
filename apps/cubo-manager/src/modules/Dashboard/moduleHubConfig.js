// Configuración del hub visual del Dashboard.
// Cada módulo define su ruta, ícono y color de "glow" al pasar el cursor.
// Pensado para ser editable fácilmente (y a futuro, cargado desde config
// de usuario si se quiere personalizar por instalación).
const moduleHubConfig = [
  { key: 'warehouse', label: 'Almacén', icon: '📦', route: '/warehouse', glow: '#34d399' },
  { key: 'production', label: 'Producción', icon: '⚙️', route: '/production', glow: '#fb923c' },
  { key: 'quotations', label: 'Cotizaciones', icon: '📝', route: '/quotations', glow: '#fbbf24' },
  { key: 'sales', label: 'Ventas', icon: '🛒', route: '/sales', glow: '#818cf8' },
  { key: 'finance', label: 'Finanzas', icon: '💰', route: '/finance', glow: '#2dd4bf' },
  { key: 'customers', label: 'Clientes', icon: '👥', route: '/customers', glow: '#60a5fa' },
  { key: 'library', label: 'Biblioteca', icon: '🗂️', route: '/library', glow: '#e879f9' },
  { key: 'costeo', label: 'Costeo', icon: '🧮', route: '/costeo', glow: '#fbbf24' },
  { key: 'settings', label: 'Configuración', icon: '⚙️', route: '/settings', glow: '#94a3b8' },
];

export default moduleHubConfig;
