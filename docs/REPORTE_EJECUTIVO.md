# Reporte ejecutivo — Ecosistema "El Cubo de Madera"

**Versión:** 1.1 · **Fecha:** 21 de septiembre de 2026
**Naturaleza:** documento vivo. Se actualiza al cerrar cada fase; el registro cronológico está en `BITACORA.md`.
**Fuentes:** carpeta de Google Drive "Pagina,Catalogo,biblioteca" (fichas técnicas), plan maestro del Taller Paramétrico, documento "Hermes LAB + Wallet", revisión directa de los repositorios de GitHub de la cuenta `oben-bot`, y las decisiones tomadas en conversación con el dueño del proyecto.

---

## 0. Resumen para quien retome esto (persona o IA)

Léelo aunque no leas nada más del documento; con esto solo ya puedes seguir el hilo.

**Qué es.** Un ecosistema de software para un taller de corte láser/3D ("El Cubo de Madera"): app de escritorio central (Cubo Manager), biblioteca de diseños, taller de constructores paramétricos, catálogo+web de venta, y un router de IA propio (Wallet). Doble objetivo: operar el taller real **y** venderlo como producto (cascarón) a otros talleres. Detalle completo en las secciones 1 a 8 de este documento.

**Dónde vive el código.**
- `github.com/oben-bot/cubo-ecosistema` — repo **principal**, privado. Aquí es donde queda todo ya revisado y ordenado. Estructura: `apps/cubo-manager`, `apps/catalogo-web`, `apps/biblioteca` (nuevo), `apps/taller` (vacío aún), `services/wallet` (vacío aún, pendiente de importar), `docs/` (este reporte, `ARQUITECTURA.md` con los contratos entre módulos, `BITACORA.md` con el historial fase por fase, `DEUDA_TECNICA.md`, `docs/fases/` con los briefs).
- `github.com/oben-bot/cubo-arena` — repo de trabajo para **arena.ai**. Ahí construye cada fase en una rama y abre un PR; Claude lo revisa, lo prueba de verdad (no solo lee el reporte de arena.ai) y lo traslada a `cubo-ecosistema`.
- `github.com/oben-bot/app-cubo-madera` y `github.com/oben-bot/oben-bot` — repos **antiguos**, públicos, de donde salieron las copias iniciales de Cubo Manager y el Catálogo. Ya no se tocan; siguen ahí de respaldo hasta decidir qué hacer con ellos.
- Reglas obligatorias para cualquiera que programe en el repo: `AGENTS.md` (en la raíz de `cubo-ecosistema` y copiado a `cubo-arena`).

**Cómo se trabaja.** Un frente a la vez. Cada fase tiene un brief en `docs/fases/FASE_EX_....md` con alcance, lo que queda fuera, y criterios de aceptación verificables. arena.ai construye en `cubo-arena`; Claude revisa el PR, **lo ejecuta y lo prueba él mismo** (no confía solo en las notas de entrega), lo funde, lo traslada a `cubo-ecosistema` y cierra la fase en `BITACORA.md`.

**Estado ahora mismo (22 de septiembre de 2026):**
- ✅ **E0 — Orden:** hecho. Repos creados, estructura, documentos base.
- ✅ **E1 — Biblioteca v1:** hecho y verificado. Servicio Node/TypeScript + SQLite en `apps/biblioteca` que ordena diseños (originales de solo lectura vs. trabajos personalizados), con búsqueda visual, importación masiva con detección de duplicados, y la regla de que solo se puede vender un archivo en digital si su licencia es propia o comercial. 41 pruebas automáticas, y Claude además la corrió a mano y confirmó los casos límite.
- ✅ **E2 — Cubo Manager conectado a la Biblioteca real, con seguridad básica corregida:** hecho y verificado. Módulos duplicados `.js`/`.jsx` resueltos (las 5 versiones viejas eliminadas); `bibliotecaBridge.js` reescrito como cliente HTTP real contra `apps/biblioteca`; contraseñas con hash (`scrypt`); recuperación por correo desactivada honestamente en vez de simulada; canales IPC genéricos (`database:*`, `fs:*`) eliminados y reemplazados por específicos. La app compila limpia con `react-scripts build`. Detalle completo y verificación paso a paso en `BITACORA.md`.
- 🔜 **E3 — Costeo** (brief: `docs/fases/FASE_E3_COSTEO.md`). Construir la pantalla que falta sobre el backend que ya está completo. Candidata para arena.ai.
- **Pendientes de más adelante:** Taller (E4), Catálogo+Web unidos y su flujo de venta (E5), venta de archivos digitales con n8n (E6), asistente de IA conectado (E7 — **decidido dejar fuera a Hermes por ahora**; el contrato queda genérico para enchufar la Wallet, Ollama u otro), empaquetado para vender el ecosistema (E8). Detalle: sección 10 y `BITACORA.md`.

