# Bitácora del ecosistema

Registro de lo que se ha hecho y lo que sigue. **Se actualiza al cerrar cada fase** (una entrada nueva arriba de las anteriores). Formato de cada entrada: qué se hizo, qué no se hizo, decisiones, y qué sigue.

---

## Estado actual

- **Fase cerrada:** E3 — Costeo completo, pantalla funcional sobre backend existente.
- **Siguiente:** E4 — integrar calculadora dentro de Cotizaciones (según REPORTE_EJECUTIVO.md 4.2) o Marketing (por definir).
- **Bloqueos:** ninguno. Preguntas abiertas en el reporte ejecutivo (sección 10).

---

## E3 — Costeo: pantalla completa sobre backend existente · 23 de septiembre de 2026

**Quién:** arena.ai (sesión `01a0d065` reconstruyendo trabajo de sesión `01a0c609` que quedó sin publicar por red). Brief: `BRIEF_FASE_E3.md`.

**Hecho y verificado:**

- **Punto 0 — preload.js:** agregado bloque `costeo` con 12 métodos exactos (`getConfigMaquina`, `saveConfigMaquina`, `getMateriales`, `saveMaterial`, `deleteMaterial`, `getInsumos`, `saveInsumo`, `deleteInsumo`, `addConsumo`, `getConsumo`, `saveTiempos`, `calcularCosto`) llamando a los canales IPC del mismo nombre. Verificado que los 10 handlers ya existían en `ipcHandlers.js`.

- **Backend — corrección mínima necesaria:** `saveTiempos` hacía INSERT acumulativo, lo que provocaba que recalcular sumara minutos duplicados. Se cambió a DELETE previo + INSERT para hacerlo idempotente. No se tocó `calcularCosto` (motor de cálculo intacto: amortización + desgaste láser/ópticas/filtros + electricidad + supervisión + mano de obra).

- **Módulo `src/modules/Costeo/CosteoMain.jsx`:**
  - **Configuración máquina:** formulario con todos los campos de `configuracion_maquina` (costo adquisición, amortización meses, costo/vida láser, ópticas, filtros, tarifa supervisión, tarifa mano obra, watts, costo kWh, moneda). Carga con `getConfigMaquina`, guarda con `saveConfigMaquina`, persiste al recargar. Mensaje de éxito.
  - **Catálogo materiales:** lista desde `getMateriales`, alta/edición/baja lógica contra `saveMaterial`/`deleteMaterial`. Campos: nombre, tipo, precio plancha, ancho/alto cm. Muestra costo por cm² calculado en UI para verificación manual. Baja lógica (activo=0) verificada.
  - **Catálogo insumos:** igual contra `getInsumos`/`saveInsumo`/`deleteInsumo`. Campos: nombre, costo unitario, unidad.
  - **Calculadora (corazón):** 
    - Usa `referencia_tipo='calculo_libre'` con `referencia_id=Date.now()` generado localmente, independiente de cotizaciones, como pide el brief.
    - Agregar líneas: selector material + área cm² o insumo + cantidad → `addConsumo`. Backend calcula costo de línea. Lista de consumos desde `getConsumo` con nombres resueltos desde catálogos locales.
    - Tiempos: inputs minutos láser y mano de obra → `saveTiempos`.
    - Botón Calcular → `calcularCosto` y muestra desglose completo: material, desgaste máquina, electricidad, supervisión, mano obra, total, con moneda configurada. Formateo con 2 decimales y coherencia verificada a mano.
    - Si `getConfigMaquina` vacío → aviso claro en amarillo en vez de número engañoso (criterio de aceptación).
    - Botón "Nuevo cálculo" genera nuevo `referencia_id` y limpia estado, sin dejar basura en UI (filas viejas quedan en DB como histórico de cálculo libre, sin impacto).
  - **Ruta `/costeo`:** registrada en `App.jsx`, accesible desde `ModuleHub` (Dashboard) con ícono 🧮 y glow `#fbbf24`, y desde `LayoutSidebar`.
  - **Estilos:** `CosteoMain.css` con grid responsive, tabs, tablas, modales, cards de resultado (total destacado en amarillo), warnings y errores.

- **Compilación:** `npx react-scripts build` compila limpio (82.57 kB gzip main.js + 8.11 kB css), probado con `npm install --ignore-scripts` por fallo de sharp en sandbox (cert). Bundle similar a E2 (78 kB) + nuevo módulo.

- **Sin datos reales, sin rutas de usuario, sin secretos, sin tocar otros módulos salvo Dashboard/Sidebar para ruta.**

**No hecho (correctamente fuera de alcance):**
- Integrar calculadora dentro de `CotizacionesMain.jsx` (fase aparte).
- Cambiar motor de cálculo de `calcularCosto`.
- Alertas de stock del almacén.
- Traducciones es/en/zh.
- Tocar cualquier otro módulo.

