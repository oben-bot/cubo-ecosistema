"use client";

import { useState } from "react";
import { BusinessHours } from "@/types/catalog";
import { X, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BusinessHoursPopupProps {
  isOpen: boolean;
  onClose: () => void;
  businessHours?: BusinessHours;
  storeName: string;
}

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export default function BusinessHoursPopup({
  isOpen,
  onClose,
  businessHours,
  storeName,
}: BusinessHoursPopupProps) {
  const getCurrentStatus = () => {
    if (!businessHours) return { isOpen: false, message: "Horarios no configurados" };

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

    // Convert day index to our key format
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayKey = dayKeys[currentDay] as keyof BusinessHours;
    const todayHours = businessHours[todayKey];

    if (todayHours.closed) {
      return { isOpen: false, message: "Cerrado hoy" };
    }

    const openTime = parseInt(todayHours.open.split(':')[0]) * 60 + parseInt(todayHours.open.split(':')[1]);
    const closeTime = parseInt(todayHours.close.split(':')[0]) * 60 + parseInt(todayHours.close.split(':')[1]);

    if (currentTime >= openTime && currentTime <= closeTime) {
      return { isOpen: true, message: `Abierto hasta las ${todayHours.close}` };
    } else if (currentTime < openTime) {
      return { isOpen: false, message: `Abre a las ${todayHours.open}` };
    } else {
      return { isOpen: false, message: "Cerrado" };
    }
  };

  const status = getCurrentStatus();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black bg-opacity-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${status.isOpen ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Clock size={20} className={status.isOpen ? 'text-green-600' : 'text-red-600'} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Horarios de {storeName}
                  </h2>
                  <p className={`text-sm font-medium ${status.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                    {status.message}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {businessHours ? (
                <div className="space-y-3">
                  {DAYS.map(({ key, label }) => {
                    const dayHours = businessHours[key as keyof BusinessHours];
                    return (
                      <div key={key} className="flex items-center justify-between py-2">
                        <span className="font-medium text-gray-700">{label}</span>
                        <span className="text-gray-600">
                          {dayHours.closed ? (
                            <span className="text-red-600 font-medium">Cerrado</span>
                          ) : (
                            `${dayHours.open} - ${dayHours.close}`
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    Los horarios de atención no han sido configurados.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}