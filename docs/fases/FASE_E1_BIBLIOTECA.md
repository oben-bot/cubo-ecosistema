# Fase E1 — Biblioteca v1

**Para:** arena.ai · **Revisa y ordena:** Claude · **Lee antes:** `AGENTS.md`, `docs/REPORTE_EJECUTIVO.md` (sección 4.2), `docs/ARQUITECTURA.md` (3.1 y 3.2).

## Objetivo
Un servicio local que ordene y permita buscar visualmente todos los archivos de diseño del dueño (láser 2D, 3D, software, apps), separando **originales limpios** de **trabajos personalizados**.

## Dentro del alcance
1. **Servicio** Node/TypeScript en `127.0.0.1`, con SQLite y migraciones, según el contrato `3.1` y `3.2` de `ARQUITECTURA.md`.
2. **Alta** de un archivo o ZIP (formatos: SVG, DXF, PDF, STL, 3MF, imágenes, ZIP). Guardado **todo o nada**: primero carpeta temporal, luego destino final.
3. **Imagen de vista previa**, en este orden: la que el usuario sube → la que viene dentro del ZIP → captura/render del diseño (SVG/DXF a imagen). *La búsqueda en la web queda como interfaz vacía para la fase siguiente.*
4. **Importación masiva** de una carpeta existente **sin moverla ni modificarla**; detectar duplicados por `sha256`; informe de resultados (nuevos, duplicados, con error).
5. **Dos espacios:** `original` (solo lectura) y `trabajo` (versión personalizada enlazada al original, con foto de producto terminado).
6. **Búsqueda** por palabra clave o producto, mostrando **miniaturas**; al elegir un resultado, abrir su ficha y el archivo.
7. **Campos obligatorios:** `origen`, `licencia`, `vendible_digital` (falso por defecto; solo activable con licencia `propia` o `comercial_ok`).
8. **Interfaz web local** sencilla (cuadrícula de miniaturas, filtros, ficha, alta, importación), con claves de traducción es/en/zh (basta con es y en llenos).
9. **Configuración** por `.env` y `marca.json`: ruta de la biblioteca, puerto, idioma. Nada escrito a mano.

## Fuera del alcance (no lo hagas)
IA o sugerencias automáticas de categoría; ventas, pagos o catálogo; conexión con Cubo Manager; búsqueda de imágenes en la web; almacenamiento en nube; autenticación de usuarios.

## Criterios de aceptación
- [ ] Importar una carpeta de prueba con 200+ archivos (incluyendo ZIP) crea las fichas con miniatura y reporta duplicados sin modificar los originales.
- [ ] Un ZIP con imagen usa esa imagen; uno sin imagen genera una captura.
- [ ] Buscar una palabra clave devuelve miniaturas correctas en menos de 1 segundo con 5 000 activos de prueba.
- [ ] Un archivo `original` no puede modificarse ni por API ni por interfaz; un `trabajo` siempre enlaza a su original.
- [ ] `vendible_digital` no se puede activar si la licencia no es `propia` o `comercial_ok` (probado).
- [ ] Un fallo a mitad del alta no deja archivos huérfanos ni registros a medias (probado).
- [ ] `GET /salud` responde con la versión.
- [ ] Sin secretos, sin rutas de usuario escritas a mano, sin datos reales en el repo.
- [ ] Pruebas automáticas pasando y `README.md` con pasos para correrlas.

## Entrega
Rama `fase-E1/biblioteca` → PR con notas de entrega (hecho / no hecho / decisiones / dudas) y entrada en `docs/BITACORA.md`.
