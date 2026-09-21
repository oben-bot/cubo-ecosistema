"use client";

import { useState } from "react";
import { PlanType, PremiumFeatures } from "@/types/catalog";
import { Crown, Star, Zap, Check, X } from "lucide-react";
import { motion } from "framer-motion";

interface PlanSelectorProps {
  selectedPlan: PlanType;
  features: PremiumFeatures;
  onPlanChange: (plan: PlanType) => void;
  onFeaturesChange: (features: PremiumFeatures) => void;
}

const PLAN_CONFIGS = {
  standard: {
    name: "Estándar",
    price: "$25",
    color: "bg-gray-500",
    icon: Star,
    description: "Catálogo básico profesional",
    features: [],
  },
  medium: {
    name: "Medium",
    price: "$50",
    color: "bg-blue-500",
    icon: Zap,
    description: "Incluye WhatsApp y contacto",
    features: ["whatsapp", "contactInfo"],
  },
  premium: {
    name: "Premium",
    price: "$100",
    color: "bg-purple-500",
    icon: Crown,
    description: "Todas las funciones avanzadas",
    features: [
      "whatsapp",
      "contactInfo",
      "socialMedia",
      "shoppingCart",
      "googleMaps",
      "categories",

      "shareProducts",
      "darkMode",
      "analytics",
    ],
  },
};

