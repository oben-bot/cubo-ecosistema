# Deuda técnica conocida (a resolver en E2 salvo que se indique)

Hallazgos de la revisión del 21 de septiembre de 2026. Marcar como resuelto al cerrar, con fecha.

## Cubo Manager (`apps/cubo-manager`)
- [ ] **Módulos duplicados `.js`/`.jsx`:** Finanzas, Biblioteca, Producción, Cotizaciones y Almacén. Create React App resuelve `.js` antes que `.jsx`; probablemente se muestran las versiones viejas. Ejecutar la app, confirmar cuál se carga, conservar la vigente y eliminar la otra.
- [ ] **Contraseña en texto plano** (`Settings` y `LoginScreen`). Usar hash (argon2 o scrypt) con sal.
- [ ] **Recuperación por correo simulada:** muestra "enlace enviado" sin enviar nada. Implementar de verdad o desactivar y no mostrar el mensaje.
- [ ] **Idioma:** solo se guarda la preferencia; no hay traducciones. Implementar es/en/zh (E8).
- [ ] **Canales IPC genéricos** (`database:query/run/get`, `fs:*`) expuestos al frontend. Reemplazar por canales específicos.
- [ ] **Costeo sin pantalla** (backend completo). Construir la interfaz (E3).
- [ ] **Marketing sin ruta** y con envíos simulados (WordPress, WhatsApp, Gumroad). Conectar de verdad o retirar.
- [ ] **Asistente local por palabras clave**, no usa IA; el README dice que integra Hermes. Corregir README o integrar (E7).
- [ ] **`config.js`:** ruta de usuario escrita a mano (`C:\Users\HP\...`), nombre de taller fijo y lista de archivos `.db` que no corresponde a la realidad.
- [ ] **Puente con la Biblioteca:** consulta `/api/disenos` o escanea carpetas y lanza un ejecutable con ruta fija. Reescribir contra la API nueva de la Biblioteca (E2).
- [ ] **Dependencias:** 76 vulnerabilidades (4 críticas); Electron 26 y `react-scripts` obsoletos.
- [ ] **Datos de ejemplo (mock)** mezclados con código; separar.
- [ ] Base de datos vacía de plantilla eliminada del repo; confirmar que la app la crea sola al arrancar.

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
