# Fase E4 — Taller Paramétrico: servicio, bandeja y primer constructor (texto)

**Para:** arena.ai · **Revisa y ordena:** Claude · **Lee antes:** `AGENTS.md`, `docs/REPORTE_EJECUTIVO.md` (sección 4.3), `docs/ARQUITECTURA.md` (3.3, recién corregida), `docs/origen/plan-maestro-taller-parametrico.md` (fuente de las decisiones técnicas de abajo).

**Contexto importante — un contrato que corregimos:** `ARQUITECTURA.md` decía que el Taller entrega a la Biblioteca con `espacio: "trabajo"`. Eso estaba mal: "trabajo" exige un original ya existente al que enlazarse, y un diseño recién generado no tiene ninguno. Ya está corregido: se entrega con **`espacio: "original"`**, `origen: "taller:<nombre-constructor>"`, `licencia: "propia"` y el campo `receta` (la Biblioteca ya lo soporta desde la fase E1). Usa la versión corregida.

Este es el **primer tramo** de una fase grande. Aquí solo se construye: el servicio, la bandeja, y **un** constructor (texto). Cajas y llaveros son un brief aparte, después de este.

## Objetivo
Un servicio nuevo `apps/taller` (mismo patrón que `apps/biblioteca`: Node/TypeScript, SQLite, API local, sin dependencias pesadas) con:
1. Una **bandeja temporal** donde caen los diseños generados.
2. Un **constructor de texto conectado**: el usuario escribe una palabra, elige tipografía y tamaño, y se genera un SVG con las letras unidas en una sola región recortable (no letras sueltas).
3. La acción de **guardar en producción**, que entrega el diseño a la Biblioteca real.

## Decisiones técnicas ya tomadas (del plan maestro, no las reinventes)
- **Letras a contornos:** `opentype.js`.
- **Uniones y offsets 2D:** `Clipper2` (hay build WASM, `clipper2-wasm` o similar en npm — verifica cuál está mantenida antes de instalar).
- El riesgo más alto de todo el Taller es que las letras no se suelden limpio (huecos, islas, letras sin tocarse). Por eso el criterio de aceptación de abajo lo prueba explícitamente con varias tipografías, no con una sola.
- Deja fuera `harfbuzzjs` (escrituras cursivas/conectadas complejas) por ahora — con `opentype.js` + `Clipper2` alcanza para tipografías simples con trazo continuo. Si una tipografía no suelda bien, hazlo notar en las notas de entrega en vez de forzarlo.
- **Licencia de las tipografías:** usa solo 2 o 3 tipografías con licencia libre (SIL Open Font License u otra que permita uso comercial) para las pruebas. Documenta la licencia de cada una en las notas de entrega. No incluyas tipografías de origen dudoso.

## Dentro del alcance

### 1. Servicio base (`apps/taller`)
Mismo patrón que `apps/biblioteca`: servicio HTTP en `127.0.0.1`, SQLite propio, migraciones versionadas, `GET /salud`, llave local `X-Cubo-Key` por `.env`, `.env.example`, README con instrucciones.

### 2. Bandeja (contrato `ARQUITECTURA.md` 3.3)
- `POST /bandeja`: un constructor deposita `{ archivo, formato, medidas_mm, receta, constructor }`. Guarda el archivo en una carpeta temporal y el registro en SQLite.
- `GET /bandeja`: lista lo pendiente de revisar.
- `POST /bandeja/:id/guardar`: entrega el archivo a la Biblioteca real (`POST /activos` en `http://127.0.0.1:7101`, con `espacio: "original"`, `origen: "taller:texto"`, `licencia: "propia"`, `receta`). Si la Biblioteca no está corriendo, avisa con claridad (mismo patrón que `bibliotecaBridge.js` en Cubo Manager).
- `POST /bandeja/:id/descartar`: borra el archivo temporal y el registro.

### 3. Constructor de texto
- `POST /constructores/texto`: recibe `{ texto, tipografia, tamano_mm }`, genera el SVG con las letras convertidas a contornos y unidas (una sola región donde las letras se tocan), calcula sus medidas reales en mm, y lo deposita en la bandeja (llama internamente al paso 2). Devuelve también el **largo de corte aproximado** (perímetro total) y el **área**, para que más adelante el Costeo los pueda usar.
- Una interfaz web local mínima (como la de la Biblioteca): campo de texto, selector de tipografía, tamaño, botón "Generar" que muestra una vista previa del SVG, y botones "Guardar en producción" / "Descartar".

## Fuera del alcance (no lo hagas)
Constructor de cajas, constructor de llaveros (siguiente brief); constructores enlazados (MyLaserTools u otros); 3D; integración con Cubo Manager (Cubo Manager todavía no necesita abrir el Taller en esta fase); Costeo (solo devuelve los números, no los usa); cualquier tipografía sin licencia clara.

## Criterios de aceptación
- [ ] Generar texto en **al menos 3 tipografías distintas** (con licencia libre, documentadas) y confirmar que las letras quedan **en una sola región sin huecos ni islas** en al menos 2 de las 3 (documenta honestamente si alguna falla, como pide el plan maestro: "8 de 10 fuentes en una sola región" es la meta real, no el 100%).
- [ ] El SVG generado abre correctamente en un visor SVG estándar (verifícalo tú, por ejemplo renderizándolo a PNG con una librería y mirando que no haya artefactos).
- [ ] Medidas en mm, largo de corte y área devueltos son coherentes con el tamaño pedido (verificación a mano con al menos un caso, como se hizo en Costeo).
- [ ] Un diseño pasa de "generado" → "bandeja" → "guardado en producción" → aparece de verdad en la Biblioteca real (prueba de extremo a extremo levantando ambos servicios, como se hizo en fases anteriores).
- [ ] "Descartar" borra el archivo temporal sin dejar huérfanos.
- [ ] Si la Biblioteca no está corriendo, "guardar en producción" avisa con claridad en vez de fallar en silencio.
- [ ] Pruebas automáticas (`node --test`, como en Biblioteca) para la generación de contornos, la unión, y el flujo de bandeja.
- [ ] Sin tipografías de licencia dudosa, sin secretos, sin datos reales.

## Entrega
Rama `fase-E4/taller-texto` → PR con notas de entrega (hecho / no hecho / decisiones / dudas — especialmente qué tan bien soldaron las letras en cada tipografía probada, con capturas o descripción) y entrada en `docs/BITACORA.md`.
