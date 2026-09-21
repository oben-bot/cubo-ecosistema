'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Share2, Download } from 'lucide-react';
import { motion } from 'framer-motion';

interface QRGeneratorProps {
  url: string;
  catalogName: string;
  storeName?: string;
}

export default function QRGenerator({ url, catalogName, storeName }: QRGeneratorProps) {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      // Aquí podrías agregar una notificación de éxito
      alert('¡Link copiado al portapapeles!');
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById('qr-code');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `qr-${(storeName || catalogName).toLowerCase().replace(/\s+/g, '-')}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-lg shadow-lg border border-purple-200 p-6"
    >
      <h3 className="text-lg font-semibold text-purple-900 mb-4 text-center">
        Compartir Catálogo
      </h3>
      
      <div className="flex flex-col items-center space-y-4">
        <div className="bg-white p-4 rounded-lg border-2 border-purple-200">
          <QRCodeSVG
            id="qr-code"
            value={url}
            size={200}
            level="M"
            includeMargin={true}
          />
        </div>
        
        <div className="w-full">
          <label className="block text-sm font-medium text-purple-700 mb-2">
            Link del catálogo:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              readOnly
              className="flex-1 px-3 py-2 border border-purple-300 rounded-lg bg-purple-50 text-sm text-purple-900"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={copyToClipboard}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Share2 size={16} />
            </motion.button>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={downloadQR}
          className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors"
        >
          <Download size={16} />
          Descargar QR
        </motion.button>
      </div>
    </motion.div>
  );
}