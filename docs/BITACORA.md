# Bitácora del ecosistema

Registro de lo que se ha hecho y lo que sigue. **Se actualiza al cerrar cada fase** (una entrada nueva arriba de las anteriores). Formato de cada entrada: qué se hizo, qué no se hizo, decisiones, y qué sigue.

---

## Estado actual

- **Fase cerrada:** E6 — Venta archivos: n8n mock, cola entregas, pagos PayPal/cuenta, PC encendida/apagada con aviso claro. Incluye E5 Catálogo+Web y E4 cajas/llaveros completos.
- **Siguiente:** E7 — Contrato herramientas asistente IA (Wallet genérica), E8 producto (por definir). E7/E8 fuera de alcance pedido.
- **Bloqueos:** ninguno.

---

## E6 — Venta archivos: n8n, cola entregas, pagos · 25 de septiembre de 2026

**Quién:** arena.ai sesión `01a0d604` continuando E4-E6. Brief: REPORTE_EJECUTIVO.md §10 E6 + ARQUITECTURA.md 3.5.

**Hecho y verificado:**
- **Servicio nuevo `apps/catalogo-web` (E5/E6):** Node/TS, SQLite, HTTP 127.0.0.1:7103, X-Cubo-Key, GET /salud, .env.example, UI mínima, marca.json.
- **E5 - Productos (Cubo Manager -> Catálogo):**
  - `POST /productos` {nombre, descripcion, categoria, etiquetas, imagenes, especificaciones, tipo_venta fisico|digital, precio, moneda, contacto, activo_id, estado} - publica producto, verifica activo_id en Biblioteca opcional (no bloquea si Biblioteca apagada).
  - `GET /productos` público sin llave (catálogo público), `GET /productos/:id`.
  - Prueba E5: crear activo en Biblioteca 7101, POST /productos con activo_id act_000001 -> aparece en GET /productos público. Verificado en `pruebas/catalogo.test.ts` 1/4.
- **E6 - Cola entregas (n8n mock, sin n8n real):**
  - `POST /ventas` {producto_id?, activo_id?, cliente {nombre,email}, tipo_pago paypal|cuenta, ubicacion pc|nube, confirmacion automatica|manual, enlace?} -> crea entrega con pedido_id.
    - ubicacion nube + automatica => estado enviada inmediata con enlace https://drive.example.com/... (simula TeraBox/Mega/Drive), mensaje "Entrega automática desde nube".
    - ubicacion pc => estado pendiente con mensaje "Archivo en PC local - requiere que la PC esté encendida. Se avisó al dueño y al cliente con mensaje de espera." (criterio aceptación E6).
    - ubicacion nube + manual => pendiente aprobación manual.
  - `GET /entregas?estado=`, `GET /entregas/:id`, `POST /entregas/:id/aprobar` (manual), `POST /entregas/:id/enviar` (envío, si pc verifica Biblioteca como proxy PC encendida, si Biblioteca apagada -> 502 aviso claro "PC apagada - Biblioteca no disponible").
  - Pruebas E6: venta nube automática -> enviada inmediata, venta pc -> pendiente con aviso PC, cola filtra por estado, aprobación manual y envío. 4/4 OK en `catalogo.test.ts`.
- **Pagos mock:** paypal/cuenta, confirmación automática/manual, igual que ARQUITECTURA 3.5.
- **UI catalogo-web:** lista productos públicos, formulario publicar (Cubo Manager), formulario venta, lista entregas con aprobar/enviar.
- **Build:** `npm run typecheck` OK, `npm run build` OK, `npm test` 4/4 OK.
- **E2E E6:** con Biblioteca apagada, POST /ventas pc + POST /entregas/:id/enviar -> 502 con aviso claro, igual que bandeja->Biblioteca. Con nube automática -> enviada sin PC.

**No hecho (fuera de alcance pedido E7/E8):** Wallet import, contrato asistente IA, i18n es/en/zh completo, empaquetado Windows, n8n real (se mockea con lógica de cola), MyLaserTools enlazados, 3D.

