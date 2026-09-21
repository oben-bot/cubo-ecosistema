'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Catalog } from '@/types/catalog';
import QRGenerator from '@/components/QRGenerator';
import { ArrowLeft, Eye, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function AdminCatalogView() {
  const params = useParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [publicUrl, setPublicUrl] = useState('');

  useEffect(() => {
    const savedCatalogs = localStorage.getItem('catalogs');
    if (savedCatalogs) {
      const catalogs: Catalog[] = JSON.parse(savedCatalogs);
      const foundCatalog = catalogs.find(c => c.id === params.id);
      setCatalog(foundCatalog || null);
    }
    
    // URL pública del catálogo (sin /admin)
    setPublicUrl(`${window.location.origin}/catalog/${params.id}`);
  }, [params.id]);

  if (!catalog) {
    return (
      <div className="min-h-screen bg-purple-600 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            Catálogo no encontrado
          </h1>
          <Link href="/">
            <button className="bg-white text-purple-600 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold">
              Volver al inicio
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-600">
      {/* Header administrativo */}
      <div className="bg-purple-700 shadow-sm border-b border-purple-600">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 text-purple-200 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft size={20} />
              Volver a mis catálogos
            </motion.button>
          </Link>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {catalog.logo && (
                <img
                  src={catalog.logo}
                  alt={catalog.storeName}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {catalog.storeName}
                </h1>
                <p className="text-purple-200 mt-1">
                  {catalog.name}
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-3">
              <Link href={`/catalog/${catalog.id}`} target="_blank">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
                >
                  <Eye size={16} />
                  Ver Catálogo Público
                </motion.button>
              </Link>
              

            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Información del catálogo */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Información del Catálogo</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Tienda
                </label>
                <p className="text-gray-900">{catalog.storeName}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Catálogo
                </label>
                <p className="text-gray-900">{catalog.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Información del Negocio
                </label>
                <p className="text-gray-900">{catalog.businessInfo}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Productos
                </label>
                <p className="text-gray-900">
                  {catalog.products.length} producto{catalog.products.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Creado
                </label>
                <p className="text-gray-900">
                  {new Date(catalog.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Vista previa del tema */}
            <div className="mt-6 p-4 rounded-lg border-2 border-dashed border-gray-300">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Tema Aplicado</h3>
              <div 
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: catalog.theme.backgroundColor,
                  color: catalog.theme.textColor,
                  fontFamily: catalog.theme.fontFamily,
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  {catalog.logo && (
                    <img src={catalog.logo} alt="Logo" className="w-8 h-8 rounded object-cover" />
                  )}
                  <h4 className="text-lg font-bold" style={{ color: catalog.theme.textColor }}>
                    {catalog.storeName}
                  </h4>
                </div>
                <div 
                  className="inline-block px-3 py-1 rounded text-sm font-medium"
                  style={{ 
                    backgroundColor: catalog.theme.primaryColor,
                    color: catalog.theme.textColor 
                  }}
                >
                  Ejemplo de producto
                </div>
              </div>
            </div>
          </div>

          {/* QR y compartir */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <QRGenerator url={publicUrl} catalogName={catalog.name} storeName={catalog.storeName} />
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Cómo usar</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Imprime el código QR y colócalo en tu tienda</li>
                <li>• Comparte el link por WhatsApp o redes sociales</li>
                <li>• Los clientes verán solo el catálogo, sin elementos administrativos</li>
                <li>• El catálogo es completamente responsive (móvil y desktop)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}