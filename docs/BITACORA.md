# Bitácora del ecosistema

Registro de lo que se ha hecho y lo que sigue. **Se actualiza al cerrar cada fase** (una entrada nueva arriba de las anteriores). Formato de cada entrada: qué se hizo, qué no se hizo, decisiones, y qué sigue.

---

## Estado actual

- **Fase abierta:** E2 — Cubo Manager conectado a la Biblioteca real. Parcialmente cerrada (ver entrada de abajo); queda pendiente el endurecimiento de canales IPC genéricos.
- **Siguiente:** resolver `database:query/run/get` genérico en los 6 módulos que aún lo usan (Clientes, Ventas, Marketing, Producción, Ajustes, Cotizaciones).
- **Bloqueos:** ninguno. Preguntas abiertas en el reporte ejecutivo (sección 10).

---

## E2 (parcial) — Biblioteca real, autenticación y duplicados · 22 de septiembre de 2026

**Quién:** arena.ai se quedó sin créditos antes de empezar esta fase; a petición del dueño, Claude construyó esta parte directamente (con verificación propia, mismo rigor que en una revisión), en vez de esperar a arena.ai. PR #2 en `cubo-arena`, fusionado a `main`, y trasladado a este repo.

**Hecho**
- `bibliotecaBridge.js`: cliente HTTP real contra el servicio de la Biblioteca (puerto 7101, contrato `ARQUITECTURA.md` 3.2: `buscar`, `getFicha`, `getImagenBase64`, `descargarParaProduccion`, `getEstado`). Reemplaza al bridge viejo, que lanzaba `organizador_laser.pyw` con una ruta de Windows escrita a mano (ya quitada de `config.js`).
- `auth.js` (nuevo): contraseña con `scrypt` + sal, comparación en tiempo constante. Reemplaza el texto plano guardado en `config` (`password`).
- Canales específicos `biblioteca:*` y `auth:*` en `ipcHandlers.js`/`preload.js`, en vez de los viejos `biblioteca:getStatus/start/getDisenos/...` y de `config.get/set('password')`.
- `LoginScreen.jsx`: usa `auth.verificarCredenciales`; se desactivó honestamente la recuperación por correo (antes decía "se ha enviado un enlace" sin enviar nada) — ahora indica contactar al administrador, hasta implementarla de verdad.
- `OnboardingWizard.jsx` y `SettingsMain.jsx`: usan `auth.establecerContrasena`/`auth.cambiarContrasena`.
- `LibraryMain.jsx`: reescrito para consumir la Biblioteca real en vez de la app de Python descartada.
- Duplicados `.js` eliminados (Finanzas, Biblioteca, Producción, Cotizaciones, Almacén): confirmado por análisis estático que create-react-app cargaba el `.js` viejo por resolución de extensiones; el `.jsx` era la versión completa en los 5 casos. Un solo archivo por módulo ahora.

**Verificación:** `node --check` en los `.js` tocados; compilación con `@babel/preset-react` en los `.jsx` tocados. No se pudo correr la app end-to-end (sin Electron/pantalla en este entorno) ni probar contra una Biblioteca en ejecución real.

**No hecho (sigue abierto en E2)**
- Canales IPC específicos para `database:query/run/get`, todavía usados desde `ClientesMain.js`, `SalesMain.jsx`, `MarketingMain.jsx`, `ProductionMain.jsx`, `SettingsMain.jsx` y `CotizacionesMain.jsx`.
- Correr Cubo Manager de verdad (en la PC del taller) contra una Biblioteca levantada, para confirmar en vivo lo que aquí solo se verificó estáticamente.

**Siguiente:** cerrar el IPC genérico restante; luego, prueba real end-to-end en la PC del taller.

---

## E1 — Biblioteca v1 · 21 de septiembre de 2026