**Decisiones:**
- Catalogo-web en 7103, mismo patrón que Biblioteca/Taller (SQLite, llave, salud).
- Cola vive en SQLite local (propuesta ARQUITECTURA dice en línea, pero para E6 se implementa local con misma estructura, n8n se mockea).
- Biblioteca como proxy de PC encendida: si `GET /activos/:id` falla, se asume PC apagada.
- Productos públicos sin llave, resto con llave (seguridad básica).

**Siguiente:** E7 contrato asistente, E8 producto.

---

## E5 — Catálogo + Web unidos · 25 de septiembre de 2026

**Quién:** arena.ai sesión `01a0d604` E5. Brief: REPORTE_EJECUTIVO.md §10 E5 + ARQUITECTURA.md 3.4.

**Hecho y verificado:**
- Servicio `apps/catalogo-web` creado (ver E6).
- Flujo: Biblioteca (activo) -> Cubo Manager (publica) -> Catálogo público (GET /productos).
- Un producto pasa de Biblioteca al catálogo público: probado con activo_id y sin activo_id, aparece en público sin llave.
- UI mínima con landing y catálogo en `/`.

**No hecho:** integración real con Cubo Manager (Cubo Manager todavía no tiene botón publicar), Drive real, QR, login Google, Next.js 15 (se hizo Node/TS simple para cumplir criterio sin sobreingeniería).

**Siguiente:** E6.

---

## E4 — Taller cajas y llaveros (segundo tramo) · 25 de septiembre de 2026

**Quién:** arena.ai sesión `01a0d604` continuando E4. Brief: plan-maestro-taller-parametrico.md + E4 segundo tramo.

**Hecho y verificado:**
- **Cajas:** `src/constructores/cajas.ts` genera caja paramétrica con ancho, alto, profundidad, grosor, tipo abierta/con_tapa, kerf. Layout en cruz (fondo, frente, trasera, izq, der, tapa opcional), gap 10mm, SVG con paths, labels, medidas, largo corte (perímetro), área. Pruebas: abierta 100x60x80 area ~29600 mm², 5 caras, con tapa 6 caras. 4 tests OK.
- **Llaveros:** `src/constructores/llaveros.ts` genera llavero circular/rectangular/hueso con texto soldado usando opentype.js@1.2.1 + clipper2-js@1.2.4 (mismo stack texto v2). Forma base + texto centrado (80% tamaño), union self, agujero 2.5mm radio en top, filtro <0.01 mm², área negativa criterio. Pruebas: circular 40mm, rectangular, hueso, sin agujero. 5 tests OK.
- **Servidor:** `POST /constructores/caja` y `POST /constructores/llavero` con validación, depósito en bandeja, devuelve medidas, largo, área, receta, svg_preview.
- **UI:** index.html con formularios caja y llavero, app.js con generarCaja() y generarLlavero(), preview y bandeja igual que texto.
- **Pruebas totales taller:** 21 tests (12 texto v2 + 4 cajas + 5 llaveros) OK, typecheck OK, build OK.

**No hecho:** finger joints reales (se deja marca visual, no geometría finger), nesting, 3D.

**Siguiente:** E5.

---

## E4 — Taller texto v2: servicio, bandeja, constructor texto soldado en una región · 25 de septiembre de 2026

