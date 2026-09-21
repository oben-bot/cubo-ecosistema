import { Catalog } from '@/types/catalog';

export const sampleCatalog: Catalog = {
  id: 'sample-catalog',
  name: 'Boutique Elegancia',
  businessInfo: 'Ropa y accesorios de alta calidad para mujeres modernas. Encuentra tu estilo único con nuestras colecciones exclusivas.',
  products: [
    {
      id: '1',
      name: 'Vestido Floral Primavera',
      description: 'Hermoso vestido con estampado floral, perfecto para ocasiones especiales. Tela ligera y cómoda.',
      price: 89.99,
    },
    {
      id: '2',
      name: 'Blusa Elegante Blanca',
      description: 'Blusa clásica de manga larga, ideal para el trabajo o eventos formales. 100% algodón.',
      price: 45.50,
    },
    {
      id: '3',
      name: 'Pantalón Negro Clásico',
      description: 'Pantalón de corte recto, versátil y elegante. Combina con cualquier blusa o camisa.',
      price: 65.00,
    },
    {
      id: '4',
      name: 'Chaqueta Denim Vintage',
      description: 'Chaqueta de mezclilla con detalles vintage. Perfecta para un look casual pero sofisticado.',
      price: 78.25,
    }
  ],
  createdAt: new Date(),
};

// Función para cargar datos de ejemplo (opcional)
export const loadSampleData = () => {
  const existingCatalogs = localStorage.getItem('catalogs');
  if (!existingCatalogs) {
    localStorage.setItem('catalogs', JSON.stringify([sampleCatalog]));
  }
};