**Decisiones ya tomadas que no hay que volver a discutir:** ver sección 9. Las más relevantes para retomar el hilo: la Biblioteca anterior del dueño se descartó y se construyó desde cero (E1, ya lista); Wallet y Hermes siguen funcionando por su cuenta, sin integrarse todavía; el modelo de venta es cascarón, Windows primero, venta única con actualizaciones de pago; cuando arena.ai no tiene créditos disponibles, Claude puede construir directamente esa parte, siempre verificando su propio trabajo con el mismo rigor que aplicaría a una revisión.

**Preguntas todavía sin responder** (no urgentes, no bloquean lo que sigue): dónde correr n8n en concreto, el flujo detallado del catálogo, el alcance inicial del 3D, y cómo se le habla a Hermes por fuera cuando se decida integrarlo.

**Con quién se coordina.** El dueño del proyecto opera todo desde una cuenta de GitHub (`oben-bot`) y una PC con Windows (con WSL2 para Hermes, aparte del ecosistema). Los repos nuevos son privados. Cualquier token de GitHub usado en esta conversación es temporal y se revoca al terminar.

---

## 1. Visión

Construir un **ecosistema de software para talleres de corte láser, impresión 3D y personalización**, con dos objetivos que avanzan a la vez:

1. **Operar el taller propio, "El Cubo de Madera".** Gestionar trabajos, pedidos, almacén, precios, finanzas y clientes; tener ordenada toda la biblioteca de diseños; generar diseños a pedido (nombres, cajas, llaveros y, después, 3D); mostrarlos y venderlos en línea, tanto **productos físicos como archivos digitales**; y contar con un asistente de IA que ayude a cotizar, buscar diseños y hacer marketing.
2. **Convertir el ecosistema en un producto vendible.** Al terminar, poder separarlo como "cascarón" (estructura base sin datos ni marca) y **venderlo por piezas o completo** a talleres, mini empresas o cualquiera que lo quiera, para que lo personalicen a su necesidad.

### Principios de diseño

- **Local primero.** Los datos del taller viven en la PC del dueño. La nube se usa solo donde hace falta (catálogo público, entregas cuando la PC está apagada, respaldo).
- **Windows primero**, después otras plataformas.
- **Módulos independientes** que cada uno se pueda vender suelto, con contratos claros entre ellos.
- **Conectores intercambiables.** Ninguna pieza depende de un proveedor concreto (IA, automatización, pagos, mensajería, nubes). Todo debe funcionar aunque un conector no esté.
- **Funciona sin IA.** La IA ayuda, pero ninguna operación del taller depende de ella.
- **Marca y textos por configuración**, nunca escritos en el código, para poder revender.
- **Un frente a la vez.** El riesgo mayor del proyecto es crecer sin cerrar nada; cada fase tiene criterio de "listo".
- **Cero secretos y cero datos reales en Git.**

---

## 2. Las piezas del ecosistema

| # | Pieza | Rol | Tecnología | Estado | ¿Se vende suelta? |
|---|---|---|---|---|---|
| 1 | **Cubo Manager** | App de escritorio central: gestión del taller y hub de conectores | Electron + React + SQLite | Base construida, con deuda técnica (ver 4.1) | Sí (es el núcleo) |
| 2 | **Biblioteca** (de activos) | Base ordenada de diseños y archivos: láser 2D, 3D, software y apps | Node/TypeScript (propuesto) | **No existe.** La versión iniciada en la PC se descartó; se construye desde cero | Sí |
| 3 | **Taller Paramétrico** | Constructores que generan diseños a pedido (nombres, cajas, llaveros; 3D después) | Node/TypeScript (según el plan) | Solo existe el plan maestro | Sí |
| 4 | **Catálogo Digital + Web** | Tienda pública y página del negocio, en un solo proyecto | Next.js 15 + TypeScript, Google Drive como almacén | Funciona en modo local; el modo Drive falta probarlo | Sí |
| 5 | **Wallet (API Hub Pro)** | Router multi-proveedor de IA con API estilo OpenAI y failover | Python | Funcionando; código en la PC del dueño, fuera de Git | **Sí, es un producto en sí mismo** |
| 6 | **Conectores** | Hermes (asistente, de terceros), n8n (automatización), pagos (PayPal y cuenta), mensajería (WhatsApp, Messenger), plataformas (Gumroad, redes), nubes (Drive, Mega, TeraBox), MyLaserTools (herramienta externa enlazada) | — | Ninguno integrado todavía | No (se configuran) |

