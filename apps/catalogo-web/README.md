# Gestor de Catálogos Digitales

Una aplicación web moderna para crear y gestionar catálogos digitales de productos de forma fácil y profesional.

## 🚀 Características

- **Gestión de Catálogos**: Crea, visualiza y elimina catálogos digitales
- **Productos Dinámicos**: Agrega y elimina productos con imágenes, descripciones y precios
- **Vista Previa Profesional**: Diseño limpio y responsive para mostrar a clientes
- **Código QR Automático**: Genera QR y links para compartir fácilmente
- **Almacenamiento Local**: Datos guardados en localStorage (fácil migración a API)
- **Animaciones Suaves**: Transiciones con Framer Motion
- **Diseño Responsive**: Optimizado para todos los dispositivos

## 🛠️ Tecnologías

- **Next.js 15** - Framework React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utilitarios
- **Framer Motion** - Animaciones
- **qrcode.react** - Generación de códigos QR
- **Lucide React** - Iconos modernos

## 📦 Instalación

1. Clona el repositorio:
\`\`\`bash
git clone <tu-repositorio>
cd catalogo
\`\`\`

2. Instala las dependencias:
\`\`\`bash
npm install
\`\`\`

3. Ejecuta el servidor de desarrollo:
\`\`\`bash
npm run dev
\`\`\`

4. Abre [http://localhost:3000](http://localhost:3000) en tu navegador

## 🎯 Uso

### Crear un Catálogo

1. Haz clic en "Nuevo Catálogo" en la página principal
2. Completa la información básica:
   - Nombre del catálogo
   - Logo del negocio (opcional)
   - Información breve del negocio
3. Agrega productos:
   - Nombre del producto
   - Descripción
   - Precio
   - Imagen (opcional)
4. Guarda el catálogo

### Ver y Compartir

1. En la lista de catálogos, haz clic en "Ver"
2. Se genera automáticamente:
   - Una página profesional con todos los productos
   - Código QR para compartir
   - Link directo para enviar a clientes
3. Descarga el QR o copia el link para compartir

### Gestionar Catálogos

- **Ver**: Abre la vista pública del catálogo
- **Eliminar**: Borra permanentemente el catálogo

## 📁 Estructura del Proyecto

\`\`\`
src/
├── app/                    # Páginas de Next.js
│   ├── catalog/[id]/      # Vista pública del catálogo
│   ├── create/            # Formulario de creación
│   ├── layout.tsx         # Layout principal
│   └── page.tsx           # Página de inicio
├── components/            # Componentes reutilizables
│   ├── CatalogForm.tsx    # Formulario de catálogo
│   ├── CatalogList.tsx    # Lista de catálogos
│   ├── ProductCard.tsx    # Tarjeta de producto
│   └── QRGenerator.tsx    # Generador de QR
├── hooks/                 # Custom hooks
│   └── useCatalogs.ts     # Hook para gestión de catálogos
└── types/                 # Definiciones de tipos
    └── catalog.ts         # Tipos de catálogo y producto
\`\`\`

## 🔧 Personalización

### Estilos
Los estilos están en \`src/app/globals.css\` y utilizan Tailwind CSS. Puedes personalizar:
- Colores de marca
- Tipografías
- Espaciados
- Animaciones

### Almacenamiento
Actualmente usa localStorage. Para conectar a una API:
1. Modifica \`src/hooks/useCatalogs.ts\`
2. Reemplaza las operaciones de localStorage con llamadas a API
3. Agrega manejo de estados de carga y error

### Componentes
Todos los componentes están modulares y pueden ser fácilmente personalizados o extendidos.

## 🚀 Próximas Mejoras

- [ ] Autenticación de usuarios
- [ ] Base de datos persistente
- [ ] Categorías de productos
- [ ] Búsqueda y filtros
- [ ] Temas personalizables
- [ ] Exportar a PDF
- [ ] Analytics de visualizaciones
- [ ] Múltiples idiomas

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

---

**¡Listo para crear catálogos digitales profesionales!** 🎉# Catalogo
