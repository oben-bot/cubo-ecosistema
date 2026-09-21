# Reglas para agentes (arena.ai, Claude y cualquier otro)

Lee esto completo antes de escribir una sola línea. Contexto: `docs/REPORTE_EJECUTIVO.md`. Contratos: `docs/ARQUITECTURA.md`.

## Qué es este proyecto
Un ecosistema de software para un taller de corte láser y 3D (Cubo Manager, Biblioteca, Taller, Catálogo+Web, Wallet) que además se **venderá como producto** a otros talleres. Por eso importa la modularidad, la configuración por marca y la ausencia de datos y secretos.

## Reglas de trabajo
1. **Una fase a la vez.** Trabaja solo en la fase que indica tu brief (`docs/fases/`). No adelantes otras.
2. **Solo tu carpeta.** No modifiques otros módulos. Si necesitas algo de otro módulo, dilo en las notas de entrega y usa su API según `docs/ARQUITECTURA.md`.
3. **Contratos primero.** No cambies los contratos de `ARQUITECTURA.md` sin dejarlo explícito en la entrega como propuesta.
4. **Nunca secretos ni datos reales en Git.** Sin claves, tokens, `.env`, bases `.db`, archivos de clientes ni diseños de terceros. Usa `.env.example`.
5. **Nada escrito a mano:** ni rutas de usuario (`C:\Users\...`), ni el nombre del taller, ni puertos. Todo por configuración (`marca.json`, `.env`).
6. **TypeScript/Node** en módulos nuevos. Sin dependencias abandonadas; antes de agregar una, revisa que esté mantenida y su licencia (evita GPL en código que se vende).
7. **Sin IA obligatoria.** Todo funciona sin Wallet, n8n ni Hermes.
8. **Textos con claves de traducción** (es, en, zh); no texto fijo en la interfaz.
9. **Windows primero**, pero sin rutas ni comandos que impidan portar.
10. **Seguridad:** escucha solo en `127.0.0.1`; valida entradas; los archivos originales son de solo lectura; guardado todo-o-nada.
11. **Pruebas.** Cada función importante con al menos una prueba. Entrega con instrucciones para correrlas.
12. **Ramas y PR.** Nunca escribas en `main`. Trabaja en `fase-EX/<tema>` y abre un PR. Claude revisa antes de fusionar.

## Qué entregar en cada fase
- Código + pruebas + `README.md` del módulo (cómo instalar, correr y probar).
- Notas de entrega: qué se hizo, qué **no** se hizo, decisiones, y cualquier duda o propuesta de cambio de contrato.
- Actualizar `docs/BITACORA.md` con una entrada de la fase.

## Definición de "listo"
La cumple solo cuando **todos** los criterios de aceptación de tu brief pasan y puedes demostrarlo con pasos reproducibles. Si algo no se puede cumplir, dilo; no lo simules.

## Prohibido
Datos inventados que parezcan reales, funciones "simuladas" que aparenten funcionar (por ejemplo, un mensaje de "correo enviado" sin enviarlo), y borrar o reescribir historial.