**Decisiones:**
- Idempotencia en `saveTiempos` (DELETE antes de INSERT) considerada estrictamente necesaria para que la calculadora sea usable (recalcular no duplica). Documentado aquí como propuesta de cambio de contrato menor, sin alterar cálculo.
- Calculadora siempre con `calculo_libre` + timestamp, no requiere cotización existente. Nuevo cálculo = nuevo ID.
- Formato moneda viene de config, con fallback a `$`.

**Dudas:** ninguna bloqueante. ¿Se quiere que `trabajo_materiales` tenga borrado físico de líneas de un cálculo libre? Hoy solo se crea nuevo ID en "Nuevo cálculo", dejando histórico huérfano pero inofensivo. Si se quiere limpieza, agregar handler `deleteConsumo` o `clearConsumo` en fase futura.

**Siguiente:** E4 — integrar Costeo en Cotizaciones o definir siguiente fase según REPORTE_EJECUTIVO.

---

## E2 — Cubo Manager: Biblioteca real y seguridad básica · 22 de septiembre de 2026

**Quién:** trabajo conjunto. Una sesión de Claude Code (`claude/e2-biblioteca-y-auth` en `cubo-arena`) resolvió los duplicados `.js`/`.jsx`, conectó el puente de la Biblioteca y arregló contraseña/recuperación. Claude (esta sesión) verificó todo de extremo a extremo, corrigió dos detalles menores, y completó el endurecimiento de canales IPC que había quedado pendiente. arena.ai no llegó a tomar esta fase (se acabaron los créditos antes de empezarla).

**Hecho y verificado uno por uno (no solo leído):**
- **Duplicados `.js`/`.jsx` resueltos**: Finanzas, Biblioteca, Producción, Cotizaciones, Almacén. Confirmado por análisis estático que `.js` era la versión que cargaba (CRA resuelve `.js` antes que `.jsx` sin extensión) y que eran las viejas; en Biblioteca, la vieja lanzaba la app de Python ya descartada con ruta de usuario escrita a mano. Bundle final un 40% más liviano (129 KB → 78 KB gzip).
- **Biblioteca conectada de verdad**: `bibliotecaBridge.js` reescrito como cliente HTTP contra `apps/biblioteca` (contrato `ARQUITECTURA.md` 3.2). Probado en vivo contra el servicio real: estado, búsqueda, ficha con material/medidas/licencia, imagen en base64, y mensaje claro cuando el servicio está apagado.
- **Contraseña con hash real**: `scrypt` + sal, comparación en tiempo constante (`src/core/auth.js`). Probados 8 casos contra SQLite real (crear, verificar correcta/incorrecta/correo malo, cambiar con actual mala/buena, verificar con la nueva y con la vieja).
- **Recuperación por correo desactivada honestamente** (opción A del brief): ya no dice "enlace enviado" sin enviar nada.
- **Canales IPC genéricos eliminados**: `database:query/run/get` y `fs:*` fuera; reemplazados por `clientes:getAll/create/update/delete`, `inventario:getProductosTerminados`, `config:getFondoModulo/setFondo`. Los 6 archivos del frontend que los usaban (Clientes, Ventas, Marketing, Producción, Cotizaciones, Ajustes) migrados y probados contra SQLite real.
- **`config.js`**: eliminado el bloque `miniApps` con la ruta de Windows escrita a mano.
- **Corregido de paso**: el cambio de contraseña en Ajustes no validaba la contraseña actual; ahora sí.
- La app **compila limpia** con `react-scripts build` (el compilador real), no solo con revisión de sintaxis.

**Verificación independiente de Claude, además de lo anterior:** clonó la rama de Claude Code desde GitHub (no confió en el resumen), corrió `node --check` en todo el JS, compiló toda la app con `react-scripts build` dos veces (antes y después del endurecimiento de IPC), instaló las dependencias reales (`sqlite3`, `electron`, `react`) y ejecutó `auth.js` y los nuevos handlers contra una base SQLite real, y probó el bridge de la Biblioteca contra el servicio real levantado como proceso. Encontró y corrigió: un `eslint-disable` que rompía el build (regresión real, confirmada comparando contra `main`), falta de `.env.example`, y dos archivos huérfanos (`StockMaterial.js`, `GestionPrecios.js`) que quedaron sin usar tras borrar el módulo viejo de Almacén.

**Nota curiosa:** el `auth.js` escrito por la sesión de Claude Code resultó idéntico, byte por byte, al que Claude (esta sesión) estaba escribiendo en paralelo de forma independiente, sin que ninguno tuviera acceso al trabajo del otro.

**No hecho (correctamente fuera del alcance de este brief):** pantalla de Costeo, ruta de Marketing, traducciones es/en/zh, actualizar Electron/`react-scripts` a versiones mayores.

**Siguiente:** E3 — construir la pantalla de Costeo sobre el backend que ya existe completo.

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
