# Fase E7 — Conector de asistente: exponer las herramientas de Cubo Manager por HTTP

**Para:** arena.ai · **Revisa y ordena:** Claude · **Lee antes:** `AGENTS.md`, `docs/REPORTE_EJECUTIVO.md` (sección 4.6), `docs/ARQUITECTURA.md` (3.6), `apps/cubo-manager/src/core/ipcHandlers.js` (para ver los handlers reales que vas a envolver, no a reescribir).

**Contexto importante:** ya se decidió que **no se integra ningún asistente concreto** (ni Hermes ni la Wallet) en esta fase. Lo único que se construye es el **enchufe**: un servidor HTTP dentro de Cubo Manager que cualquier asistente compatible pueda llamar más adelante. Nada de esto depende de que haya una IA conectada — se debe poder probar con `curl`, igual que las fases anteriores.

**Cubo Manager hoy no tiene ningún servidor HTTP** (solo IPC entre su ventana y su proceso principal). Esta fase le agrega uno nuevo, sin tocar la interfaz de escritorio existente.

## Objetivo
Un servidor HTTP en `127.0.0.1:7104` (dentro del proceso principal de Electron, arrancado junto con la app), con llave local `X-Cubo-Key` (mismo patrón que Biblioteca/Taller/Catálogo), que expone las 6 herramientas del contrato `ARQUITECTURA.md` 3.6, y una cola de aprobación para las que escriben.

## Dentro del alcance

### 1. Servidor HTTP (nuevo módulo, p. ej. `src/core/servidorAsistente.js`)
- Arranca junto con la app (en `electron/main.js`), en un puerto configurable por `.env` (`ASISTENTE_PUERTO`, por defecto 7104).
- Llave local generada y guardada igual que en Biblioteca/Taller (archivo local, cabecera `X-Cubo-Key`).
- `GET /salud` como las demás piezas.

### 2. Las 6 herramientas — cada una envuelve un handler que ya existe, no reinventa lógica
| Herramienta HTTP | Envuelve (ya existe en `ipcHandlers.js`) | Escribe/publica |
|---|---|---|
| `POST /herramientas/buscar_diseno` `{ q, tipo? }` | Llama a la Biblioteca real (mismo `bibliotecaBridge.js` que ya usa el módulo Biblioteca) | No |
| `POST /herramientas/consultar_stock` `{ material? }` | `inventario:getAll` / `getProductosTerminados` | No |
| `POST /herramientas/cotizar` `{ producto, material, medidas, cantidad }` | `costeo:calcularCosto` (arma la referencia igual que hace la pantalla de Costeo) | No |
| `POST /herramientas/crear_pedido` `{ cliente, items, entrega }` | `cotizaciones:create` + `trabajos:crearDesdeCotizacion` | **Sí** |
| `POST /herramientas/registrar_venta` `{ ... }` | `ventas:create` | **Sí** |
| `POST /herramientas/preparar_publicacion` `{ activo_id, canal }` | Arma el payload de `POST /productos` del Catálogo (`apps/catalogo-web`), sin publicarlo todavía | **Sí** |

### 3. Cola de aprobación (para las 3 que escriben)
Las herramientas que escriben o publican **no ejecutan directo**: crean un registro `pendiente_aprobacion` (tabla nueva o reutilizar un patrón similar al de `entregas` en Catálogo) y devuelven su `id`. Necesitas:
- `GET /pendientes` — lista lo que espera aprobación.
- `POST /pendientes/:id/aprobar` — ahí sí ejecuta la acción real (llama al handler correspondiente).
- `POST /pendientes/:id/rechazar` — descarta sin ejecutar.
- Una pestaña o sección mínima en la interfaz de Cubo Manager (puede ser muy simple) donde el dueño ve la cola y aprueba/rechaza con un botón. No hace falta que sea bonita, sí que sea usable.

## Fuera del alcance (no lo hagas)
Conectar Hermes, la Wallet, Ollama o cualquier asistente real; publicar de verdad en el Catálogo desde `preparar_publicacion` (solo arma el payload, la publicación real ya existe en `POST /productos` y no se toca aquí); cambiar la lógica de ninguno de los handlers que envuelves; marketing (WordPress/Gumroad/WhatsApp) — eso sigue fuera, como siempre.

## Criterios de aceptación
- [ ] Las 6 rutas responden con `curl` y devuelven datos reales (no simulados) de una instalación de prueba con datos de ejemplo tuyos.
- [ ] `crear_pedido`, `registrar_venta` y `preparar_publicacion` **no ejecutan nada** hasta que se aprueban desde `/pendientes/:id/aprobar`; verificado creando uno, confirmando que no aparece en `cotizaciones:getAll`/`ventas:getAll` hasta aprobarlo, y que sí aparece después.
- [ ] `rechazar` descarta sin dejar rastro en las tablas reales.
- [ ] Sin llave, todas las rutas responden 401 (excepto `/salud`).
- [ ] La app sigue compilando y arrancando igual que antes (el servidor HTTP no interfiere con la interfaz existente).
- [ ] Pruebas automáticas donde se pueda sin Electron completo (la lógica de armar cada herramienta, si se puede aislar de `app`/`BrowserWindow`).
- [ ] `.env.example` con `ASISTENTE_PUERTO` y cualquier otra variable nueva.

## Entrega
Rama `fase-E7/asistente` → PR con notas de entrega (hecho / no hecho / decisiones / dudas) y entrada en `docs/BITACORA.md`.
