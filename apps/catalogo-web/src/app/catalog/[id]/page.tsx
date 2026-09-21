"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Catalog } from "@/types/catalog";
import ProductCard from "@/components/ProductCard";
import MobileProductCard from "@/components/MobileProductCard";
import QRGenerator from "@/components/QRGenerator";
import WhatsAppButton from "@/components/WhatsAppButton";
import SocialMediaLinks from "@/components/SocialMediaLinks";
import CartModal from "@/components/CartModal";
import DarkModeToggle from "@/components/DarkModeToggle";
import BusinessHoursPopup from "@/components/BusinessHoursPopup";
import { CartProvider } from "@/contexts/CartContext";
import { ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function CatalogView() {
  const params = useParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [currentUrl, setCurrentUrl] = useState("");
  const [showHoursPopup, setShowHoursPopup] = useState(false);

  useEffect(() => {
    const cargarCatalogo = async () => {
      // 1. Intentar Drive primero (modo producción real: el catálogo vive
      //    en la nube del dueño del negocio, visible para cualquiera con el link).
      try {
        const res = await fetch(`/api/public-catalog/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setCatalog(data.catalog);
          setCurrentUrl(window.location.href);
          return;
        }
      } catch {
        // Si falla (ej. no es un fileId de Drive), seguimos al modo local.
      }

      // 2. Modo local/demo: el catálogo se creó sin iniciar sesión con Google.
      const savedCatalogs = localStorage.getItem("catalogs");
      if (savedCatalogs) {
        const catalogs: Catalog[] = JSON.parse(savedCatalogs);
        const foundCatalog = catalogs.find((c) => c.id === params.id);
        setCatalog(foundCatalog || null);
      }

      setCurrentUrl(window.location.href);
    };

    cargarCatalogo();
  }, [params.id]);

  if (!catalog) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Catálogo no encontrado
          </h1>
          <p className="text-gray-600">
            El catálogo que buscas no existe o ha sido eliminado.
          </p>
        </div>
      </div>
    );
  }

  // Asegurar compatibilidad con catálogos antiguos
  const features = catalog.premiumFeatures || {};
  const planType = catalog.planType || "standard";

  // Debug: mostrar en consola qué funciones están activas
  console.log("📊 Catálogo cargado:");
  console.log("Plan type:", planType);
  console.log("Features:", features);
  console.log("WhatsApp enabled:", features.whatsapp?.enabled);
  console.log("WhatsApp number:", features.whatsapp?.number);

  return (
    <CartProvider>
      <div
        className="min-h-screen"
        style={{
          backgroundColor: catalog.theme.backgroundColor,
          fontFamily: catalog.theme.fontFamily,
        }}
      >
        {/* Mobile Hero Section */}
        <div className="block md:hidden">
          <div
            className="relative h-64 flex items-end"
            style={{
              backgroundImage: catalog.backgroundImage
                ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${catalog.backgroundImage})`
                : `linear-gradient(135deg, ${catalog.theme.primaryColor}, ${catalog.theme.secondaryColor})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Status button */}
            <button
              onClick={() => setShowHoursPopup(true)}
              className="absolute top-4 right-4 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <div className="w-2 h-2 bg-white rounded-full"></div>
              Horarios
            </button>

            {/* Modo nocturno */}
            {features.darkMode?.enabled && (
              <div className="absolute top-4 left-4">
                <DarkModeToggle />
              </div>
            )}

            {/* Logo y nombre */}
            <div className="w-full p-6">
              <div className="flex items-center gap-4 mb-4">
                {catalog.logo && (
                  <img
                    src={catalog.logo}
                    alt={catalog.storeName}
                    className="w-16 h-16 rounded-lg object-cover shadow-lg"
                  />
                )}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white mb-1">
                    {catalog.storeName}
                  </h1>
                  {/* Redes sociales */}
                  {features.socialMedia?.enabled && (
                    <div className="flex gap-2">
                      {features.socialMedia.instagram && (
                        <a
                          href={features.socialMedia.instagram}
                          target="_blank"
                          className="text-white opacity-80"
                        >
                          📷
                        </a>
                      )}
                      {features.socialMedia.facebook && (
                        <a
                          href={features.socialMedia.facebook}
                          target="_blank"
                          className="text-white opacity-80"
                        >
                          📘
                        </a>
                      )}
                      {features.socialMedia.tiktok && (
                        <a
                          href={features.socialMedia.tiktok}
                          target="_blank"
                          className="text-white opacity-80"
                        >
                          🎵
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Info y botones */}
              {features.googleMaps?.enabled && features.googleMaps.address && (
                <div className="bg-black bg-opacity-30 rounded-lg p-3">
                  <button
                    onClick={() => {
                      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        features.googleMaps?.address || ""
                      )}`;
                      window.open(mapsUrl, "_blank");
                    }}
                    className="flex items-center gap-2 text-white text-sm underline"
                  >
                    <MapPin size={14} />
                    Ver ubicación
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Hero Section */}
        <div className="hidden md:block">
          <div
            className="relative min-h-[60vh] flex items-center justify-center"
            style={{
              backgroundImage: catalog.backgroundImage
                ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${catalog.backgroundImage})`
                : `linear-gradient(135deg, ${catalog.theme.primaryColor}, ${catalog.theme.secondaryColor})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Redes sociales (esquina superior derecha) */}
            {features.socialMedia?.enabled && (
              <div className="absolute top-4 right-4 flex gap-2">
                {features.socialMedia.instagram && (
                  <motion.a
                    href={features.socialMedia.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    className="p-2 rounded-full bg-white bg-opacity-20 backdrop-blur-sm text-white hover:bg-opacity-30 transition-all"
                  >
                    📷
                  </motion.a>
                )}
                {features.socialMedia.facebook && (
                  <motion.a
                    href={features.socialMedia.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    className="p-2 rounded-full bg-white bg-opacity-20 backdrop-blur-sm text-white hover:bg-opacity-30 transition-all"
                  >
                    📘
                  </motion.a>
                )}
                {features.socialMedia.tiktok && (
                  <motion.a
                    href={features.socialMedia.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    className="p-2 rounded-full bg-white bg-opacity-20 backdrop-blur-sm text-white hover:bg-opacity-30 transition-all"
                  >
                    🎵
                  </motion.a>
                )}
              </div>
            )}

            {/* Modo nocturno (esquina superior izquierda) */}
            {features.darkMode?.enabled && (
              <div className="absolute top-4 left-4">
                <DarkModeToggle />
              </div>
            )}

            {/* Contenido del hero */}
            <div className="text-center text-white px-6 max-w-4xl mx-auto">
              {catalog.logo && (
                <motion.img
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={catalog.logo}
                  alt={catalog.storeName}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover mx-auto mb-6 shadow-2xl border-4 border-white"
                />
              )}

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-6xl font-bold mb-4 text-shadow"
              >
                {catalog.storeName}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto leading-relaxed"
              >
                {catalog.businessInfo}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-8"
              >
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <div
                    className="inline-block px-6 py-2 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.2)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    {catalog.products.length} producto
                    {catalog.products.length !== 1 ? "s" : ""} disponible
                    {catalog.products.length !== 1 ? "s" : ""}
                  </div>

                  {/* Ubicación (Premium) */}
                  {features.googleMaps?.enabled &&
                    features.googleMaps.address && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            features.googleMaps?.address || ""
                          )}`;
                          window.open(mapsUrl, "_blank");
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white bg-opacity-20 backdrop-blur-sm hover:bg-opacity-30 transition-all"
                      >
                        <MapPin size={16} />
                        Ver Ubicación
                      </motion.button>
                    )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Mobile Products Section */}
        <div
          className="block md:hidden min-h-screen"
          style={{ backgroundColor: catalog.theme.backgroundColor }}
        >
          <div className="px-4 py-6">
            <h2
              className="text-2xl font-bold mb-6"
              style={{ color: catalog.theme.textColor }}
            >
              Nuestros Productos
            </h2>

            {catalog.products.map((product, index) => (
              <MobileProductCard
                key={product.id}
                product={product}
                index={index}
                theme={catalog.theme}
                features={features}
                storeName={catalog.storeName}
              />
            ))}
          </div>
        </div>

        {/* Desktop Products Section */}
        <div className="hidden md:block py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <h2
                className="text-3xl md:text-4xl font-bold mb-4"
                style={{ color: catalog.theme.textColor }}
              >
                Nuestros Productos
              </h2>
              <div
                className="w-24 h-1 mx-auto rounded-full mb-6"
                style={{ backgroundColor: catalog.theme.primaryColor }}
              />
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {catalog.products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  theme={catalog.theme}
                  features={features}
                  storeName={catalog.storeName}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer elegante */}
        <footer
          className="relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${catalog.theme.primaryColor}, ${catalog.theme.secondaryColor})`,
          }}
        >
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative max-w-6xl mx-auto px-6 py-12 text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              {catalog.logo && (
                <img
                  src={catalog.logo}
                  alt={catalog.storeName}
                  className="w-12 h-12 rounded-full object-cover shadow-lg"
                />
              )}
              <span
                className="text-2xl font-bold"
                style={{ color: catalog.theme.textColor }}
              >
                {catalog.storeName}
              </span>
            </div>

            <p
              className="text-lg opacity-90 mb-6 max-w-2xl mx-auto"
              style={{ color: catalog.theme.textColor }}
            >
              {catalog.businessInfo}
            </p>

            {/* Redes sociales (solo Premium) */}
            {features.socialMedia?.enabled && (
              <SocialMediaLinks
                instagram={features.socialMedia.instagram}
                facebook={features.socialMedia.facebook}
                tiktok={features.socialMedia.tiktok}
              />
            )}

            <div className="border-t border-white border-opacity-20 pt-6 mt-6">
              <p
                className="text-sm opacity-70"
                style={{ color: catalog.theme.textColor }}
              >
                Catálogo digital •{" "}
                {new Date(catalog.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </footer>

        {/* WhatsApp Button (Siempre disponible) */}
        {catalog.whatsappNumber && (
          <WhatsAppButton
            phoneNumber={catalog.whatsappNumber}
            storeName={catalog.storeName}
          />
        )}

        {/* Carrito Modal (Premium) */}
        {features.shoppingCart?.enabled && catalog.whatsappNumber && (
            <CartModal
              storeName={catalog.storeName}
              whatsappNumber={catalog.whatsappNumber}
            />
          )}

        {/* Business Hours Popup */}
        <BusinessHoursPopup
          isOpen={showHoursPopup}
          onClose={() => setShowHoursPopup(false)}
          businessHours={catalog.businessHours}
          storeName={catalog.storeName}
        />
      </div>
    </CartProvider>
  );
}
