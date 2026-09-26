# Catalogo + Web - E5/E6

**Fase E5:** Catalogo + Web unidos, flujo Biblioteca -> Catalogo publico.
**Fase E6:** Venta archivos: n8n, cola entregas, pagos.

Servicio Node/TypeScript, SQLite, HTTP 127.0.0.1:7103, X-Cubo-Key, GET /salud.

## API

### Publico (sin llave)
- `GET /productos` - lista publicados
- `GET /productos/:id` - ficha

### Con llave (Cubo Manager publica)
- `POST /productos` - { nombre, descripcion, categoria, etiquetas, imagenes, especificaciones, tipo_venta fisico|digital, precio, moneda, contacto, activo_id, estado } -> publica producto. Si activo_id viene de Biblioteca, verifica opcional.
- `GET /config-publica`
- `GET /i18n/:idioma`

### Ventas / Entregas (E6)
- `POST /ventas` - { producto_id?, activo_id?, cliente: {nombre,email}, tipo_pago paypal|cuenta, ubicacion pc|nube, confirmacion automatica|manual, enlace? } -> crea entrega en cola
  - ubicacion nube + automatica => enviada inmediata con enlace drive.example.com
  - ubicacion pc => pendiente, requiere PC encendida (verifica Biblioteca como proxy), mensaje de espera
- `GET /entregas?estado=` - lista cola
- `GET /entregas/:id`
- `POST /entregas/:id/aprobar` - aprobacion manual
- `POST /entregas/:id/enviar` - envio (si pc, verifica Biblioteca, si apagada 502 con aviso)

## E2E E5
1. Levanta Biblioteca 7101, crea activo.
2. Levanta Catalogo 7103.
3. POST /productos con activo_id -> aparece en GET /productos publico.

## E2E E6
1. POST /ventas con producto_id digital, ubicacion nube, automatica -> entrega enviada inmediata.
2. POST /ventas con ubicacion pc -> pendiente con mensaje "PC apagada requiere encendida".
3. Si Biblioteca apagada, POST /entregas/:id/enviar -> 502 aviso claro.
4. Aprobar manual y enviar.

## Instalacion
```bash
cd apps/catalogo-web
npm install
cp .env.example .env
npm run build
npm start # 7103
```

UI en http://127.0.0.1:7103/
