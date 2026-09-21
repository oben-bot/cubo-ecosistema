'use client';

import { Catalog } from '@/types/catalog';
import { Eye, Trash2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface CatalogListProps {
  catalogs: Catalog[];
  onDelete: (id: string) => void;
}

export default function CatalogList({ catalogs, onDelete }: CatalogListProps) {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Mis Catálogos</h1>
        <Link href="/create">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white text-purple-600 px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-gray-100 transition-colors font-semibold"
          >
            <Plus size={20} />
            Nuevo Catálogo
          </motion.button>
        </Link>
      </div>

      {catalogs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-purple-200 mb-4">
            <Plus size={64} className="mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No tienes catálogos aún
          </h3>
          <p className="text-purple-200 mb-6">
            Crea tu primer catálogo digital para mostrar tus productos
          </p>
          <Link href="/create">
            <button className="bg-white text-purple-600 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold">
              Crear mi primer catálogo
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {catalogs.map((catalog, index) => (
            <motion.div
              key={catalog.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  {catalog.logo && (
                    <img
                      src={catalog.logo}
                      alt={catalog.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      {catalog.storeName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {catalog.name} • {new Date(catalog.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {catalog.businessInfo}
                </p>
                
                <div className="text-sm text-gray-500 mb-4">
                  {catalog.products.length} producto{catalog.products.length !== 1 ? 's' : ''}
                </div>

                <div className="flex gap-2">
                  <Link href={`/admin/catalog/${catalog.id}`} className="flex-1">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                    >
                      <Eye size={16} />
                      Gestionar
                    </motion.button>
                  </Link>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onDelete(catalog.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-red-700 transition-colors"
                  >
                    <Trash2 size={16} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}