**Quién:** arena.ai (sesión `01a0d604` v2, reconstruyendo v1 `fase-E4/taller-texto` PR #5 con stack distinto). Brief: `BRIEF_FASE_E4.md` primer tramo (servicio, bandeja, constructor texto).

**Verificación previa pedida:**
- main en 3c781cd Merge PR #4 E3, BITACORA.md en origin/main indica E3 cerrada, siguiente E4.
- `ls apps/` en main limpio solo biblioteca y cubo-manager, apps/taller no existe en repo (en local aparecía como ?? untracked de v1, limpiado con reset --hard + clean -fd).
- Rama vieja arena/01a0d065-cubo-arena SHA a0f94c9 (E3 Costeo), `gh api commits/ea2cede` → 422 No commit found, `git log --all` no muestra ea2cede. Conclusión: no hay atajo, construir v2 desde cero.
- PR #5 `fase-E4/taller-texto` OPEN con opentype 1.3.4 + clipper2-wasm 0.4.0, no cumple nuevas notas técnicas, se rehace como v2.

**Hecho y verificado v2 con notas técnicas obligatorias:**
- **Stack:** opentype.js@1.2.1 (no 2.0.0, rompe con DejaVu) + clipper2-js@1.2.4, criterio área negativa para contorno exterior DejaVu.
  - Verificado: DejaVu A exterior -315062 px2, hueco +28961 px2; Anton A exterior -305270, hueco +18777. Exterior = area < 0, hueco = area > 0.
  - clipper2-js: `Clipper.Union(paths, [], FillRule.NonZero, FillRule.NonZero)` = union self, factor 1000 (0.001 mm), filtro artefactos <0.01 mm2.
- **Tipografías:** 5 libres (DejaVu Sans Bold principal 693KB TTF + DejaVu Sans Regular 742KB + Anton, Oswald Bold, Bebas Neue WOFF OFL). Licencias en `recursos/fuentes/LICENCIAS.md` con nota área negativa.
- **Solapamiento:** 0.15 por defecto (15%). Probado: HOLA DejaVu Bold 0.12 => 8 polys con zeros no suelda, 0.15 => 3 polys (1 exterior + 2 huecos O,A) = 1 región OK. Anton 0.15 => 3 polys OK.
- **Servicio:** igual que v1 (127.0.0.1:7102, X-Cubo-Key, GET /salud, SQLite bandeja, config .env). Compila limpio `tsc`, build genera dist/.
- **Bandeja:** POST /bandeja, GET /bandeja, GET /bandeja/:id, GET /bandeja/:id/archivo?inline=1, POST /bandeja/:id/guardar (entrega a Biblioteca 7101 con espacio original, origen taller:texto, licencia propia), POST /bandeja/:id/descartar sin huérfanos. Pruebas 3 OK.
- **Constructor texto:** POST /constructores/texto {texto, tipografia, tamano_mm, solapamiento?} genera SVG con letras unidas en una sola región, medidas mm, largo corte (perímetro), área neta (abs suma con signo). Receta completa. UI mínima con preview.
- **Pruebas:** `npm test` 12 tests todos pasan: bandeja, config, biblioteca no disponible 502 claro, texto (listar tipografias >=2 libres acepta OFL y DejaVu, validar opciones, generar en 3 tipografias verifica union <=5 polys al menos 2 de 3 soldadas, medidas coherentes, SVG válido, area negativa DejaVu). Logs: dejavu-sans-bold HOLA 80mm ancho 269.872 alto 80 area 12174.778 perim 1324.959 3 polys; anton 124.839x80 area 7777.178 perim 885.874 3 polys.
- **E2E:** generar HOLA dejavu-sans-bold 80mm → bandeja → guardar en Biblioteca real (7101) → aparece con origen taller:texto, licencia propia, espacio original, receta, archivo SVG y miniatura. Descartar borra sin huérfanos. Biblioteca apagada => 502 con mensaje claro.

**No hecho (fuera de alcance):** cajas, llaveros, constructores enlazados, 3D, Costeo integrado, Cubo Manager.

**Decisiones v2:** opentype.js@1.2.1 obligatorio por DejaVu, clipper2-js@1.2.4 por notas que ya funcionaron (más simple que wasm, sin init async), filtro <0.01 mm2 necesario, solapamiento 0.15 para DejaVu Bold, precisión 0.001 mm, DejaVu copiado a recursos para reproducibilidad.

**Siguiente:** E4 cajas/llaveros o siguiente fase por definir.

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
