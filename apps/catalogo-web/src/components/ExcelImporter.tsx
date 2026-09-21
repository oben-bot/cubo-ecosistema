'use client';

import { useState } from 'react';
import { Product } from '@/types/catalog';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';

interface ExcelImporterProps {
  onImport: (products: Product[]) => void;
}

export default function ExcelImporter({ onImport }: ExcelImporterProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const downloadTemplate = () => {
    // Crear template de Excel
    const templateData = [
      {
        nombre: 'Hamburguesa Clásica',
        descripcion: 'Deliciosa hamburguesa con carne, lechuga, tomate y queso',
        precio: 12.99,
        imagen: 'https://ejemplo.com/imagen.jpg (opcional)'
      },
      {
        nombre: 'Pizza Margherita',
        descripcion: 'Pizza tradicional con tomate, mozzarella y albahaca',
        precio: 15.50,
        imagen: ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    
    // Ajustar ancho de columnas
    ws['!cols'] = [
      { width: 20 }, // nombre
      { width: 50 }, // descripcion
      { width: 10 }, // precio
      { width: 40 }  // imagen
    ];

    XLSX.writeFile(wb, 'template-productos.xlsx');
  };

  const extractImagesFromExcel = async (file: File): Promise<{ [key: string]: string }> => {
    // Esta función extraería imágenes incrustadas del Excel
    // Por ahora retornamos un objeto vacío ya que requiere librerías adicionales
    return {};
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Intentar extraer imágenes incrustadas (funcionalidad futura)
      const extractedImages = await extractImagesFromExcel(file);

      const products: Product[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      jsonData.forEach((row: any, index: number) => {
        const rowNumber = index + 2; // +2 porque Excel empieza en 1 y hay header

        // Validar campos requeridos
        if (!row.nombre || !row.descripcion || !row.precio) {
          errors.push(`Fila ${rowNumber}: Faltan campos obligatorios (nombre, descripción, precio)`);
          return;
        }

        // Validar precio
        const precio = parseFloat(row.precio);
        if (isNaN(precio) || precio <= 0) {
          errors.push(`Fila ${rowNumber}: El precio debe ser un número mayor a 0`);
          return;
        }

        // Manejar imagen
        let imageUrl: string | undefined;
        if (row.imagen && row.imagen.toString().trim()) {
          const imageValue = row.imagen.toString().trim();
          
          // Verificar si es una URL válida
          try {
            new URL(imageValue);
            imageUrl = imageValue;
          } catch {
            // Si no es URL válida, podría ser referencia a imagen incrustada
            warnings.push(`Fila ${rowNumber}: "${imageValue}" no es una URL válida. Se omitirá la imagen.`);
          }
        }

        // Crear producto
        const product: Product = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: row.nombre.toString().trim(),
          description: row.descripcion.toString().trim(),
          price: precio,
          image: imageUrl
        };

        products.push(product);
      });

      if (errors.length > 0) {
        setError(`Se encontraron errores:\n${errors.join('\n')}`);
        setIsProcessing(false);
        return;
      }

      if (products.length === 0) {
        setError('No se encontraron productos válidos en el archivo');
        setIsProcessing(false);
        return;
      }

      // Mostrar advertencias si las hay
      let successMessage = `✅ Se importaron ${products.length} productos correctamente`;
      if (warnings.length > 0) {
        successMessage += `\n\n⚠️ Advertencias:\n${warnings.join('\n')}`;
      }

      // Importar productos
      onImport(products);
      setSuccess(successMessage);
      
      // Limpiar input
      e.target.value = '';

    } catch (err) {
      setError('Error al procesar el archivo. Asegúrate de que sea un archivo Excel válido.');
    }

    setIsProcessing(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <FileSpreadsheet size={20} />
        Importar desde Excel
      </h2>
      
      <div className="space-y-4">
        {/* Instrucciones */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Instrucciones</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Descarga la plantilla de Excel</li>
            <li>Completa los datos: <strong>nombre</strong>, <strong>descripción</strong>, <strong>precio</strong></li>
            <li>Para imágenes tienes 2 opciones:</li>
            <ul className="ml-4 mt-1 space-y-1 list-disc list-inside">
              <li><strong>URLs:</strong> Pega links de imágenes en la columna "imagen"</li>
              <li><strong>Archivos:</strong> Deja vacía la columna "imagen" y usa el cargador de imágenes después</li>
            </ul>
            <li>Sube el archivo Excel completado</li>
            <li>Si no pusiste URLs, usa el "Subir Imágenes en Lote" que aparecerá abajo</li>
          </ol>
        </div>

        {/* Botón descargar template */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={downloadTemplate}
          className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Download size={16} />
          Descargar Plantilla de Excel
        </motion.button>

        {/* Upload de archivo */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="excel-upload"
            disabled={isProcessing}
          />
          <label
            htmlFor="excel-upload"
            className={`cursor-pointer ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Upload size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600">
              {isProcessing ? 'Procesando archivo...' : 'Haz clic para subir tu archivo Excel'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Formatos soportados: .xlsx, .xls
            </p>
          </label>
        </div>

        {/* Mensajes de estado */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2"
          >
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900">Error al importar</h4>
              <pre className="text-sm text-red-800 mt-1 whitespace-pre-wrap">{error}</pre>
            </div>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2"
          >
            <CheckCircle size={20} className="text-green-600" />
            <p className="text-green-800">{success}</p>
          </motion.div>
        )}

        {/* Ejemplo de formato */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">📝 Formato esperado</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left font-semibold">nombre</th>
                  <th className="px-3 py-2 text-left font-semibold">descripcion</th>
                  <th className="px-3 py-2 text-left font-semibold">precio</th>
                  <th className="px-3 py-2 text-left font-semibold">imagen</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2 border-t">Hamburguesa Clásica</td>
                  <td className="px-3 py-2 border-t">Deliciosa hamburguesa con...</td>
                  <td className="px-3 py-2 border-t">12.99</td>
                  <td className="px-3 py-2 border-t text-gray-500">https://... (opcional)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}