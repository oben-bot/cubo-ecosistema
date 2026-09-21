# Biblioteca (fase E1) — servicio local de activos

Servicio Node/TypeScript que ordena y permite buscar visualmente todos los archivos de
diseno del taller (laser 2D, 3D, software, apps), separando **originales limpios**
(solo lectura) de **trabajos personalizados** enlazados a su original.

Implementa los contratos **3.1 (Activo)** y **3.2 (API)** de `docs/ARQUITECTURA.md`.

> Lee antes: `AGENTS.md`, `BRIEF_FASE_E1.md`, `docs/REPORTE_EJECUTIVO.md` (4.2) y
> `docs/ARQUITECTURA.md` (3.1 y 3.2).

## Requisitos

- **Node.js >= 22.6** (usa `node:sqlite` con FTS5 y ejecuta TypeScript sin transpilador externo).
- Sin dependencias nativas: la unica dependencia de ejecucion es [`fflate`](https://github.com/101arrowz/fflate)
  (MIT, activa y sin GPL) para abrir ZIP. Las capturas SVG/DXF -> PNG se generan con codigo propio.

## Instalacion

```bash
cd biblioteca
npm install
```

## Configuracion (nada escrito a mano)

Todo sale de `.env` y `marca.json`; hay ejemplos versionados:

```bash
cp .env.example .env        # ajusta ruta, puerto, idioma...
cp marca.json.example marca.json   # opcional: marca del taller
```

Variables principales (ver `.env.example` para el detalle):

| Variable | Por defecto | Significado |
|---|---|---|
| `BIBLIOTECA_RUTA` | `datos/` | Carpeta de la biblioteca (archivos + SQLite + llave). |
| `BIBLIOTECA_HOST` | `127.0.0.1` | Interfaz de escucha. Cambiarla expone el servicio y exige la llave. |
| `BIBLIOTECA_PUERTO` | `7101` | Puerto del contrato. |
| `BIBLIOTECA_IDIOMA` | `es` | `es` / `en` / `zh`. |
| `BIBLIOTECA_MARCA` | `marca.json` | Archivo de marca; sin el, marca generica. |

En el primer arranque se genera la llave local `X-Cubo-Key` y se guarda en
`<BIBLIOTECA_RUTA>/cubo.key` (0600). Se imprime por consola una sola vez.

## Ejecucion

```bash
npm run dev      # desarrollo, recarga con --watch
npm run build    # compila a dist/
npm start        # produce: node dist/index.js
```

La interfaz web queda en `http://127.0.0.1:<puerto>/`. Al abrir `/` el servicio establece
una cookie de sesion; las rutas de datos exigen esa cookie o la cabecera `X-Cubo-Key`.

## Pruebas

```bash
npm test          # 41 pruebas automaticas (node:test)
npm run typecheck # tsc --noEmit
```

Las pruebas cubren: capturas SVG/DXF, reglas de licencia/vendible, enlace original/trabajo,
alta todo-o-nada (con fallos inyectados), importacion de 200+ archivos con ZIP y duplicados
sin tocar el origen, busqueda con 5000 activos < 1 s, paridad de traducciones y ausencia de
rutas/secretos escritos a mano.

## API (contrato 3.2)

| Metodo y ruta | Funcion |
|---|---|
| `GET /salud` | Version y estado (publica). |
| `POST /activos` | Alta de archivo o ZIP (multipart), todo-o-nada. |
| `POST /importar` | Importa una carpeta sin moverla; duplicados por sha256. |
| `GET /activos?q=&tipo=&espacio=&categoria=` | Busqueda con miniaturas. |
| `GET /activos/:id` | Ficha completa (+ trabajos derivados). |
| `GET /activos/:id/archivo` | Descarga (solo lectura si es original). |
| `GET /activos/:id/miniatura` | Miniatura (endpoint adicional). |
| `POST /activos/:id/trabajo` | Crea version de trabajo enlazada al original. |
| `PATCH /activos/:id` | Edita metadatos (nunca el archivo ni el espacio). |

Ejemplo de alta con `curl`:

```bash
curl -s -H "X-Cubo-Key: $LLAVE" -F "nombre=Caja" -F "origen=web" \
  -F "licencia=propia" -F "archivo=@caja.svg" http://127.0.0.1:7101/activos
```

## Orden de la miniatura

1. Imagen subida por el usuario. 2. Imagen dentro del ZIP. 3. Captura del diseno (SVG/DXF).
La busqueda de imagen en la web queda como interfaz **vacia** para la fase siguiente
(`busqueda_imagenes_web: false` en `/config-publica`).

## Seguridad

- Escucha por defecto en `127.0.0.1`; llave `X-Cubo-Key` generada al primer arranque.
- Los archivos de un `original` se guardan de solo lectura y la base impide (disparadores)
  actualizarlos o borrarlos; `PATCH` rechaza `espacio`, `original_id`, `archivos` e `imagenes`.
- `vendible_digital` solo con licencia `propia` o `comercial_ok`, validado en dominio y en la base.
- Rutas saneadas (sin recorridos), ZIP con limite de entradas y de tamano descomprimido.

## Licencias de dependencias

- `fflate` MIT · `typescript` y `@types/node` (solo desarrollo) Apache-2.0 / MIT.
