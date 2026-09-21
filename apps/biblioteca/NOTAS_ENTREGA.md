# Notas de entrega — Fase E1 · Biblioteca v1

Rama de esta sesion: `arena/01a0c609-cubo-arena` (el brief pedia `fase-E1/biblioteca`; la
sesion de Arena esta fijada a la primera, que es desde la que se abre el PR).

## Hecho

- Servicio Node/TypeScript en `127.0.0.1` con SQLite (`node:sqlite`) y migraciones versionadas; `GET /salud` con version.
- Alta de archivo o ZIP (SVG, DXF, PDF, STL, 3MF, imagenes, ZIP) **todo-o-nada**: carpeta temporal -> transaccion -> destino; los fallos inyectados no dejan huérfanos (probado).
- Miniatura en el orden del brief: subida -> del ZIP -> captura SVG/DXF (rasterizador propio sin dependencias nativas).
- Importacion masiva sin mover/modificar el origen, duplicados por sha256 e informe (nuevos/duplicados/errores/omitidos); probada con 213 archivos incluyendo ZIP.
- Dos espacios: `original` (solo lectura, en disco y en base) y `trabajo` (siempre enlaza a su original, con foto de producto terminado).
- Busqueda por palabra clave con FTS5 (sin distinguir acentos, con prefijos) + subcadena; < 1 s con 5000 activos (probado).
- Campos obligatorios `origen`, `licencia`; `vendible_digital` falso por defecto y solo con `propia`/`comercial_ok` (probado en dominio, API y base).
- Interfaz web local (cuadricula, filtros, ficha, alta, importacion) con claves es/en completas y zh parcial.
- Configuracion por `.env` y `marca.json`; llave `X-Cubo-Key` generada al primer arranque.
- 41 pruebas automaticas + `npm run typecheck` pasando; README con pasos.

## No hecho (fuera de alcance o pendiente)

- Busqueda de imagen en la web: queda como interfaz vacia (`busqueda_imagenes_web: false`), segun el brief.
- Captura automatica de PDF/STL/3MF (sin rasterizador nativo): esas fichas quedan sin miniatura salvo que el usuario o el ZIP aporten imagen (documentado, no simulado).
- Expansion de bloques DXF (`INSERT`) y DXF binario: sin captura, ficha sin miniatura.
- Sugerencias de categoria por IA, ventas, catalogo, conexion con Cubo Manager, nube y autenticacion de usuarios (fuera de alcance).

## Decisiones

- Un ZIP se importa guardando sus archivos admitidos, no el contenedor; su miniatura sale de la imagen interior o de la captura del diseno.
- La imagen subida en un `original` se registra como `captura` y en un `trabajo` como `foto_terminado` (el contrato 3.1 no tiene clave "subida"; ver propuesta).
- `PATCH` nunca toca `espacio`, `original_id`, `archivos` ni `imagenes`; la base lo refuerza con disparadores.
- La carcasa HTML `/` es publica y establece la cookie de sesion; el resto de rutas exige llave o cookie.
- Tipo de activo opcional: se infiere del formato del archivo principal (`laser2d`/`modelo3d`) o `otro`.

## Dudas / propuestas de cambio de contrato (ARQUITECTURA.md)

1. Añadir `subida` a `origen_imagen` (3.1) para distinguir la imagen aportada por el usuario de una captura real.
2. Añadir `precio`/`moneda` al Activo solo si se decide que la Biblioteca (y no Cubo Manager) guarda precios; hoy los precios son de Cubo Manager, por eso no se incluyeron.
3. Definir paginacion estandar de `GET /activos` (`limite`/`offset`, ya implementada) para que Cubo Manager la use igual.