export default function PlanSelector({
  selectedPlan,
  features,
  onPlanChange,
  onFeaturesChange,
}: PlanSelectorProps) {
  const updateFeature = (featureName: string, enabled: boolean, data?: any) => {
    const newFeatures = {
      ...features,
      [featureName]: {
        enabled,
        ...data,
      },
    };
    onFeaturesChange(newFeatures);
  };

  const handlePlanChange = (plan: PlanType) => {
    onPlanChange(plan);

    // Auto-configurar funciones según el plan
    const planFeatures = PLAN_CONFIGS[plan].features;
    const newFeatures: PremiumFeatures = {};

    // Activar funciones del plan seleccionado con datos por defecto
    planFeatures.forEach((feature) => {
      if (feature === "whatsapp") {
        newFeatures.whatsapp = { enabled: true, number: "+54 9 11 1234-5678" };
      } else if (feature === "contactInfo") {
        newFeatures.contactInfo = {
          enabled: true,
          phone: "",
          address: "",
          hours: "",
        };
      } else if (feature === "socialMedia") {
        newFeatures.socialMedia = {
          enabled: true,
          instagram: "",
          facebook: "",
          tiktok: "",
        };
      } else if (feature === "shoppingCart") {
        newFeatures.shoppingCart = { enabled: true };
      } else if (feature === "googleMaps") {
        newFeatures.googleMaps = { enabled: true, address: "", embedUrl: "" };
      } else if (feature === "categories") {
        newFeatures.categories = { enabled: true };
      } else if (feature === "shareProducts") {
        newFeatures.shareProducts = { enabled: true };
      } else if (feature === "darkMode") {
        newFeatures.darkMode = { enabled: true };
      } else if (feature === "analytics") {
        newFeatures.analytics = { enabled: true };
      }
    });

    console.log("Setting features for plan", plan, ":", newFeatures);
    onFeaturesChange(newFeatures);
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4">
        Seleccionar Plan del Cliente
      </h2>

      {/* Selector de planes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {Object.entries(PLAN_CONFIGS).map(([planKey, config]) => {
          const Icon = config.icon;
          const isSelected = selectedPlan === planKey;

          return (
            <motion.div
              key={planKey}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePlanChange(planKey as PlanType)}
              className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-full text-white ${config.color}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{config.name}</h3>
                  <p className="text-sm text-gray-500">{config.price}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">{config.description}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Configuración de funciones */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Configurar Funciones
        </h3>

        {/* MEDIUM FEATURES */}
        <div className="space-y-4">
          <h4 className="font-medium text-blue-600 flex items-center gap-2">
            <Zap size={16} />
            Funciones Medium
          </h4>

          {/* WhatsApp */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h5 className="font-medium text-gray-900">Botón WhatsApp</h5>
              <p className="text-sm text-gray-600">
                Botón flotante para contacto directo
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  updateFeature("whatsapp", !features.whatsapp?.enabled)
                }
                className={`flex items-center justify-center w-12 h-6 rounded-full transition-colors ${
                  features.whatsapp?.enabled ? "bg-green-600" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    features.whatsapp?.enabled
                      ? "translate-x-3"
                      : "translate-x-1"
                  }`}
                />
              </button>
              {features.whatsapp?.enabled && (
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    placeholder="5491112345678"
                    value={features.whatsapp?.number || ""}
                    onChange={(e) =>
                      updateFeature("whatsapp", true, { number: e.target.value })
                    }
                    className="text-sm border border-gray-300 rounded px-2 py-1 w-40"
                  />
                  <span className="text-xs text-gray-500">
                    Formato: 5491112345678
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Información de contacto */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h5 className="font-medium text-gray-900">
                  Información de Contacto
                </h5>
                <p className="text-sm text-gray-600">
                  Teléfono, dirección y horarios adicionales
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateFeature("contactInfo", !features.contactInfo?.enabled)
                }
                className={`flex items-center justify-center w-12 h-6 rounded-full transition-colors ${
                  features.contactInfo?.enabled ? "bg-green-600" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    features.contactInfo?.enabled
                      ? "translate-x-3"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            
            {features.contactInfo?.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="Ej: +54 11 1234-5678"
                    value={features.contactInfo?.phone || ""}
                    onChange={(e) =>
                      updateFeature("contactInfo", true, {
                        ...features.contactInfo,
                        phone: e.target.value,
                      })
                    }
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Dirección</label>
                  <input
                    type="text"
                    placeholder="Ej: Av. Corrientes 1234, CABA"
                    value={features.contactInfo?.address || ""}
                    onChange={(e) =>
                      updateFeature("contactInfo", true, {
                        ...features.contactInfo,
                        address: e.target.value,
                      })
                    }
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Horarios Especiales</label>
                  <input
                    type="text"
                    placeholder="Ej: Feriados cerrado, Delivery 24hs"
                    value={features.contactInfo?.hours || ""}
                    onChange={(e) =>
                      updateFeature("contactInfo", true, {
                        ...features.contactInfo,
                        hours: e.target.value,
                      })
                    }
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PREMIUM FEATURES */}
        <div className="space-y-4">
          <h4 className="font-medium text-purple-600 flex items-center gap-2">
            <Crown size={16} />
            Funciones Premium
          </h4>

          {/* Redes Sociales */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h5 className="font-medium text-gray-900">Redes Sociales</h5>
                <p className="text-sm text-gray-600">
                  Links a Instagram, Facebook, TikTok
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateFeature("socialMedia", !features.socialMedia?.enabled)
                }
                className={`flex items-center justify-center w-12 h-6 rounded-full transition-colors ${
                  features.socialMedia?.enabled ? "bg-green-600" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    features.socialMedia?.enabled
                      ? "translate-x-3"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            
            {features.socialMedia?.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Instagram</label>
                  <input
                    type="text"
                    placeholder="https://instagram.com/tu_usuario"
                    value={features.socialMedia?.instagram || ""}
                    onChange={(e) =>
                      updateFeature("socialMedia", true, {
                        ...features.socialMedia,
                        instagram: e.target.value,
                      })
                    }
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Facebook</label>
                  <input
                    type="text"
                    placeholder="https://facebook.com/tu_pagina"
                    value={features.socialMedia?.facebook || ""}
                    onChange={(e) =>
                      updateFeature("socialMedia", true, {
                        ...features.socialMedia,
                        facebook: e.target.value,
                      })
                    }
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">TikTok</label>
                  <input
                    type="text"
                    placeholder="https://tiktok.com/@tu_usuario"
                    value={features.socialMedia?.tiktok || ""}
                    onChange={(e) =>
                      updateFeature("socialMedia", true, {
                        ...features.socialMedia,
                        tiktok: e.target.value,
                      })
                    }
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Carrito de Compras */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h5 className="font-medium text-gray-900">Carrito de Compras</h5>
              <p className="text-sm text-gray-600">
                Selección múltiple + WhatsApp checkout
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                updateFeature("shoppingCart", !features.shoppingCart?.enabled)
              }
              className={`flex items-center justify-center w-12 h-6 rounded-full transition-colors ${
                features.shoppingCart?.enabled ? "bg-green-600" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  features.shoppingCart?.enabled
                    ? "translate-x-3"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Google Maps */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h5 className="font-medium text-gray-900">Google Maps</h5>
                <p className="text-sm text-gray-600">
                  Ubicación del local integrada
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateFeature("googleMaps", !features.googleMaps?.enabled)
                }
                className={`flex items-center justify-center w-12 h-6 rounded-full transition-colors ${
                  features.googleMaps?.enabled ? "bg-green-600" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    features.googleMaps?.enabled
                      ? "translate-x-3"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            
            {features.googleMaps?.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Dirección del Local</label>
                  <input
                    type="text"
                    placeholder="Ej: Av. Corrientes 1234, Buenos Aires"
                    value={features.googleMaps?.address || ""}
                    onChange={(e) =>
                      updateFeature("googleMaps", true, {
                        ...features.googleMaps,
                        address: e.target.value,
                      })
                    }
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Link de Google Maps (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="https://maps.google.com/..."
                    value={features.googleMaps?.embedUrl || ""}
                    onChange={(e) =>
                      updateFeature("googleMaps", true, {
                        ...features.googleMaps,
                        embedUrl: e.target.value,
                      })
                    }
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Puedes obtener el link desde Google Maps → Compartir → Insertar un mapa
                  </p>
                </div>
              </div>
            )}
          </div>



          {/* Compartir Productos */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h5 className="font-medium text-gray-900">Compartir Productos</h5>
              <p className="text-sm text-gray-600">
                Compartir productos individuales por WhatsApp
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                updateFeature("shareProducts", !features.shareProducts?.enabled)
              }
              className={`flex items-center justify-center w-12 h-6 rounded-full transition-colors ${
                features.shareProducts?.enabled ? "bg-green-600" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  features.shareProducts?.enabled
                    ? "translate-x-3"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Modo Nocturno */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h5 className="font-medium text-gray-900">Modo Nocturno</h5>
              <p className="text-sm text-gray-600">
                Toggle entre tema claro y oscuro
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                updateFeature("darkMode", !features.darkMode?.enabled)
              }
              className={`flex items-center justify-center w-12 h-6 rounded-full transition-colors ${
                features.darkMode?.enabled ? "bg-green-600" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  features.darkMode?.enabled ? "translate-x-3" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Resumen del plan */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">
          Plan Seleccionado: {PLAN_CONFIGS[selectedPlan].name}
        </h4>
        <p className="text-sm text-blue-800">
          Funciones activas:{" "}
          {Object.values(features).filter((f) => f?.enabled).length}
        </p>
      </div>
    </div>
  );
}
