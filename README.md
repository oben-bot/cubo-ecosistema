# Ecosistema "El Cubo de Madera"

Ecosistema de software para talleres de corte láser, impresión 3D y personalización. Se usa en el taller propio y se venderá por piezas o completo.

**Empieza aquí:** `docs/REPORTE_EJECUTIVO.md` (visión, piezas, flujos, venta, estado y siguientes pasos).

| Carpeta | Contenido |
|---|---|
| `apps/cubo-manager` | App de escritorio central (Electron + React + SQLite) |
| `apps/catalogo-web` | Catálogo digital (Next.js). La landing por integrar está en `incoming/` |
| `apps/biblioteca` | Biblioteca de activos: **por construir** (fase E1) |
| `apps/taller` | Taller paramétrico: **por construir** (fase E4) |
| `services/wallet` | Wallet (API Hub Pro), router de IA: **por importar sin secretos** |
| `docs/` | Reporte ejecutivo, arquitectura, bitácora, deuda técnica, briefs de fase |
| `incoming/` | Piezas pendientes de integrar |

Reglas para quien programe: `AGENTS.md`. Registro de avance: `docs/BITACORA.md`.

Este repositorio es **privado**: no subir claves, tokens, bases de datos reales ni archivos de clientes.
