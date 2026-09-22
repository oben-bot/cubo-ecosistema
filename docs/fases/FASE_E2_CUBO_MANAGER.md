# Fase E2 — Cubo Manager: conectar a la Biblioteca real y corregir seguridad básica

**Para:** arena.ai · **Revisa y ordena:** Claude · **Lee antes:** `AGENTS.md`, `docs/REPORTE_EJECUTIVO.md` (secciones 0 y 4.1), `docs/ARQUITECTURA.md` (3.1, 3.2), `docs/DEUDA_TECNICA.md` (bloque "Cubo Manager").

**Importante — trae lo último:** este repo cambió desde tu última sesión (se fusionó la fase E1). Antes de escribir código, actualiza `main` y confirma que ves la carpeta `apps/biblioteca` con su `README.md`: ahí está el servicio real contra el que vas a conectar Cubo Manager. No lo reconstruyas ni lo modifiques; solo lo consumes por su API.

**Trabajo en paralelo, fuera de tu alcance:** el dueño del proyecto va a correr Cubo Manager en su propia PC (Windows) para confirmar cuál de los módulos duplicados `.js`/`.jsx` se está cargando de verdad. Tu tarea 1 de abajo no depende de ese resultado: puedes resolverla por análisis estático, como se explica ahí. No esperes esa confirmación para empezar.

## Objetivo
Que Cubo Manager (`apps/cubo-manager`) deje de tener módulos duplicados, hable con la Biblioteca real en vez de una API que no existe, y no guarde contraseñas en texto plano ni finja enviar correos de recuperación.

## Dentro del alcance

### 1. Resolver los módulos duplicados `.js`/`.jsx`
Afecta a: Finanzas, Biblioteca, Producción, Cotizaciones y Almacén (`src/modules/...`).
- Determina por análisis estático cuál versión carga React Scripts realmente: revisa cómo se importa cada módulo (con o sin extensión) y el orden de resolución de extensiones de `react-scripts` (resuelve `.js` antes que `.jsx` cuando el import no lleva extensión). Documenta tu conclusión módulo por módulo en las notas de entrega.
- Compara ambas versiones de cada par: quédate con la más completa y funcional (probablemente la `.jsx`, pero verifícalo, no lo asumas).
- Elimina la que sobra. Si hay una diferencia de funcionalidad real entre ambas que valga la pena conservar, dilo en las notas en vez de perderla en silencio.
- Deja un único archivo por módulo, con extensión consistente en todo el proyecto.

### 2. Conectar el puente de la Biblioteca
El código actual (`bibliotecaBridge.js` o equivalente) consulta una API que no corresponde a nada real y lanza un ejecutable con una ruta de usuario escrita a mano. Reemplázalo por un cliente HTTP simple contra el servicio real:
- Base URL y llave (`X-Cubo-Key`) configurables por `.env`, nunca escritas a mano.
- Usa el contrato ya definido en `ARQUITECTURA.md` 3.2 (`GET /activos`, `GET /activos/:id`, `GET /activos/:id/archivo`).
- El módulo "Biblioteca" de Cubo Manager (una vez resuelto el duplicado del punto 1) debe: buscar por palabra clave, mostrar la ficha de un activo con sus especificaciones (material, medidas) y su imagen, y abrir/descargar su archivo.
- Si el servicio de la Biblioteca no está corriendo, la pantalla debe avisarlo con claridad, no fallar en silencio ni con un error críptico.

### 3. Contraseña con hash
- Sustituye la comparación en texto plano por `scrypt` (ya disponible en Node, sin dependencias nuevas) con sal aleatoria por usuario.
- Migra cualquier dato de ejemplo existente; no dejes una ruta que siga aceptando texto plano.

### 4. Recuperación por correo: hazla real o quítala, nunca la simules
Hoy la pantalla dice "se ha enviado un enlace" sin enviar nada. Dos caminos, tú eliges el más simple y lo justificas en las notas:
- **A) Desactivarla de verdad:** quita el botón/flujo y dilo claramente en la interfaz ("por ahora, contacta al administrador"), o
- **B) Implementarla real** con una librería SMTP simple y variables de entorno para las credenciales (sin credenciales reales en el repo).
No dejes un mensaje de éxito falso en ningún caso.

### 5. Endurecer los canales IPC
Los canales genéricos `database:query/run/get` y `fs:*` quedan expuestos al frontend tal cual. Reemplázalos por canales específicos, uno por operación real que usa la interfaz (por ejemplo `finanzas:listarMovimientos`, no `database:query` con SQL libre desde el renderer).

## Fuera del alcance (no lo hagas)
Pantalla de Costeo (es la fase E3); Marketing; Taller; Catálogo; actualizar Electron/`react-scripts` a versiones mayores (solo corrige lo de este brief); traducciones es/en/zh (es la fase E8, aunque si ves textos fáciles de mover a claves sin esfuerzo extra, hazlo).

## Criterios de aceptación
- [ ] Un solo archivo por módulo (Finanzas, Biblioteca, Producción, Cotizaciones, Almacén), sin duplicados, con la decisión de cuál se conservó documentada y justificada.
- [ ] El módulo Biblioteca de Cubo Manager busca, muestra ficha con imagen y especificaciones, y descarga el archivo, todo contra el servicio real de `apps/biblioteca` corriendo en local (instrucciones de cómo levantarlo para probar, en tu README o notas).
- [ ] Si el servicio de la Biblioteca está apagado, la interfaz lo indica con un mensaje claro, sin caerse.
- [ ] Ninguna contraseña se guarda ni se compara en texto plano (probado con una prueba automática).
- [ ] La recuperación por correo, o bien envía un correo real y verificable en pruebas (con un servidor SMTP de prueba), o bien está removida y la interfaz no promete algo que no hace.
- [ ] Cero rutas de usuario o nombres de taller escritos a mano (prueba de higiene tipo la de `apps/biblioteca/pruebas/higiene.test.ts` es buena referencia).
- [ ] Los canales IPC expuestos son específicos, no genéricos; no hay forma de mandar SQL o rutas de archivo arbitrarias desde el renderer.
- [ ] Pruebas automáticas para lo nuevo (hash de contraseña, cliente de la Biblioteca) y `README.md` con pasos para probar todo, incluida la puesta en marcha del servicio de la Biblioteca.
- [ ] Sin secretos, credenciales SMTP reales, ni bases de datos con datos reales en el repo.

## Entrega
Rama `fase-E2/cubo-manager` → PR con notas de entrega (hecho / no hecho / decisiones / dudas, especialmente tu conclusión sobre `.js` vs `.jsx` en cada módulo) y entrada en `docs/BITACORA.md`.
