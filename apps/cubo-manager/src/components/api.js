// API local/offline para Electron: usa IPC si está disponible, sino fallback a localStorage/mock
const hasIPC = typeof window !== 'undefined' && (window.electronAPI || window.api);

const fallbackSettings = {
  appName: 'MiTaller',
  primaryColor: '#3B82F6',
  secondaryColor: '#EFF6FF',
  language: 'es',
  backgroundImage: '',
  lastSync: new Date().toISOString()
};

const readLocal = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) {
    return fallback;
  }
};

export const getCurrentSettings = async () => {
  if (hasIPC) {
    try {
      const res = await (window.electronAPI ? window.electronAPI.invoke('get-settings') : window.api.invoke('get-settings'));
      return { success: true, settings: res };
    } catch (err) {
      console.warn('IPC get-settings falló, usando localStorage', err);
    }
  }
  return { success: true, settings: readLocal('cubomanager_settings', fallbackSettings), fromCache: true };
};

export const updateAppSettings = async (settings) => {
  if (hasIPC) {
    try {
      await (window.electronAPI ? window.electronAPI.invoke('update-settings', settings) : window.api.invoke('update-settings', settings));
      return { success: true };
    } catch (err) {
      console.warn('IPC update-settings falló, guardando localmente', err);
    }
  }
  localStorage.setItem('cubomanager_settings', JSON.stringify(settings));
  return { success: true, fromCache: true };
};

export const getProductos = async () => {
  if (hasIPC) {
    try {
      return await (window.electronAPI ? window.electronAPI.invoke('get-productos') : window.api.invoke('get-productos'));
    } catch (err) {
      console.warn('IPC get-productos falló, usando fallback', err);
    }
  }
  return readLocal('cubomanager_productos', []);
};

export const enviarPedido = async (pedido) => {
  if (hasIPC) {
    try {
      return await (window.electronAPI ? window.electronAPI.invoke('enviar-pedido', pedido) : window.api.invoke('enviar-pedido', pedido));
    } catch (err) {
      console.warn('IPC enviar-pedido falló, guardando localmente', err);
    }
  }
  // Guardar pedido en localStorage como cola pendiente
  const cola = readLocal('cubomanager_pedidos', []);
  cola.push({ ...pedido, createdAt: new Date().toISOString() });
  localStorage.setItem('cubomanager_pedidos', JSON.stringify(cola));
  return { ok: true, fromCache: true };
};