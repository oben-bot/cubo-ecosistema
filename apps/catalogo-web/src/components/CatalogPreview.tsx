"use client";

import { Catalog, Product, CatalogTheme, PremiumFeatures } from "@/types/catalog";
import { motion } from "framer-motion";

interface CatalogPreviewProps {
  storeName: string;
  logo?: string;
  backgroundImage?: string;
  businessInfo: string;
  whatsappNumber?: string;
  products: Product[];
  theme: CatalogTheme;
  features: PremiumFeatures;
  generalDiscount?: {
    enabled: boolean;
    percentage: number;
    label?: string;
  };
}

export default function CatalogPreview({
  storeName,
  logo,
  backgroundImage,
  businessInfo,
  whatsappNumber,
  products,
  theme,
  features,
  generalDiscount,
}: CatalogPreviewProps) {
  return (
    <div className="w-full h-full bg-gray-100 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="relative h-48 flex items-center justify-center"
        style={{
          backgroundImage: backgroundImage
            ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${backgroundImage})`
            : `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="text-center text-white">
          {logo && (
            <img
              src={logo}
              alt={storeName}
              className="w-16 h-16 rounded-full object-cover mx-auto mb-3 border-2 border-white"
            />
          )}
          <h1 className="text-2xl font-bold mb-2">
            {storeName || "Nombre de la Tienda"}
          </h1>
          <p className="text-sm opacity-90 max-w-xs">
            {businessInfo || "Información del negocio"}
          </p>
        </div>

        {/* Status button preview */}
        <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs">
          Horarios
        </div>
      </div>

      {/* Products */}
      <div className="p-4" style={{ backgroundColor: theme.backgroundColor }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: theme.textColor }}>
          Productos ({products.length})
        </h2>

        {products.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📦</div>
            <p>Agrega productos para verlos aquí</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
            {products.slice(0, 4).map((product, index) => {
              const hasDiscount = product.discount?.enabled && product.discount.percentage > 0;
              const discountedPrice = hasDiscount 
                ? product.price * (1 - product.discount!.percentage / 100)
                : product.price;
              
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-lg p-3 shadow-sm border relative"
                >
                  {hasDiscount && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white px-1 py-0.5 rounded text-xs font-bold">
                      -{product.discount!.percentage}%
                    </div>
                  )}
                  <div className="flex gap-3">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                        IMG
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{product.name}</h3>
                      <p className="text-xs text-gray-600 truncate">{product.description}</p>
                      {hasDiscount ? (
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-green-600">
                            ${discountedPrice.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-400 line-through">
                            ${product.price.toFixed(2)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-green-600">
                          ${product.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            
            {products.length > 4 && (
              <div className="text-center py-2 text-gray-500 text-sm">
                +{products.length - 4} productos más
              </div>
            )}
          </div>
        )}

        {/* Features preview */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {whatsappNumber && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                WhatsApp
              </span>
            )}
            {features.socialMedia?.enabled && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                Redes Sociales
              </span>
            )}
            {features.googleMaps?.enabled && (
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                Google Maps
              </span>
            )}
            {features.shoppingCart?.enabled && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                Carrito
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}