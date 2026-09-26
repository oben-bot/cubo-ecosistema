import type { Idioma } from './config.ts';

type Mensajes = Record<string, string>;

const DICCIONARIOS: Record<Idioma, Mensajes> = {
  es: {
    'salud.estado': 'ok',
    'error.no_autorizado': 'No autorizado. Falta X-Cubo-Key.',
    'error.ruta_no_encontrada': 'Ruta no encontrada.',
    'error.metodo_no_permitido': 'Método no permitido.',
    'error.cuerpo_invalido': 'Cuerpo JSON inválido.',
    'error.payload_demasiado_grande': 'Payload demasiado grande.',
    'error.parametro_invalido': 'Parámetro inválido: {parametro}',
    'error.producto_no_existe': 'Producto no existe: {id}',
    'error.entrega_no_existe': 'Entrega no existe: {id}',
    'error.biblioteca_no_disponible': 'No se pudo conectar con la Biblioteca en {url}. ¿Está corriendo? (apps/biblioteca -> npm start)',
    'error.config_valor_invalido': 'Valor inválido para {variable}',
    'ui.guardado_ok': 'Guardado OK',
    'ui.publicado_ok': 'Producto publicado OK',
    'ui.venta_ok': 'Venta registrada OK',
  },
  en: {
    'salud.estado': 'ok',
    'error.no_autorizado': 'Unauthorized. Missing X-Cubo-Key.',
    'error.ruta_no_encontrada': 'Route not found.',
    'error.metodo_no_permitido': 'Method not allowed.',
    'error.cuerpo_invalido': 'Invalid JSON body.',
    'error.payload_demasiado_grande': 'Payload too large.',
    'error.parametro_invalido': 'Invalid param: {parametro}',
    'error.producto_no_existe': 'Product not found: {id}',
    'error.entrega_no_existe': 'Delivery not found: {id}',
    'error.biblioteca_no_disponible': 'Cannot connect to Biblioteca at {url}. Is it running? (apps/biblioteca -> npm start)',
    'error.config_valor_invalido': 'Invalid value for {variable}',
    'ui.guardado_ok': 'Saved OK',
    'ui.publicado_ok': 'Product published OK',
    'ui.venta_ok': 'Sale registered OK',
  },
  zh: {
    'salud.estado': 'ok',
    'error.no_autorizado': '未授权。缺少 X-Cubo-Key。',
    'error.ruta_no_encontrada': '未找到路由。',
    'error.metodo_no_permitido': '方法不允许。',
    'error.cuerpo_invalido': '无效的 JSON。',
    'error.payload_demasiado_grande': '负载过大。',
    'error.parametro_invalido': '参数无效: {parametro}',
    'error.producto_no_existe': '产品不存在: {id}',
    'error.entrega_no_existe': '交付不存在: {id}',
    'error.biblioteca_no_disponible': '无法连接到 Biblioteca 在 {url}',
    'error.config_valor_invalido': '无效值 {variable}',
    'ui.guardado_ok': '保存成功',
    'ui.publicado_ok': '发布成功',
    'ui.venta_ok': '销售成功',
  },
};

export function diccionarioDe(idioma: Idioma): Mensajes {
  return DICCIONARIOS[idioma] ?? DICCIONARIOS.es;
}

export function traducir(idioma: Idioma, clave: string, detalles?: Record<string, string | number | undefined>): string {
  const dict = diccionarioDe(idioma);
  let mensaje = dict[clave] ?? clave;
  if (detalles) {
    for (const [k, v] of Object.entries(detalles)) {
      if (v !== undefined) mensaje = mensaje.replaceAll(`{${k}}`, String(v));
    }
  }
  return mensaje;
}