---

## 3. Cómo interactúan entre sí

```
                        ┌──────────────────────────────────────────┐
                        │        CUBO MANAGER (escritorio)         │
                        │ trabajos · pedidos · ventas · finanzas   │
                        │ almacén · precios/costeo · clientes      │
                        │ ajustes · panel de conectores            │
                        └──┬─────────┬──────────┬──────────┬───────┘
                           │         │          │          │
                   ┌───────▼───┐ ┌───▼─────┐ ┌──▼───────┐ ┌▼────────────────────┐
                   │ BIBLIOTECA│ │ TALLER  │ │ CATÁLOGO │ │ CONECTORES          │
                   │ (activos) │ │ (constr.)│ │ + WEB    │ │ Wallet · Hermes ·   │
                   └───────▲───┘ └───┬─────┘ └──▲───────┘ │ n8n · pagos · nubes │
                           │         │          │         └─────────────────────┘
                           └─────────┘          │
                       (fija un diseño)         └── pedidos y pagos vuelven por n8n
```

### Reglas de interacción

1. **Cubo Manager es el intermediario.** El Catálogo nunca habla directo con la Biblioteca ni con el Taller; Cubo Manager decide qué se publica.
2. **Nadie escribe en la base de datos de otro módulo.** Se habla por API local. Cada dato tiene un solo dueño:

| Dato | Dueño |
|---|---|
| Diseños y archivos (originales y de trabajo), su origen y licencia | Biblioteca |
| Materiales, máquinas, costos, precios, costeo | Cubo Manager |
| Clientes, pedidos, trabajos, ventas, finanzas, almacén | Cubo Manager |
| Recetas de constructores, tipografías, formas base | Taller |
| Productos publicados (JSON e imágenes) | Catálogo (en el Drive del dueño) |
| Llaves y tokens de proveedores de IA | Wallet |

3. **Los conectores se enchufan por una interfaz**, no por código a la medida: la IA habla OpenAI-compatible, la automatización habla webhooks y cola de entregas, los pagos hablan eventos.
4. **Todo funciona sin conectores.** Si no hay Wallet ni Hermes, el taller sigue operando; solo se pierden las ayudas de IA.

Los contratos técnicos están en `ARQUITECTURA.md`.

---

## 4. Detalle de cada pieza

### 4.1 Cubo Manager (núcleo)

**Qué debe hacer (requerimientos del dueño):**
- Gestionar **trabajos locales, pedidos en línea y ventas en línea**.
- Llevar registro de trabajos **realizados, pendientes y por realizar**.
- **Finanzas y estadísticas.**
- **Almacén:** registrar stock, avisar cuando algo se va a acabar, registrar y actualizar precios.
- **Área de precios:** registrar trabajos y precios como inventario de productos y precios para verificarlos; ver un producto con sus especificaciones (material, medidas, etc.).
- **Ajustes:** cambiar fondo de pantalla, idioma (español, inglés y chino por ahora), contraseñas con recuperación por correo.
- **Asistente** (Hermes u otro) como conector intercambiable.
- **Conectores** a Biblioteca, Taller, Catálogo, n8n, pagos, mensajería.

**Estado verificado en el código (repo `app-cubo-madera`):**
- Stack: Electron 26, React con Create React App, SQLite. Módulos con pantalla: Almacén, Producción, Cotizaciones, Ventas, Finanzas, Clientes, Calendario, Biblioteca, Dashboard, Ajustes. El flujo cotización → trabajo → venta → finanzas está probado.
- **Costeo:** el backend está completo (material, desgaste de máquina, electricidad, mano de obra), pero **no tiene pantalla**.
- **Marketing:** existe el componente pero **no tiene ruta**, y los envíos a WordPress, WhatsApp y Gumroad están **simulados**.
- **Asistente:** es un chatbot local por palabras clave, **sin IA**. El README dice que integra Hermes; en el código no es así.
- **Ajustes base, verificados uno por uno:**
  - Tema claro/oscuro/sistema y moneda: funcionan.
  - Fondo por módulo (color o imagen): funciona.
  - **Idioma:** solo guarda la preferencia; **no hay traducciones**, ni inglés ni chino.
  - **Contraseña:** se guarda y compara **en texto plano**.
  - **Recuperación por correo:** **simulada**. La pantalla dice "se ha enviado un enlace" pero no envía nada.
