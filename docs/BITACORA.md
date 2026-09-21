# Bitácora del ecosistema

Registro de lo que se ha hecho y lo que sigue. **Se actualiza al cerrar cada fase** (una entrada nueva arriba de las anteriores). Formato de cada entrada: qué se hizo, qué no se hizo, decisiones, y qué sigue.

---

## Estado actual

- **Fase cerrada:** E1 — Biblioteca v1.
- **Siguiente:** E2 — verificar Cubo Manager y conectarlo a la Biblioteca (deuda técnica en `docs/DEUDA_TECNICA.md`).
- **Bloqueos:** ninguno. Preguntas abiertas en el reporte ejecutivo (sección 10).

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
