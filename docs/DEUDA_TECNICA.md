# Deuda técnica conocida (a resolver en E2 salvo que se indique)

Hallazgos de la revisión del 21 de septiembre de 2026. Marcar como resuelto al cerrar, con fecha.

## Cubo Manager (`apps/cubo-manager`) — cerrado en fase E2 (22 de septiembre de 2026)
- [x] **Módulos duplicados `.js`/`.jsx`:** resuelto. Confirmado por análisis estático (CRA resuelve `.js` antes que `.jsx` sin extensión) que las versiones `.js` eran las viejas; eliminadas las 5 (Finanzas, Biblioteca, Producción, Cotizaciones, Almacén). La de Biblioteca lanzaba la app de Python descartada con ruta `C:\Users\HP\...`. Bono: bundle un 40% más liviano (129 KB → 78 KB gzip).
- [x] **Contraseña en texto plano:** resuelto. Hash con `scrypt` + sal, comparación en tiempo constante (`src/core/auth.js`), probado con 8 casos reales contra SQLite.
- [x] **Recuperación por correo simulada:** resuelto (opción A del brief E2). Mensaje honesto ("contacta al administrador"), sin fingir un envío.
- [x] **Canales IPC genéricos** (`database:query/run/get`, `fs:*`): eliminados. Reemplazados por `clientes:*`, `inventario:getProductosTerminados`, `config:getFondoModulo/setFondo`; los 6 archivos del frontend que los usaban quedaron migrados y probados.
- [x] **Puente con la Biblioteca:** resuelto. `bibliotecaBridge.js` es ahora un cliente HTTP real contra `apps/biblioteca` (contrato 3.2), probado de extremo a extremo (estado, búsqueda, ficha, imagen, servicio caído).
- [x] **`config.js`:** ruta de usuario escrita a mano eliminada junto con el bloque `miniApps` (ya no aplica).
- [ ] **Idioma:** solo se guarda la preferencia; sin traducciones. Sigue pendiente (E8).
- [ ] **Costeo sin pantalla** (backend completo). Siguiente: fase E3.
- [ ] **Marketing sin ruta** y con envíos simulados (WordPress, WhatsApp, Gumroad). Pendiente.
- [ ] **Asistente local por palabras clave**, no usa IA; el README dice que integra Hermes. Corregir README o integrar (E7, con Hermes fuera por ahora).
- [ ] **Dependencias:** 76 vulnerabilidades (4 críticas); Electron 26 y `react-scripts` obsoletos. No tocado en E2 (fuera del alcance del brief).
- [ ] **Datos de ejemplo (mock)** mezclados con código; separar.
- [ ] Confirmar que la app crea sola su base de datos vacía al arrancar (no se probó con Electron real, sin display en este entorno).

## Catálogo Digital (`apps/catalogo-web`)
- [ ] **`/api/upload-image` (Cloudinary) sin autenticación.** Cerrar o eliminar (ya hay subida a Drive).
- [ ] **Next.js 15.4.6** con 2 vulnerabilidades críticas: actualizar.
- [ ] **`xlsx`** con vulnerabilidad alta sin corrección: reemplazar por otra librería.
- [ ] README desactualizado (dice localStorage); falta `.env.example`.
- [ ] Probar el login real con Google y el modo Drive.
- [ ] Integrar la landing de `incoming/pagina-web/` (inicio en `/`, catálogo en `/catalogo`).
- [ ] Crear el endpoint por el que Cubo Manager publica productos.

## Wallet (`services/wallet`)
- [ ] Importar el código desde la PC del dueño **sin tokens**; los tokens solo por `.env`.
- [ ] Cambiar la llave maestra de fábrica.
- [ ] Validador automático de proveedores nuevos.

## Repos antiguos (cuenta `oben-bot`)
- [ ] Decidir cuándo archivar o volver privados `app-cubo-madera` y `oben-bot` (hoy son públicos), una vez migrado todo aquí.
- [ ] Repos sin relación con el proyecto: `studio`, dos plantillas de Netlify, `Jarvis`, `Kody-releases`, `mi-app-autoflowAI` (vacíos).
- [ ] Revocar el token de administrador usado en la revisión.

## Catálogo+Web (`apps/catalogo-web`) — E5/E6
- [ ] Variables de entorno con prefijo `CATALOGO_` (`CATALOGO_BIBLIOTECA_URL`, `CATALOGO_BIBLIOTECA_LLAVE`), a diferencia de Biblioteca/Taller/Cubo Manager que usan `BIBLIOTECA_URL`/`BIBLIOTECA_KEY` sin prefijo. No es un bug, pero conviene unificar la convención antes de E8 (empaquetado), para que instalar el ecosistema completo no confunda.
- [ ] n8n no está conectado de verdad: hoy `POST /ventas` recibe la confirmación directo (quien llame decide `confirmacion`); falta el flujo real de pago (PayPal/cuenta) y los avisos por WhatsApp/correo.
- [ ] El enlace de descarga para archivos en la nube es de ejemplo (`drive.example.com`); falta conectar la nube real del dueño (TeraBox/Mega/Drive).
- [ ] Confirmar el modo Google Drive real para el estado publicado del catálogo (hoy usa su base local).