- **Puente con la Biblioteca:** el código consulta una API local (`/api/disenos`) o escanea carpetas; no lee una base de datos como decía la ficha. Además lanza un ejecutable con ruta escrita a mano (`C:\Users\HP\...`).
- **Deuda técnica:**
  - 5 módulos duplicados en `.js` y `.jsx` (Finanzas, Biblioteca, Producción, Cotizaciones, Almacén). Las `.jsx` son las nuevas y completas; Create React App carga primero las `.js` viejas. Muy probablemente la app muestra versiones antiguas. **Hay que confirmarlo ejecutando la app.**
  - Canales IPC genéricos (`database:query/run/get`, `fs:*`) expuestos al frontend.
  - `npm audit`: 76 vulnerabilidades (4 críticas), Electron 26 y `react-scripts` obsoletos.
  - Configuración con rutas y nombre de taller escritos en el código.

### 4.2 Biblioteca (de activos)

**Idea.** Una base **limpia y ordenada** de todos los archivos de diseño del dueño, que hoy están dispersos y casi siempre en ZIP. Ya no es solo de archivos láser: cubre **láser 2D, 3D, software y apps**, por eso se clasifica por nombre o producto.

**Dos espacios independientes (bases de datos o carpetas):**
1. **Originales limpios.** El archivo tal como llegó, sin modificar (solo lectura). Es lo que se puede vender en digital y lo que se toma como punto de partida.
2. **Trabajo personalizado.** Lo que el dueño modifica en **Inkscape** para un cliente. Guarda el registro de trabajos por si piden más, permite buscar si ya existe algo personalizado, y lleva la **foto del producto terminado**. Cada trabajo enlaza a su original.

**Flujo de ingreso.** Se ingresa un archivo o un ZIP; se puede agregar la imagen. Si no hay imagen: se toma la que trae el ZIP, se busca una en la web, o se hace una captura del diseño. Se capturan nombre, categoría, medidas, material y precio. Se guarda de forma segura (todo o nada).

**Búsqueda.** Por palabra clave o producto; muestra las **imágenes** de los diseños y, al elegir uno, lleva al archivo. Referencias de experiencia de uso: vecty.co, burrocreativo.com, vectorsfile.com.

**Datos de cada activo (mínimos):** tipo, categoría, etiquetas, medidas, material, imagen(es), archivo(s), espacio (original o trabajo) y enlace al original, **origen**, **licencia**, y una marca **"vendible en digital" apagada por defecto**.

**Origen actual de los archivos.** Son diseños públicos de la web que el dueño ya tiene, con muchos más por descargar. Por eso la biblioteca va **primero**: para ordenar antes de seguir acumulando. Importante: que un diseño sea público **no** significa que se pueda revender (ver riesgos, sección 8).

**Extras previstos.** Importación masiva de lo que ya existe con detección de duplicados por hash; sugerencia de categoría y palabras clave desde la imagen usando la visión de la **Wallet** (en lugar de CLIP/PyTorch); almacenamiento en niveles (SSD, HDD, nube); estado de publicación por canal.

**Uso desde Cubo Manager.** Ver productos con precios y especificaciones (material, medidas, etc.).

**Estado.** No existe. La ficha técnica anterior sirve como referencia, pero se construye desde cero.

### 4.3 Taller Paramétrico

**Idea.** Un hub de **constructores** que generan diseños en el momento, en vez de guardar bases enormes de nombres y tipografías. El resultado cae en una **bandeja temporal** y el dueño decide **guardarlo en producción o descartarlo**. Inspiración: MyLaserTools ("connected text"), con foco en herramientas hechas que se integran o enlazan para ahorrar trabajo y espacio.

**Tres tipos de constructor:**
| Tipo | Ejemplo | Conexión |
|---|---|---|
| Propio | Nombres con tipografía, cajas, llaveros | Código del Taller |
| Enlazado | MyLaserTools u otra web | Botón que la abre en el navegador; una carpeta vigilada detecta lo descargado y lo manda a la bandeja |
| Embebido | Herramientas con alianza | iframe con `postMessage` que devuelve el SVG (solo en web pública con dominio propio) |

**Constructores iniciales:** nombres, cajas y llaveros. El **3D** llega después con todos los constructores, con calma, una vez terminado el resto del ecosistema.