**Quién:** construido por arena.ai en `cubo-arena` (PR #1, fusionado); revisado y trasladado por Claude a `apps/biblioteca` en este repo.

**Hecho**
- Servicio Node/TypeScript en `127.0.0.1` con SQLite (`node:sqlite`) y migraciones versionadas; `GET /salud` con versión. Una sola dependencia real (`fflate`, para ZIP).
- Alta de archivo o ZIP todo-o-nada (carpeta temporal → transacción → destino); verificado que un fallo a mitad no deja huérfanos.
- Miniatura en el orden pedido: imagen subida → la del ZIP → captura propia de SVG/DXF (sin dependencias nativas).
- Importación masiva sin mover ni modificar el origen; duplicados por `sha256` con informe; probada con 200+ archivos.
- Dos espacios: `original` (solo lectura, verificado en disco y API) y `trabajo` (siempre enlazado a su original).
- `vendible_digital` en falso por defecto; solo se activa con licencia `propia` o `comercial_ok` (verificado).
- Búsqueda por palabra clave (FTS5) en menos de 1 segundo con 5 000 activos.
- Interfaz web local es/en (zh parcial); llave `X-Cubo-Key` local; `.env.example` y `marca.json.example` sin datos reales.
- 41 pruebas automáticas + typecheck, y pruebas de higiene propias (sin rutas de usuario, sin secretos).

**Verificación independiente (Claude, fuera de lo que reportó arena.ai):**
levanté el servicio de verdad y probé a mano: alta con licencia propia + activar `vendible_digital` (200), alta con licencia desconocida + intentar activarlo (400, rechazado), editar `espacio` de un original por API (409, rechazado), crear un trabajo enlazado, descargar un archivo, importar una carpeta con duplicado (detectado, origen intacto), y acceso sin llave (401). Todo se comportó como en las notas de entrega.

**No hecho (según el brief, pasa a fases siguientes)**
- Búsqueda de imagen en la web.
- Captura automática de PDF/STL/3MF y de DXF con bloques o binario (fichas sin miniatura si no hay imagen aportada).
- Sugerencias de categoría por IA, ventas, catálogo, conexión con Cubo Manager, nube, autenticación de usuarios.

**Cambios de contrato aceptados en `ARQUITECTURA.md`:**
se agregó `subida` como valor de `origen_imagen`, y se documentó que `GET /activos` pagina con `limite`/`offset`. El precio queda en Cubo Manager, no en la Biblioteca, como ya estaba definido.

**Siguiente:** E2 — ejecutar Cubo Manager y confirmar qué módulo `.js`/`.jsx` se carga; conectarlo a esta Biblioteca real (hoy consulta una API que no existe); corregir contraseña y recuperación por correo (ver `DEUDA_TECNICA.md`).

---

## E0 — Orden · 21 de septiembre de 2026

**Hecho**
- Revisión completa de los 10 repos de la cuenta, de las fichas técnicas de Drive, del plan maestro del Taller, del documento de la Wallet y de MyLaserTools.
- Creación de dos repos **privados**: `cubo-ecosistema` (principal) y `cubo-arena` (espacio de arena.ai).
- Estructura del monorepo: `apps/` (cubo-manager, catalogo-web, biblioteca, taller), `services/wallet/`, `docs/`, `incoming/`.
- Copias limpias de Cubo Manager y del Catálogo Digital (sin `build/`, archivos `.bak`, instalador de Node, base de datos ni `desktop.ini`).
- Landing existente descomprimida en `incoming/pagina-web/` para integrarse al Catálogo.
- Documentos: `REPORTE_EJECUTIVO.md`, `ARQUITECTURA.md`, `AGENTS.md`, `FASE_E1_BIBLIOTECA.md`, `DEUDA_TECNICA.md`, esta bitácora.
- Los repos antiguos **no se modificaron**.

**No hecho (pasa a E2)**
- Ejecutar Cubo Manager y confirmar qué módulos se ven (duplicados `.js`/`.jsx`).
- Corregir contraseña en texto plano y recuperación simulada.
- Cerrar `/api/upload-image` y actualizar dependencias del Catálogo.
- Importar la Wallet (hoy solo en la PC del dueño) sin secretos.

**Decisiones**
- Biblioteca desde cero y primero; monorepo principal; arena.ai construye aparte y Claude ordena aquí; Wallet como IA del ecosistema; Hermes independiente vía API; página web y catálogo en un solo proyecto. Detalle en el reporte, sección 9.

**Siguiente:** entregar `cubo-arena` a arena.ai con el brief de E1.
