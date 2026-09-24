# Módulo Costeo — Fase E3

Pantalla de costeo real sobre backend ya existente (motor LaserCalc Pro adaptado).

## Qué hace

- **Configuración máquina (una sola vez):** costo adquisición, amortización meses, costo y vida útil láser/ópticas/filtros, tarifa supervisión/hora, tarifa mano de obra/hora, watts máquina, costo kWh, moneda. Guarda en `configuracion_maquina` id=1.
- **Catálogo materiales:** nombre, tipo, precio por plancha, ancho/alto cm. Costo por cm² = precio / (ancho*alto). Alta/edición/baja lógica.
- **Catálogo insumos:** nombre, costo unitario, unidad.
- **Calculadora:** referencia_tipo=`calculo_libre` + referencia_id=timestamp local. Agrega líneas de consumo (material+área o insumo+cantidad), registra minutos láser y mano de obra, calcula desglose completo (material, desgaste máquina, electricidad, supervisión, mano obra, total) en moneda configurada. Avisa si máquina no configurada.

## Rutas IPC (preload.js)

`window.electron.costeo.*` expone 12 métodos que llaman a canales `costeo:*` en `ipcHandlers.js`:

- getConfigMaquina, saveConfigMaquina(cfg)
- getMateriales, saveMaterial(material), deleteMaterial(id)
- getInsumos, saveInsumo(insumo), deleteInsumo(id)
- addConsumo(item), getConsumo(referenciaTipo, referenciaId)
- saveTiempos(referenciaTipo, referenciaId, minutosLaser, minutosManoObra)
- calcularCosto(referenciaTipo, referenciaId)

Backend ya existía completo; solo se añadió exposición en preload y fix menor en saveTiempos (DELETE previo para idempotencia).

## Ruta UI

- `/costeo` registrada en `App.jsx`
- Accesible desde Dashboard (`moduleHubConfig.js` con glow #fbbf24) y Sidebar (`LayoutSidebar.js`)
- Componente principal: `CosteoMain.jsx` con tabs: calculadora, materiales, insumos, config

## Cómo probar (manual)

1. `npm install --ignore-scripts` en `apps/cubo-manager` (sharp falla por cert en sandbox, se ignora)
2. `npx react-scripts build` debe compilar limpio (~82 kB gzip)
3. En Electron:
   - Ir a Costeo → Configuración Máquina → guardar datos de prueba (ej: adquisición 50000, amort 24 meses, láser 5000 vida 10000h, ópticas 1000 vida 2000h, filtros 500 vida 1000h, supervisión 50/h, mano obra 100/h, watts 1000, kWh 1.5, moneda MXN)
   - Materiales → + Nuevo: MDF 3mm, tipo MDF, precio 200, ancho 122, alto 244 → debe aparecer y mostrar costo cm²
   - Insumos → + Nuevo: Tornillo, costo 2, unidad pieza
   - Calculadora → seleccionar material MDF + área 100 cm² → Agregar línea → seleccionar insumo Tornillo + cantidad 4 → Agregar → minutos láser 10, mano obra 20 → Calcular → debe mostrar desglose coherente (material ~0.67, desgaste ~ algo, electricidad, supervisión, mano obra, total). Verificar a mano que total tiene sentido.
   - Borrar material/insumo → debe desaparecer (baja lógica)
   - Sin config → debe mostrar warning amarillo, no cálculo en ceros
   - Nuevo cálculo → genera nuevo ID, limpia líneas

## Criterios de aceptación (check)

- [x] preload.js expone 12 métodos costeo con mismos nombres que canales IPC
- [x] Configurar máquina una vez y que quede guardada al recargar
- [x] Alta material e insumo aparecen en listas; baja lógica desaparecen
- [x] Cálculo real punta a punta: material con área + insumo con cantidad + tiempos + desglose con moneda
- [x] Si máquina no configurada, avisa en vez de número engañoso
- [x] Ruta /costeo accesible desde Dashboard
- [x] App compila limpia con `npx react-scripts build`
- [x] Sin datos reales, sin rutas usuario, sin secretos

## Notas

- No se integra en CotizacionesMain (fuera de alcance E3, fase aparte)
- No se cambia motor cálculo calcularCosto
- saveTiempos ahora hace DELETE+INSERT para evitar suma duplicada al recalcular (fix mínimo necesario)