**MyLaserTools (hechos verificados).** Más de 80 herramientas que exportan SVG, STL y 3MF; código cerrado, todos los derechos reservados (**no se puede clonar**); uso gratis con licencia comercial para vender productos físicos; **revender los archivos digitales exige licencia Pro**; incrustar en un sitio es una alianza comercial con dominio registrado y clave (una app local no califica).

**Ajustes al plan maestro por la integración con el resto:**
- La importación de biblioteca (fase 2 del plan) **la hace la Biblioteca**, no el Taller.
- Los archivos y etiquetas viven en la Biblioteca; el Taller solo guarda recetas y una caché de exportes.
- Clientes y trabajos viven en Cubo Manager; el Taller solo guarda el identificador del trabajo.
- Materiales y máquinas los toma de Cubo Manager (falta agregar grosor y kerf ahí).
- El "catálogo estático o PocketBase" del plan se sustituye por el Catálogo Digital.
- No se crea otra app de escritorio (el plan sugería Tauri); el Taller es un servicio local que Cubo Manager abre.
- El Taller le puede devolver a Cubo Manager las medidas del archivo (largo de corte, área) para alimentar el Costeo.

**Plan maestro (referencia, `docs/origen/`).** Fases 0 a 6; con ~10 h/semana el propio plan estima: primer uso real (fases 0–3) 6–10 semanas; taller completo con 3D y catálogo 3–4.5 meses; con Hermes 4–5 meses, con ±40 % de incertidumbre. La **fase 0** son pruebas desechables (por ejemplo, unión de letras cursivas, el mayor riesgo) y puede correr en paralelo.

### 4.4 Catálogo Digital + Página web

**Decisión:** unir la página web y el catálogo en **un solo proyecto**. La landing (inicio, accesos rápidos, nosotros, pie) va en `/` y el catálogo en `/catalogo`. Si un comprador solo quiere la landing, se apaga el catálogo por configuración. La página solo enlaza redes y muestra marketing.

**Qué hace el catálogo:**
- Muestra los productos con imágenes de la Biblioteca o de trabajos ya realizados, con **búsqueda por palabra clave**.
- Para un producto físico, el cliente es dirigido a **WhatsApp, redes, la página web o Messenger**, donde el dueño trata con él, da el precio y **registra el pedido en Cubo Manager** (fecha de entrega, etc.) para pasarlo a producción.
- Para un **archivo digital**, se genera la venta: el cliente paga (**PayPal o cuenta**), deja su correo y recibe el archivo; la venta y los datos del cliente se registran en Cubo Manager.
- **El flujo detallado del catálogo está pendiente de definir por el dueño.**

**Estado verificado (repo `oben-bot`):**
- Almacenamiento intercambiable (local o Google Drive), login con lista blanca de correos, QR, hub de enlaces público/privado, importador de Excel.
- **Riesgos:** la ruta `/api/upload-image` (Cloudinary) **no exige sesión**; Next.js 15.4.6 con 2 vulnerabilidades críticas; el paquete `xlsx` con vulnerabilidad alta sin corrección; el README está desactualizado; falta `.env.example`; falta probar el login real con Google.
- Falta el endpoint por el que Cubo Manager publica productos.
- La landing existente está como `.zip` en el repo `Pagina-web`; queda en `incoming/pagina-web/` para integrarse.

### 4.5 Wallet (API Hub Pro)

Router de proveedores de IA **construido a medida**, pensado para **venderse**. Permite que cualquier app hable con varios proveedores por una sola API estilo OpenAI, con conmutación automática si uno falla.

