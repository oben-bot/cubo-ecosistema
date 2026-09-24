# Arquitectura y contratos entre módulos

**Versión:** 1.0 (21 de septiembre de 2026) · Complementa a `REPORTE_EJECUTIVO.md`.
Los valores marcados como *propuesta* se pueden cambiar; lo que no se cambia sin acuerdo son las **reglas** y los **dueños de datos**.

## 1. Reglas

1. Cada módulo es un proceso independiente que escucha **solo en `127.0.0.1`** y se comunica por HTTP + JSON.
2. **Nadie escribe en la base de datos de otro módulo.** Solo por API.
3. Cubo Manager es el intermediario: Catálogo, Taller y Biblioteca no se hablan entre sí, salvo el paso Taller → Biblioteca al "guardar en producción".
4. Todo lo configurable (puertos, rutas, marca, idioma, llaves) sale de un archivo de configuración; **nada escrito a mano** en el código (ni rutas de usuario, ni nombre del taller).
5. Todo módulo arranca y funciona **sin** IA, sin n8n y sin ningún conector de asistente.
6. **Cero secretos y cero datos reales en Git.** Se usa `.env` (ignorado) y `.env.example` (versionado).
7. Cada módulo tiene su propia base SQLite con migraciones versionadas, y expone `GET /salud` con su versión.
8. Toda cadena visible al usuario usa **claves de traducción** (es, en, zh); no texto fijo.

## 2. Procesos (puertos: *propuesta*)

| Proceso | Dónde corre | Puerto |
|---|---|---|
| Cubo Manager (app + API local de herramientas) | Windows, escritorio | 7100 |
| Biblioteca | Windows, servicio local | 7101 |
| Taller (constructores + bandeja) | Windows, servicio local | 7102 |
| Wallet (API Hub Pro) | Windows, servicio local | 8081 (existente) |
| Catálogo + Web | Nube (Next.js) | — |
| n8n | Nube | — |
| Conector de asistente (opcional) | El suyo, fuera del ecosistema | el suyo |

Autenticación local: cabecera `X-Cubo-Key` con una llave por instalación, generada al primer arranque.

## 3. Contratos

### 3.1 Activo (Biblioteca)

```json
{
  "id": "act_000123",
  "tipo": "laser2d | modelo3d | software | app | otro",
  "espacio": "original | trabajo",
  "original_id": "act_000045",
  "nombre": "Caja con tapa corrediza",
  "categoria": "cajas",
  "etiquetas": ["caja", "tapa", "regalo"],
  "medidas_mm": { "ancho": 100, "alto": 60, "profundidad": 80 },
  "material": "MDF 3 mm",
  "archivos": [{ "ruta_relativa": "cajas/act_000123/caja.svg", "formato": "svg", "sha256": "..." }],
  "imagenes": [{ "ruta_relativa": "cajas/act_000123/preview.webp", "origen_imagen": "subida | zip | web | captura | foto_terminado" }],
  "origen": "sitio o autor de donde vino",
  "licencia": "propia | comercial_ok | solo_personal | desconocida",
  "vendible_digital": false,
  "receta": null,
  "ubicacion_almacen": "ssd | hdd | nube",
  "creado": "2026-09-21T12:00:00Z"
}
```

`vendible_digital` es **falso por defecto** y solo puede activarse si `licencia` es `propia` o `comercial_ok`.

### 3.2 API de la Biblioteca (mínimo)

| Método y ruta | Función |
|---|---|
| `POST /activos` | Alta de archivo o ZIP (con imagen opcional); guarda todo o nada |
| `POST /importar` | Importa una carpeta existente sin moverla; detecta duplicados por `sha256` |
| `GET /activos?q=&tipo=&espacio=&categoria=` | Búsqueda por palabra clave o producto (admite `limite`/`offset` para paginar) |
| `GET /activos/:id` | Ficha completa |
| `GET /activos/:id/archivo` | Descarga del archivo (solo lectura si es original) |
| `POST /activos/:id/trabajo` | Crea una versión de **trabajo** enlazada al original |
| `PATCH /activos/:id` | Edita metadatos (nunca el archivo original) |
| `GET /salud` | Versión y estado |

### 3.3 Taller → bandeja → Biblioteca

