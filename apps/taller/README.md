# Taller — servicio paramétrico con bandeja y constructores (E4 completo)

**Fase E4** — Taller paramétrico completo: servicio, bandeja, constructores texto (v2), cajas, llaveros.

**Fase E5/E6** ver `apps/catalogo-web`.

## Stack v2 (texto) + E4 cajas/llaveros

- **Texto:** `opentype.js@1.2.1` (no 2.0.0 rompe DejaVu) + `clipper2-js@1.2.4`, área negativa exterior DejaVu, solapamiento 0.15, filtro <0.01 mm².
- **Cajas:** geometría propia rectángulos, layout cruz, opción con tapa, grosor, kerf, sin dependencias pesadas. Calcula medidas, largo corte, área.
- **Llaveros:** forma circular/rectangular/hueso + texto soldado usando mismo stack texto (opentype + clipper2-js), agujero 2.5mm, unión self.
- **Tipografías:** 5 libres DejaVu Bold/Regular + Anton, Oswald, Bebas OFL.
- **Bandeja:** POST /bandeja, GET /bandeja, guardar en Biblioteca 7101, descartar sin huérfanos.

## API

- `GET /salud` público
- `GET /constructores/fuentes`
- `POST /constructores/texto` {texto, tipografia, tamano_mm, solapamiento?}
- `POST /constructores/caja` {ancho_mm, alto_mm, profundidad_mm, grosor_mm?, tipo abierta|con_tapa, con_pestanas?, kerf_mm?}
- `POST /constructores/llavero` {texto, forma circular|rectangular|hueso, tamano_mm?, tipografia?, incluir_agujero?}
- Bandeja: POST /bandeja, GET /bandeja, GET /bandeja/:id, GET /bandeja/:id/archivo?inline=1, POST /bandeja/:id/guardar, POST /bandeja/:id/descartar

## UI

http://127.0.0.1:7102/ - texto, caja, llavero, preview, bandeja.

## Pruebas

```bash
cd apps/taller
npm install
npm test # 21 tests
```

- texto: 12 tests (soldadura 3 tipografías, área negativa DejaVu)
- cajas: 4 tests (abierta, con tapa, kerf)
- llaveros: 5 tests (circular, rectangular, hueso, sin agujero)
- bandeja, config, biblioteca

## Instalación

```bash
npm install
cp .env.example .env
npm run build
npm start # 7102
```

## E5/E6

Ver `apps/catalogo-web/README.md` - Catálogo + Web + cola entregas + pagos mock.

## Notas entrega

Ver `NOTAS_ENTREGA.md` y `docs/BITACORA.md` E4-E6.
