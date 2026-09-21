'use client';

import { useState } from 'react';
import { Upload, Image as ImageIcon, X, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface BulkImageUploaderProps {
  onImagesUploaded: (images: { [productName: string]: string }) => void;
  productNames: string[];
}

export default function BulkImageUploader({ onImagesUploaded, productNames }: BulkImageUploaderProps) {
  const [uploadedImages, setUploadedImages] = useState<{ [key: string]: string }>({});
  const [isUploading, setIsUploading] = useState(false);

  const handleMultipleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    const newImages: { [key: string]: string } = { ...uploadedImages };

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = (event) => {
            const result = event.target?.result as string;
            
            // Intentar hacer match del nombre del archivo con nombres de productos
            const fileName = file.name.toLowerCase().replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
            const matchedProduct = productNames.find(name => 
              name.toLowerCase().includes(fileName) || 
              fileName.includes(name.toLowerCase())
            );

            if (matchedProduct) {
              newImages[matchedProduct] = result;
            } else {
              // Si no hay match automático, usar el nombre del archivo
              newImages[file.name] = result;
            }
            
            resolve(null);
          };
          reader.readAsDataURL(file);
        });
      }
    }

    setUploadedImages(newImages);
    onImagesUploaded(newImages);
    setIsUploading(false);
  };

  const removeImage = (key: string) => {
    const newImages = { ...uploadedImages };
    delete newImages[key];
    setUploadedImages(newImages);
    onImagesUploaded(newImages);
  };

  const assignImageToProduct = (imageKey: string, productName: string) => {
    const newImages = { ...uploadedImages };
    const imageData = newImages[imageKey];
    delete newImages[imageKey];
    newImages[productName] = imageData;
    setUploadedImages(newImages);
    onImagesUploaded(newImages);
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <ImageIcon size={20} />
        Subir Imágenes en Lote
      </h2>

      <div className="space-y-4">
        {/* Instrucciones */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-900 mb-2">💡 Consejos para mejores resultados</h3>
          <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
            <li>Nombra las imágenes similar al nombre del producto</li>
            <li>Ejemplo: "hamburguesa-clasica.jpg" para "Hamburguesa Clásica"</li>
            <li>Formatos soportados: JPG, PNG, GIF, WebP</li>
            <li>Puedes subir múltiples imágenes a la vez</li>
          </ul>
        </div>

        {/* Upload area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleMultipleImageUpload}
            className="hidden"
            id="bulk-image-upload"
            disabled={isUploading}
          />
          <label
            htmlFor="bulk-image-upload"
            className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Upload size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600">
              {isUploading ? 'Subiendo imágenes...' : 'Haz clic para subir múltiples imágenes'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Puedes seleccionar varias imágenes a la vez
            </p>
          </label>
        </div>

        {/* Imágenes subidas */}
        {Object.keys(uploadedImages).length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Imágenes subidas ({Object.keys(uploadedImages).length})
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(uploadedImages).map(([key, imageData]) => {
                const isAssigned = productNames.includes(key);
                
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative group"
                  >
                    <div className={`border-2 rounded-lg overflow-hidden ${
                      isAssigned ? 'border-green-500' : 'border-gray-200'
                    }`}>
                      <img
                        src={imageData}
                        alt={key}
                        className="w-full h-24 object-cover"
                      />
                      
                      {/* Overlay con acciones */}
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => removeImage(key)}
                          className="bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Información */}
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {key}
                      </p>
                      
                      {isAssigned ? (
                        <div className="flex items-center gap-1 mt-1">
                          <Check size={12} className="text-green-600" />
                          <span className="text-xs text-green-600">Asignada</span>
                        </div>
                      ) : (
                        <div className="mt-1">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                assignImageToProduct(key, e.target.value);
                              }
                            }}
                            className="text-xs border border-gray-300 rounded px-1 py-0.5 w-full"
                            defaultValue=""
                          >
                            <option value="">Asignar a producto...</option>
                            {productNames.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Estadísticas */}
        {Object.keys(uploadedImages).length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {Object.keys(uploadedImages).length}
                </p>
                <p className="text-sm text-gray-600">Imágenes subidas</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">
                  {Object.keys(uploadedImages).filter(key => productNames.includes(key)).length}
                </p>
                <p className="text-sm text-gray-600">Asignadas</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-600">
                  {Object.keys(uploadedImages).filter(key => !productNames.includes(key)).length}
                </p>
                <p className="text-sm text-gray-600">Sin asignar</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}