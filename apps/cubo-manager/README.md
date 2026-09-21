# Cubo Manager: Sistema de Gestión de Taller Local-First

## Visión General

Cubo Manager es el centro de operaciones digital diseñado específicamente para la gestión integral de talleres. Bajo una filosofía **local-first**, el sistema garantiza que todos los datos críticos residan exclusivamente en el equipo del usuario, otorgando un control total sobre la información sin dependencias externas obligatorias. El alcance de la plataforma abarca desde la gestión de producción y almacén hasta el control financiero y la asistencia mediante inteligencia artificial.

## Arquitectura Técnica

La aplicación está estructurada en capas claramente definidas para separar las responsabilidades de ejecución de escritorio, la interfaz de usuario y la lógica de negocio.

| Directorio | Responsabilidad | Descripción |
| :--- | :--- | :--- |
| `electron/` | Capa de Escritorio | Contiene el proceso principal, la configuración de ventanas y el puente IPC. |
| `src/core/` | Núcleo Funcional | Gestiona la persistencia en SQLite, el acceso al sistema de archivos y la configuración base. |
| `src/modules/` | Módulos de Negocio | Implementaciones independientes para Producción, Almacén, Clientes, Finanzas, entre otros. |
| `src/components/` | Presentación | Componentes de React reutilizables organizados por función (Layout, UI, IA). |
| `data/` | Persistencia | Ubicación del archivo de base de datos local `cubo_manager.db`. |
| `storage/` | Almacenamiento | Repositorio de archivos físicos como inventarios de láser, catálogos y evidencias de trabajos. |

## Modelo de Datos

La persistencia de la información se centraliza en una base de datos **SQLite**, asegurando integridad y rapidez en el acceso local.

| Tabla | Propósito |
| :--- | :--- |
| `clientes` | Registro detallado de contactos y su historial de interacción. |
| `cotizaciones` | Gestión de presupuestos y su conversión a órdenes de trabajo. |
| `trabajos` | Seguimiento del ciclo de vida de la producción (Cola, Proceso, Terminado). |
| `inventario` | Control de existencias de materias primas y productos terminados. |
| `ventas` | Registro de transacciones comerciales y vinculación con pasarelas externas. |
| `finanzas` | Seguimiento de ingresos, egresos y rentabilidad por proyecto. |

## Asistente Digital

El sistema incluye una integración con el asistente digital **Hermes**, que actúa como una interfaz inteligente para interactuar con los datos del taller. Este componente permite realizar consultas sobre el inventario, agendar recordatorios y generar cotizaciones mediante comandos de lenguaje natural, operando de manera local para preservar la privacidad y la velocidad de respuesta.