- `POST /bandeja` (Taller): un constructor deposita `{ archivo, formato, medidas_mm, receta, constructor }`.
- `POST /bandeja/:id/guardar` (Taller): entrega el archivo a `POST /activos` de la Biblioteca con **`espacio: "original"`** (no "trabajo": un diseño recién generado no tiene un original previo al que enlazarse), `origen: "taller:<nombre-constructor>"`, `licencia: "propia"` y su `receta` (la Biblioteca ya soporta este campo desde la fase E1, confirmado en `apps/biblioteca/src/activos.ts`). **Descartar** borra el archivo temporal.
- Un constructor devuelve siempre: archivo (SVG/DXF/STL/3MF), medidas en mm, y la receta que permite regenerarlo. El Taller puede además devolver **largo de corte y área** para el Costeo.
- Constructores **enlazados**: una carpeta vigilada detecta los archivos descargados y los deposita en la bandeja.

### 3.4 Cubo Manager → Catálogo (publicar)

Cubo Manager sube al Catálogo un producto:

```json
{ "id": "prod_0001", "nombre": "...", "descripcion": "...", "categoria": "...",
  "etiquetas": ["..."], "imagenes": ["ruta o url"], "especificaciones": { "material": "...", "medidas": "..." },
  "tipo_venta": "fisico | digital", "precio": 0, "moneda": "MXN",
  "contacto": ["whatsapp", "messenger", "web"], "activo_id": "act_000123" }
```

El Catálogo guarda su estado publicado en el Drive del dueño (JSON), como hoy. Solo Cubo Manager publica.

### 3.5 Cola de entregas (venta de archivos)

```json
{ "id": "ent_0001", "pedido_id": "ped_0001", "cliente": { "nombre": "...", "email": "..." },
  "activo_id": "act_000123", "ubicacion": "pc | nube", "enlace": null,
  "confirmacion": "automatica | manual", "estado": "pendiente | aprobada | enviada | error" }
```

- La cola vive en un almacén **en línea** (lo elige n8n; a definir) para que exista con la PC apagada.
- `ubicacion: "nube"` → n8n entrega el enlace directo.
- `ubicacion: "pc"` → n8n avisa al dueño y al cliente; **Cubo Manager** lee la cola al encenderse, envía el archivo y marca `enviada`.
- `confirmacion: "manual"` → no se envía hasta que el dueño apruebe.

### 3.6 Herramientas del asistente (API local de Cubo Manager)

Este es el único punto de contacto entre Cubo Manager y cualquier asistente de IA. **No se integra ningún asistente concreto por ahora** (ni Hermes ni otro): el contrato queda abierto para que, cuando se quiera, se enchufe cualquier IA compatible —local (Ollama, LM Studio), agentes (OpenClaw u otros) o la propia Wallet— sin tocar Cubo Manager. Cualquier conector debe limitarse a llamar estas herramientas; nada corre "por dentro" de Cubo Manager.

| Herramienta | Escribe/publica | Aprobación |
|---|---|---|
| `buscar_diseno(q, tipo?)` | No | No |
| `consultar_stock(material?)` | No | No |
| `cotizar(producto, material, medidas, cantidad)` | No | No |
| `crear_pedido(cliente, items, entrega)` | Sí | **Sí** |
| `registrar_venta(...)` | Sí | **Sí** |
| `preparar_publicacion(activo_id, canal)` | Sí | **Sí** (publica n8n tras aprobar) |

Transporte: HTTP local con esquema JSON. Nada de lo que escribe o publica se ejecuta sin la aprobación del dueño en la interfaz.

### 3.7 IA (Wallet u otro conector)

La Biblioteca (sugerencia de categoría desde imagen) y cualquier herramienta de 3.6 que use IA hablan por la **API estilo OpenAI**: `POST /v1/chat/completions`, `POST /v1/vision/analyze`, `GET /v1/llm/status`. Hoy eso lo puede dar la Wallet, pero el contrato es genérico: cualquier servicio compatible con esa API (Ollama, LM Studio, un router propio, etc.) sirve igual, sin cambiar código. **Hermes queda fuera del ecosistema por ahora**; sigue funcionando por su cuenta con la Wallet como su cerebro, pero sin integrarse a Cubo Manager.

## 4. Configuración de marca y producto

Un archivo `marca.json` por instalación: nombre del negocio, logo, colores, idioma por defecto, enlaces de contacto. Sin él, la app arranca con marca genérica. Así el mismo código se vende a otros talleres.

## 5. Pendientes de diseño

- Almacén en línea para la cola de entregas (depende de dónde se aloje n8n).
- Sistema de licencias/activación y canal de actualizaciones (fase E8).
- Cuándo y con qué conector de IA se llenan las herramientas de 3.6 (Wallet, Ollama, un agente, u otro) — decisión aplazada, no bloquea las fases E1–E6.
