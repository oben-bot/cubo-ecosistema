'use client';

import { Product, CatalogTheme, PremiumFeatures } from '@/types/catalog';
import { motion } from 'framer-motion';
import { Plus, Share2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

interface MobileProductCardProps {
  product: Product;
  index: number;
  theme?: CatalogTheme;
  features?: PremiumFeatures;
  storeName?: string;
}

export default function MobileProductCard({ product, index, theme, features, storeName }: MobileProductCardProps) {
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart(product);
  };

  // Calcular precio con descuento
  const hasDiscount = product.discount?.enabled && product.discount.percentage > 0;
  const discountedPrice = hasDiscount 
    ? product.price * (1 - product.discount!.percentage / 100)
    : product.price;
  const originalPrice = product.price;

  const handleShare = () => {
    const message = `¡Mira este producto de ${storeName}!\n\n${product.name}\n${product.description}\nPrecio: $${product.price}\n\n¿Te interesa?`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-gray-900 rounded-lg overflow-hidden mb-4 relative"
    >
      {/* Badge de descuento */}
      {hasDiscount && (
        <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold z-10">
          -{product.discount!.percentage}%
          {product.discount!.label && (
            <div className="text-xs font-normal">{product.discount!.label}</div>
          )}
        </div>
      )}


      <div className="flex p-4">
        {/* Imagen */}
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 mr-4">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ backgroundColor: theme?.primaryColor || '#6b7280' }}
            >
              {product.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-lg mb-1 truncate">
            {product.name}
          </h3>
          
          <p className="text-gray-300 text-sm mb-3 line-clamp-2 leading-tight">
            {product.description}
          </p>

          {/* Precio y botones */}
          <div className="flex items-center justify-between">
            <div>
              {hasDiscount ? (
                <div className="flex flex-col">
                  <span className="text-white font-bold text-xl">
                    $ {discountedPrice.toLocaleString('es-AR')}
                  </span>
                  <span className="text-gray-400 line-through text-sm">
                    $ {originalPrice.toLocaleString('es-AR')}
                  </span>
                </div>
              ) : (
                <span className="text-white font-bold text-xl">
                  $ {product.price.toLocaleString('es-AR')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Compartir (Premium) */}
              {features?.shareProducts?.enabled && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleShare}
                  className="p-2 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                >
                  <Share2 size={16} />
                </motion.button>
              )}

              {/* Agregar al carrito (Premium) */}
              {features?.shoppingCart?.enabled && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddToCart}
                  className="bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600 transition-colors shadow-lg"
                >
                  <Plus size={20} />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}