- **Proveedores configurados:** gemini, cerebras, groq, openrouter, github, huggingface, publicai, anthropic (activos los primeros 5–6; anthropic y huggingface sin tokens activos).
- **Router** (`hermes_llm_router.py`, v1.5): cola de prioridad por tamaño de tokens, reintentos con backoff exponencial, traducción de formato para Gemini y Anthropic.
- **Detección de imagen:** si el mensaje trae imagen, fuerza un proveedor con visión real (Gemini, o Anthropic si hay tokens).
- **Endpoints:** `/v1/chat/completions`, `/v1/models`, `/v1/llm/status`, `/v1/llm/services`, `/v1/images/generations`, `/v1/vision/analyze`.
- **En el ecosistema:** es el "cerebro" de IA de Cubo Manager (asistente propio) y de la Biblioteca (sugerencias desde imágenes). Su `/v1/llm/status` puede alimentar el panel de conectores.
- **Pendiente antes de venderla:** validador automático de proveedores nuevos; **cambiar la llave maestra** (hoy permite todo si conserva el valor de fábrica); renovar token de GitHub y el slug de OpenRouter; decidir si se reactiva Anthropic como respaldo de visión; portar los fixes de visión si se retoma la versión "comercial" (`llm_router.py`/`api_wallet.py`).
- **Ubicación:** vive en la PC del dueño (`Desktop\Hermes\`), **no está en Git**. Nunca deben subirse sus tokens; se importará al repo sin secretos.
- Se queda en **Python** como servicio aparte; se le habla por HTTP.

### 4.6 Asistente de IA — conector genérico (Hermes fuera por ahora)

**Decisión:** por ahora **no se integra ningún asistente concreto**. La Wallet y Hermes ya tienen su propia forma de trabajo y su propia app; se dejan funcionando como están, por su cuenta, sin meterse con Hermes.

Lo que sí se construye es el **enchufe**: Cubo Manager expone un contrato local de herramientas (buscar diseño en la Biblioteca, cotizar, crear pedido, registrar venta, preparar publicación — detalle en `ARQUITECTURA.md` 3.6). Cualquier asistente que hable esa API estilo OpenAI puede llamarlas: la Wallet, una IA local (Ollama, LM Studio), un agente (OpenClaw u otro), o más adelante Hermes. Ninguno corre "por dentro" de Cubo Manager; todos entran por el mismo contrato, y las acciones que escriben o publican requieren **aprobación** del dueño.

Esto no bloquea nada: la búsqueda en la Biblioteca, el Costeo, los pedidos y las ventas funcionan igual sin ningún asistente conectado. Cuando se quiera activar uno (Wallet, Hermes u otro), es cuestión de configuración, no de código nuevo.

### 4.7 n8n, pagos y mensajería

- **n8n vive en línea** (n8n cloud o un servidor), no en la PC: si la PC está apagada debe seguir recibiendo pagos y avisando. Cubo Manager funciona como **trabajador local** que lee la cola de entregas cuando la PC está encendida. El hospedaje concreto está **por decidir**; se propone uno solo en línea, y que lo local lo haga Cubo Manager.
- **Pagos:** PayPal y cuenta. Confirmación **automática por n8n**, con **opción manual** (cada entrega espera aprobación).
- **Mensajería:** WhatsApp, Messenger y redes como puntos de contacto con el cliente.

---

## 5. Flujos de trabajo

**F1 — Ingreso de un diseño.** Arrastrar archivo o ZIP → detectar duplicados por hash → obtener imagen (ZIP, web o captura) → sugerir categoría y palabras clave (Wallet, con confirmación) → capturar datos y licencia → guardar como **original** (solo lectura) → aparece en la búsqueda.

**F2 — Búsqueda y producción.** Buscar por palabra clave o producto → ver imágenes → abrir el original sin modificarlo → si se personaliza, abrir en Inkscape → guardar en **trabajo** enlazado al original con foto del producto terminado → queda registrado por si piden más.

**F3 — Pedido personalizado (físico).** El cliente llega por WhatsApp, redes, web o Messenger → el dueño cotiza (Costeo) y da el precio → se registra el pedido en Cubo Manager con fecha de entrega → pasa a Producción → se entrega → se registra la venta y las finanzas.

**F4 — Constructor a pedido (por ejemplo, un nombre).** Elegir constructor y parámetros → se genera el archivo → cae en la **bandeja** → validar → **guardar en producción** (entra a la Biblioteca como trabajo con su receta) o **descartar**. Un lote de nombres se exporta de una vez.

**F5 — Publicar en el catálogo.** Elegir producto de la Biblioteca o de trabajos hechos → preparar imágenes y ficha → Cubo Manager aprueba y publica en el Catálogo → el catálogo lo muestra con búsqueda por palabra clave.

**F6 — Venta de un archivo digital.**
1. El cliente elige el archivo, paga (PayPal o cuenta) y deja su correo.
2. **n8n** (siempre en línea) recibe el pago, lo confirma (automático o manual) y registra la entrega en la **cola**.
3. Si el archivo está en la **nube** (software, apps, otros en TeraBox, Mega o Drive): n8n envía el enlace de inmediato, sin necesitar la PC.
4. Si el archivo está **en la PC**: n8n avisa al dueño para que la encienda y le manda al cliente un mensaje de espera. Al encenderse, Cubo Manager lee la cola, envía el archivo y marca la entrega.
5. Se registran venta y cliente en Cubo Manager.

**F7 — Almacén.** Registrar stock y precios de materiales → aviso cuando algo se va a acabar → actualizar precios → el Costeo usa esos datos.

**F8 — Marketing asistido.** El dueño pide contenido a Hermes → Hermes lo prepara con las herramientas de Cubo Manager → el dueño aprueba → n8n publica en Gumroad, redes o WhatsApp.

**F9 — Cotizar.** Producto + material + medidas → el Costeo calcula material, desgaste de máquina, electricidad y mano de obra → precio sugerido → se convierte en pedido.

---

## 6. Modelo de venta del ecosistema

- **Formato:** cascarón sin datos ni marca (bases vacías de plantilla), personalizable por el comprador.
- **Cómo se vende:** por piezas (por ejemplo solo Biblioteca, solo Catálogo, solo Wallet) o el ecosistema completo.
- **Plataforma:** **Windows primero**; después otras plataformas.
- **Precio:** **venta única**, con **actualizaciones opcionales de pago** (quien no actualiza conserva lo que compró).
- **Requisitos técnicos para poder venderlo:**
  1. Marca, textos y rutas por configuración.
  2. Idiomas español, inglés y chino desde el diseño.
  3. Cada módulo con su propia entrada, API y versión.
  4. Conectores (IA, automatización, pagos) detrás de interfaces intercambiables; todo funciona sin ellos.
  5. Bases de plantilla vacías; ningún dato ni secreto del dueño.
  6. Canal de actualizaciones y sistema de licencias o activación (a diseñar más adelante).
  7. Auditoría de licencias de todo lo incluido.
- **Qué no se incluye en lo que se vende:** los archivos de diseño de terceros del dueño, credenciales, y Hermes (salvo que su licencia lo permita).
- **Empaquetado:** instalador de Windows para la app de escritorio; la Wallet como servicio (Python).

---

## 7. Stack y decisiones técnicas

- Módulos nuevos en **TypeScript/Node**; Cubo Manager (Electron/JS) y Catálogo (Next.js/TS) ya encajan. La Wallet queda en **Python**. Se descarta Python/Tkinter y CLIP para la Biblioteca.
- Comunicación entre módulos por **API local**; nadie escribe la base de otro.
- Cada módulo se **abre desde Cubo Manager** como proceso externo (patrón ya existente con el puente de Biblioteca), sin iframes.
- Trabajo con arena.ai: construye en `cubo-arena`; Claude revisa y ordena en `cubo-ecosistema`. Ver `AGENTS.md`.

---

## 8. Riesgos y observaciones

**Licencias.**
- Diseños públicos descargados ≠ revendibles. Muchos sitios permiten productos físicos pero no redistribuir los archivos; venderlos en digital puede causar reclamos o disputas de pago. Mitigación: `origen`, `licencia` y `vendible_digital` (apagado por defecto), y encenderlo solo en diseños propios o con licencia. No es asesoría legal.
- MyLaserTools: no clonar; revender sus archivos digitales requiere licencia Pro.
- Fuentes tipográficas y librerías GPL: revisar antes de incluirlas en un producto vendido.
- Hermes es de terceros.

**Seguridad.**
- Contraseña en texto plano y recuperación por correo simulada (que además afirma haber enviado un enlace): corregir antes de cualquier venta.
- IPC genérico expuesto en Cubo Manager.
- `/api/upload-image` abierto en el Catálogo.
- Llave maestra de la Wallet en valor de fábrica; tokens de proveedores solo fuera de Git.
- Repos antiguos públicos (código sin secretos encontrados); los nuevos son privados.
- El token de GitHub compartido en la conversación da permisos de administrador sobre todos los repos: debe revocarse al terminar, y arena.ai debe usar otro limitado a `cubo-arena`.

**Operativos.**
- Las entregas de archivos locales dependen de que la PC esté encendida (mitigado con cola, aviso y mensaje al cliente).
- WSL2 cambia de IP en cada arranque (mitigado con el arrancador; Cubo Manager no depende de WSL).
- Riesgo de alcance: el proyecto crece más rápido de lo que se cierra (riesgo #8 del plan maestro).
- Riesgo de calidad: arena.ai construyendo sin reglas puede generar desorden; se mitiga con fases acotadas, criterios de "listo" y revisión de cada entrega.

---

## 9. Decisiones tomadas

1. La Biblioteca anterior se descarta; se construye desde cero y **primero**.
2. Biblioteca = activos de varios tipos (láser 2D, 3D, software, apps), con dos espacios: original limpio y trabajo personalizado.
3. Los diseños actuales son públicos de la web; la marca "vendible en digital" arranca apagada.
4. Entrega de archivos locales desde la PC, con alerta y mensaje de espera; software y apps en nubes con venta automática.
5. Pagos: PayPal y cuenta; confirmación automática por n8n con opción manual.
6. Los archivos 3D se venden por separado y también se generan; se lleva registro de venta física.
7. Constructores iniciales: nombres, cajas, llaveros; 3D después.
8. Taller como app independiente dentro del entorno, con constructores propios/enlazados/embebidos y bandeja temporal.
9. Página web y Catálogo se unen en un proyecto.
10. Conector de asistente genérico (API estilo OpenAI); Hermes queda fuera del ecosistema por ahora, funcionando por su cuenta.
11. Windows primero; venta única con actualizaciones de pago.
12. Flujo de trabajo: arena.ai construye en `cubo-arena`; Claude ordena en `cubo-ecosistema`; bitácora actualizada por fase.

---

## 10. Observaciones: dónde estamos y qué sigue

### Dónde estamos (21 de septiembre de 2026)

- **Análisis completo hecho:** 10 repos revisados, fichas de Drive, plan maestro, documento de la Wallet y MyLaserTools.
- **Repos nuevos creados (privados):** `cubo-ecosistema` (principal, ordenado) y `cubo-arena` (espacio de arena.ai).
- **Ordenado en `cubo-ecosistema`:** copias limpias de Cubo Manager y del Catálogo Digital (sin `build/`, `.bak`, instalador de Node ni base de datos), la landing en `incoming/`, el plan maestro en `docs/origen/`, y estos documentos.
- **Repos antiguos:** intactos. No se modificó nada en ellos.
- **No hecho aún:** verificar que Cubo Manager corre con los módulos correctos; resolver duplicados `.js`/`.jsx`; corregir contraseña y recuperación; cerrar `/api/upload-image`; actualizar dependencias; importar la Wallet al repo.

### Qué sigue (fases del ecosistema, prefijo E)

| Fase | Contenido | Quién | Listo cuando… |
|---|---|---|---|
| **E0** | Orden: repos, documentos, limpieza | Claude | ✅ **Hecho** — repo principal ordenado y documentado |
| **E1** | **Biblioteca v1** | arena.ai → Claude ordena | ✅ **Hecho y verificado** — importa ZIP/archivos con duplicados por hash; obtiene imagen (zip, web, captura); dos espacios; búsqueda visual por palabra clave; API local; marca de origen/licencia |
| **E2** | Verificar Cubo Manager y conectarlo a la Biblioteca | Claude Code + Claude (revisa y completa) | ✅ **Hecho y verificado** — módulos duplicados resueltos; contraseña con hash; recuperación desactivada honestamente; conectado a la Biblioteca real; canales IPC endurecidos |
| **E3** | Costeo y precios con pantalla; alertas de stock | arena.ai | 🔜 Cotizar un producto de punta a punta desde la interfaz |
| **E4** | Taller v1: nombres, cajas, llaveros; bandeja | arena.ai | Un nombre pasa de constructor a Biblioteca sin pasos manuales; pieza real cortada |
| **E5** | Catálogo + Web unidos; flujo del catálogo | arena.ai (con el flujo definido por el dueño) | Un producto pasa de la Biblioteca al catálogo público |
| **E6** | Venta de archivos: n8n, cola de entregas, pagos | arena.ai | Una venta de prueba entrega el archivo con la PC encendida y avisa con la PC apagada |
| **E7** | Contrato de herramientas del asistente; conectar un asistente de IA (Wallet, local u otro) si se decide; marketing | arena.ai | Un asistente conectado busca y cotiza; nada se publica sin aprobación |
| **E8** | Producto: idiomas es/en/zh, licencias, actualizaciones, empaquetado Windows | arena.ai | Un instalador limpio en una PC nueva |

**Paralelo (Wallet):** importar al repo sin secretos, validador de proveedores, llave maestra, empaquetado.
**Paralelo (Taller):** fase 0 del plan (pruebas desechables) puede correr desde ya.

### Preguntas abiertas

- Dónde correr n8n (nube propia o n8n cloud) y qué pasarela de pago concreta.
- Flujo del catálogo (lo definirá el dueño).
- Alcance inicial del 3D y su costeo (filamento, impresora).
- Nombre comercial del producto y modelo de licencias/activación.
- Cómo se le habla hoy a Hermes por fuera (API, línea de comandos o MCP) para cerrar el contrato.
