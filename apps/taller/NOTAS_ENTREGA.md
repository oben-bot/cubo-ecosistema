# Notas de entrega — Fase E4 completa (texto v2 + cajas + llaveros) + E5/E6 en catalogo-web

**Rama:** `fase-E4-E6/completo` (continúa `fase-E4/taller-texto-v2` PR #6)  
**Fecha:** 2026-09-25  
**Módulos:** `apps/taller` (E4), `apps/catalogo-web` (E5/E6)

## E4 texto v2 (ya entregado en PR #6)

- Verificación previa: main 3c781cd sin taller, rama vieja arena/01a0d065 en a0f94c9, ea2cede no existe (422).
- Stack: opentype.js@1.2.1 (no 2.0.0 rompe DejaVu) + clipper2-js@1.2.4, área negativa exterior DejaVu (DejaVu A -315062 / +28961, Anton -305270 / +18777), Union self con filtro <0.01 mm², solapamiento 0.15 => HOLA DejaVu Bold 3 polys (1 exterior +2 huecos) OK.
- 5 fuentes libres DejaVu Bold/Regular + Anton, Oswald, Bebas OFL.
- Pruebas 12/12 OK.

## E4 cajas y llaveros (segundo tramo)

### Cajas
- `cajas.ts`: caja paramétrica ancho, alto, profundidad, grosor 3mm default, tipo abierta/con_tapa, kerf 0.1mm, con_pestanas bool.
- Layout cruz: fondo, frente, trasera, izq, der, tapa opcional, gap 10mm.
- SVG con paths, labels, medidas, largo corte (perímetro suma), área suma caras.
- Ejemplo 100x60x80 abierta: área 29600 mm² (100*80 +2*100*60+2*80*60), 5 caras, con tapa 6 caras.
- Pruebas 4/4 OK.

### Llaveros
- `llaveros.ts`: forma circular (64 segmentos), rectangular, hueso (2 semicírculos + rect), agujero 2.5mm radio top, texto soldado usando mismo stack texto.
- Texto: opentype load, flatten Q/C con tolerancia 0.8, bbox, escala 70% ancho y 50% alto, centrado, flip Y, union con forma base via Clipper.Union, filtro <0.01.
- Pruebas 5/4? 5/5 OK: circular 40mm, rectangular, hueso, sin agujero.

### Servidor y UI
- POST /constructores/caja y /constructores/llavero con validación, depósito bandeja, receta.
- UI index.html con formularios caja y llavero, app.js generarCaja() y generarLlavero().
- Pruebas totales taller 21/21 OK (12 texto +4 cajas +5 llaveros).

## E5/E6 catalogo-web

Ver `apps/catalogo-web/README.md` y `NOTAS_ENTREGA.md` (si existe) y BITACORA.md E5/E6.

- Servicio 7103, SQLite productos y entregas, X-Cubo-Key, GET /salud.
- E5: POST /productos con activo_id verifica Biblioteca opcional, GET /productos público sin llave = catálogo público. Un producto pasa Biblioteca->Catálogo.
- E6: POST /ventas crea entrega, nube automática => enviada inmediata con enlace drive.example.com, pc => pendiente con mensaje "PC apagada requiere encendida", 502 aviso claro si Biblioteca apagada en enviar, aprobar manual.
- Pruebas 4/4 OK.

## No hecho (E7/E8 fuera de alcance)

- Wallet import, contrato asistente IA, i18n completo es/en/zh, empaquetado Windows, n8n real (mock), Next.js 15 real (se hizo Node/TS simple), finger joints reales, nesting, 3D.

## Cómo probar E4-E6

```bash
# Taller
cd apps/taller
npm install
npm test # 21
npm run build
npm start # 7102

# Biblioteca
cd ../biblioteca
npm install
npm start # 7101

# Catalogo-web
cd ../catalogo-web
npm install
npm test # 4
npm run build
npm start # 7103

# E2E
# Taller: generar HOLA dejavu-sans-bold 80mm, caja 100x60x80, llavero CUBO circular 40mm -> bandeja -> guardar en Biblioteca -> aparece en 7101
# Catalogo: POST /productos con activo_id -> GET /productos público -> POST /ventas nube automática -> entrega enviada
# POST /ventas pc -> pendiente -> POST /entregas/:id/enviar con Biblioteca apagada -> 502 aviso PC apagada
```
