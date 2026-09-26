# Notas entrega E5/E6 - Catalogo + Web + Ventas

**Rama:** fase-E4-E6/completo
**Fecha:** 2026-09-25
**Modulo:** apps/catalogo-web

## E5 Catalogo + Web

- Servicio Node/TS SQLite 7103, X-Cubo-Key, GET /salud con productos y entregas count.
- POST /productos {nombre, descripcion, categoria, etiquetas, imagenes, especificaciones, tipo_venta fisico|digital, precio, moneda, contacto, activo_id, estado} -> publica. Si activo_id, verifica Biblioteca opcional via fetch, no bloquea si Biblioteca apagada.
- GET /productos publico sin llave (catalogo publico), GET /productos/:id.
- UI minima landing + catalogo, formularios publicar y ventas.
- Prueba: crear activo en Biblioteca 7101, POST /productos con activo_id -> aparece en GET /productos publico.

## E6 Venta archivos

- POST /ventas {producto_id?, activo_id?, cliente {nombre,email}, tipo_pago paypal|cuenta, ubicacion pc|nube, confirmacion automatica|manual, enlace?} -> crea entrega con pedido_id.
  - nube + automatica => enviada inmediata con enlace https://drive.example.com/... (simula TeraBox/Mega/Drive), mensaje "Entrega automática desde nube".
  - pc => pendiente con mensaje "Archivo en PC local - requiere que la PC esté encendida. Se avisó al dueño y al cliente con mensaje de espera."
  - nube + manual => pendiente aprobación manual.
- GET /entregas?estado=, GET /entregas/:id, POST /entregas/:id/aprobar, POST /entregas/:id/enviar (si pc verifica Biblioteca como proxy PC encendida, si apagada 502 aviso claro "PC apagada - Biblioteca no disponible").
- Pagos mock paypal/cuenta.
- Pruebas 4/4: E5 publicar, E6 nube automática enviada, E6 pc pendiente, cola filtra.

## Decisiones

- Cola local SQLite, no en línea, n8n mockeado con lógica estados (pendiente/aprobada/enviada/error).
- Biblioteca como proxy PC encendida.
- Productos públicos sin llave, resto con llave.

## No hecho E7/E8

- Wallet, contrato asistente IA, Next.js 15, Drive real, n8n real, i18n completo, empaquetado.

## E2E

- Ver README.md
