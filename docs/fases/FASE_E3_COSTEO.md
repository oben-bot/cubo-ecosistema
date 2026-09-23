# Fase E3 — Costeo: construir la pantalla sobre el backend ya existente

**Para:** arena.ai · **Revisa y ordena:** Claude · **Lee antes:** `AGENTS.md`, `docs/REPORTE_EJECUTIVO.md` (sección 4.1), `apps/cubo-manager/src/core/ipcHandlers.js` (busca `costeo:` para ver los 10 handlers ya implementados y probados).

**Contexto importante:** el backend de Costeo **ya existe completo y funciona** (motor de cálculo: material + desgaste de máquina + electricidad + supervisión + mano de obra, con amortización real). Lo único que falta es la interfaz. No reimplementes el cálculo ni cambies `ipcHandlers.js` salvo lo estrictamente necesario (ver punto 0).

## Punto 0 — lo único pendiente en el backend
`electron/preload.js` **no expone** los canales `costeo:*` todavía. Antes que nada, agrega el bloque `costeo` al `contextBridge.exposeInMainWorld` con estos métodos, cada uno llamando al canal IPC del mismo nombre:
`getConfigMaquina`, `saveConfigMaquina(cfg)`, `getMateriales`, `saveMaterial(material)`, `deleteMaterial(id)`, `getInsumos`, `saveInsumo(insumo)`, `deleteInsumo(id)`, `addConsumo(item)`, `getConsumo(referenciaTipo, referenciaId)`, `saveTiempos(referenciaTipo, referenciaId, minutosLaser, minutosManoObra)`, `calcularCosto(referenciaTipo, referenciaId)`.

## Objetivo
Un módulo "Costeo" en `src/modules/Costeo/` con ruta `/costeo`, accesible desde el Dashboard, que permita: configurar la máquina una vez, mantener catálogos de materiales e insumos, y calcular el costo real de una pieza de punta a punta desde la interfaz.

## Dentro del alcance

### 1. Configuración de la máquina (una pantalla, se edita rara vez)
Formulario contra `costeo:getConfigMaquina` / `saveConfigMaquina`. Revisa `configuracion_maquina` en `src/core/database.js` para los campos exactos (costo de adquisición, meses de amortización, costo y vida útil de láser/ópticas/filtros en horas, tarifa de supervisión por hora, tarifa de mano de obra por hora, watts de la máquina, costo por kWh, moneda).

### 2. Catálogo de materiales
Lista + alta/edición/baja contra `costeo:getMateriales` / `saveMaterial` / `deleteMaterial` (baja lógica, ya la hace el backend con `activo=0`). Campos: nombre, tipo, precio por plancha, ancho y alto en cm (de ahí sale el costo por cm²).

### 3. Catálogo de insumos
Igual que materiales, contra `costeo:getInsumos` / `saveInsumo` / `deleteInsumo`. Campos: nombre, costo unitario, unidad.

### 4. Calculadora de costo (el corazón de la fase)
Una pantalla donde:
- Se agregan una o más líneas de consumo: elegir un material y dar el área en cm² (o elegir un insumo y una cantidad) → `costeo:addConsumo({ referencia_tipo, referencia_id, material_id?, area_cm2?, insumo_id?, cantidad? })`. El backend ya calcula y guarda el costo de cada línea.
- Se registran minutos de láser y minutos de mano de obra → `costeo:saveTiempos(referencia_tipo, referencia_id, minutosLaser, minutosManoObra)`.
- Un botón "Calcular" llama a `costeo:calcularCosto(referencia_tipo, referencia_id)` y muestra el desglose completo que ya devuelve el backend: costo de material, desgaste de máquina, electricidad, supervisión, mano de obra y total, en la moneda configurada.
- Usa `referencia_tipo = 'calculo_libre'` con un `referencia_id` nuevo (por ejemplo un timestamp o un contador local) para que la calculadora funcione de forma independiente, sin depender de que exista una cotización. Esto es lo que hace que "cotizar de punta a punta desde la interfaz" sea posible ya en esta fase, sin tocar el módulo de Cotizaciones (queda fuera de alcance, ver abajo).
- Antes de calcular, si no se ha configurado la máquina (`getConfigMaquina` vacío), avisa con claridad en vez de mostrar un cálculo incorrecto o en ceros.

## Fuera del alcance (no lo hagas)
Integrar la calculadora dentro de `CotizacionesMain.jsx` (es una fase aparte, más adelante); cambiar el motor de cálculo de `calcularCosto`; alertas de stock del almacén (era parte de una fase anterior, ya se decidió que Costeo va por su cuenta); traducciones es/en/zh; tocar cualquier otro módulo.

## Criterios de aceptación
- [ ] `preload.js` expone los 10 métodos de `costeo` listados arriba, con los mismos nombres que sus canales IPC.
- [ ] Configurar la máquina una vez y que quede guardada (recargar la pantalla y seguir ahí).
- [ ] Dar de alta un material y un insumo, y que aparezcan en sus listas; darlos de baja y que desaparezcan (baja lógica).
- [ ] Un cálculo real de punta a punta: agregar un material con área, un insumo con cantidad, tiempos de láser y mano de obra, y ver un desglose de costos coherente con la moneda configurada (verificar a mano que el número tiene sentido con los datos de prueba usados).
- [ ] Si la máquina no está configurada, la calculadora lo avisa en vez de mostrar un número engañoso.
- [ ] Ruta `/costeo` accesible desde el Dashboard.
- [ ] La app compila limpia con `npx react-scripts build` (pruébalo tú mismo antes de entregar, como se hizo en fases anteriores).
- [ ] Sin datos reales, sin rutas de usuario escritas a mano, sin secretos.

## Entrega
Rama `fase-E3/costeo` → PR con notas de entrega (hecho / no hecho / decisiones / dudas) y entrada en `docs/BITACORA.md`.
