'use client';

import { Phone, MapPin, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface ContactInfoProps {
  phone?: string;
  address?: string;
  hours?: string;
}

export default function ContactInfo({ phone, address, hours }: ContactInfoProps) {
  if (!phone && !address && !hours) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6 mb-8"
    >
      <h3 className="text-xl font-semibold text-white mb-4">Información de Contacto</h3>
      
      <div className="space-y-3">
        {phone && (
          <div className="flex items-center gap-3 text-white">
            <Phone size={18} className="text-white opacity-80" />
            <a 
              href={`tel:${phone}`}
              className="hover:underline opacity-90 hover:opacity-100 transition-opacity"
            >
              {phone}
            </a>
          </div>
        )}
        
        {address && (
          <div className="flex items-center gap-3 text-white">
            <MapPin size={18} className="text-white opacity-80" />
            <span className="opacity-90">{address}</span>
          </div>
        )}
        
        {hours && (
          <div className="flex items-center gap-3 text-white">
            <Clock size={18} className="text-white opacity-80" />
            <span className="opacity-90">{hours}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}