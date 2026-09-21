"use client";

import { useState } from "react";
import { Catalog, Product } from "@/types/catalog";
import {
  Plus,
  X,
  Upload,
  Save,
  Check,
  Store,
  Palette,
  Clock,
  Package,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { colorPalettes } from "@/utils/colorPalettes";
import ExcelImporter from "@/components/ExcelImporter";
import BulkImageUploader from "@/components/BulkImageUploader";
import PlanSelector from "@/components/PlanSelector";
import CatalogPreview from "@/components/CatalogPreview";
import CollapsibleSection from "@/components/CollapsibleSection";
import { PlanType, PremiumFeatures, BusinessHours } from "@/types/catalog";

interface CatalogFormProps {
  onSave: (catalog: Catalog) => void;
}

export default function CatalogForm({ onSave }: CatalogFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    storeName: "",
    logo: "",
    backgroundImage: "",
    businessInfo: "",
    whatsappNumber: "",
  });

  const [selectedPalette, setSelectedPalette] = useState(colorPalettes[0].id);
  const [theme, setTheme] = useState(colorPalettes[0].theme);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("standard");
  const [premiumFeatures, setPremiumFeatures] = useState<PremiumFeatures>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    monday: { open: "09:00", close: "18:00", closed: false },
    tuesday: { open: "09:00", close: "18:00", closed: false },
    wednesday: { open: "09:00", close: "18:00", closed: false },
    thursday: { open: "09:00", close: "18:00", closed: false },
    friday: { open: "09:00", close: "18:00", closed: false },
    saturday: { open: "09:00", close: "18:00", closed: false },
    sunday: { open: "09:00", close: "18:00", closed: true },
  });
  const [generalDiscount, setGeneralDiscount] = useState({
    enabled: false,
    percentage: 0,
    label: "",
  });
  const [currentProduct, setCurrentProduct] = useState({
    name: "",
    description: "",
    price: "",
    image: "",
    discountEnabled: false,
    discountPercentage: 0,
    discountLabel: "",
  });

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "background" | "product"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (type === "logo") {
          setFormData((prev) => ({ ...prev, logo: result }));
        } else if (type === "background") {
          setFormData((prev) => ({ ...prev, backgroundImage: result }));
        } else {
          setCurrentProduct((prev) => ({ ...prev, image: result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addProduct = () => {
    if (
      currentProduct.name &&
      currentProduct.description &&
      currentProduct.price
    ) {
      const newProduct: Product = {
        id: Date.now().toString(),
        name: currentProduct.name,
        description: currentProduct.description,
        price: parseFloat(currentProduct.price),
        image: currentProduct.image || undefined,
        discount: currentProduct.discountEnabled ? {
          enabled: true,
          percentage: currentProduct.discountPercentage,
          label: currentProduct.discountLabel || undefined,
        } : undefined,
      };
      setProducts([...products, newProduct]);
      setCurrentProduct({ 
        name: "", 
        description: "", 
        price: "", 
        image: "",
        discountEnabled: false,
        discountPercentage: 0,
        discountLabel: "",
      });
    }
  };

  const handleExcelImport = (importedProducts: Product[]) => {
    setProducts([...products, ...importedProducts]);
  };

  const handleBulkImagesUpload = (images: {
    [productName: string]: string;
  }) => {
    setProducts((prevProducts) =>
      prevProducts.map((product) => ({
        ...product,
        image: images[product.name] || product.image,
      }))
    );
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos requeridos
    if (!formData.name) {
      alert("Por favor ingresa el nombre del catálogo");
      return;
    }
    if (!formData.storeName) {
      alert("Por favor ingresa el nombre de la tienda");
      return;
    }
    if (!formData.businessInfo) {
      alert("Por favor ingresa la información del negocio");
      return;
    }
    if (!formData.whatsappNumber) {
      alert("Por favor ingresa el número de WhatsApp");
      return;
    }
    if (products.length === 0) {
      alert("Por favor agrega al menos un producto");
      return;
    }

    try {
      const catalog: Catalog = {
        id: Date.now().toString(),
        name: formData.name,
        storeName: formData.storeName,
        logo: formData.logo || undefined,
        backgroundImage: formData.backgroundImage || undefined,
        businessInfo: formData.businessInfo,
        whatsappNumber: formData.whatsappNumber,
        products,
        theme,
        planType: selectedPlan,
        premiumFeatures,
        businessHours,
        generalDiscount: generalDiscount.enabled ? generalDiscount : undefined,
        createdAt: new Date(),
      };

      console.log("💾 Guardando catálogo con plan:", selectedPlan);
      console.log("💎 Funciones premium:", premiumFeatures);
      console.log("📋 Catálogo completo:", catalog);

      onSave(catalog);
      alert("¡Catálogo guardado exitosamente!");
      router.push("/");
    } catch (error) {
      console.error("Error al guardar el catálogo:", error);
      alert("Error al guardar el catálogo. Por favor intenta de nuevo.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Crear Nuevo Catálogo
            </h1>
            <p className="text-gray-600">
              Completa la información para crear tu catálogo digital
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <motion.button
              type="submit"
              form="catalog-form"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                !formData.name ||
                !formData.storeName ||
                !formData.businessInfo ||
                !formData.whatsappNumber ||
                products.length === 0
              }
            >
              <Save size={16} />
              Guardar Catálogo
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar Form */}
        <div className="w-1/2 overflow-y-auto p-6">
          <form id="catalog-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <CollapsibleSection
              title="Información Básica"
              subtitle="Datos principales del catálogo"
              icon={<Store size={20} />}
              defaultOpen={true}
              badge="Requerido"
            >
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Catálogo *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      placeholder="Ej: Catálogo Primavera 2024"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Tienda *
                    </label>
                    <input
                      type="text"
                      value={formData.storeName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          storeName: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      placeholder="Ej: Boutique Elegancia"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de WhatsApp *
                  </label>
                  <input
                    type="text"
                    value={formData.whatsappNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        whatsappNumber: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Ej: 5491112345678"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formato: código país + área + número (sin espacios ni
                    guiones)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Información del Negocio *
                  </label>
                  <textarea
                    value={formData.businessInfo}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        businessInfo: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    rows={3}
                    placeholder="Describe brevemente tu negocio..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo del Negocio
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, "logo")}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label
                        htmlFor="logo-upload"
                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm"
                      >
                        <Upload size={14} />
                        Subir Logo
                      </label>
                      {formData.logo && (
                        <img
                          src={formData.logo}
                          alt="Logo"
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Imagen de Fondo
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, "background")}
                        className="hidden"
                        id="background-upload"
                      />
                      <label
                        htmlFor="background-upload"
                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm"
                      >
                        <Upload size={14} />
                        Subir Fondo
                      </label>
                      {formData.backgroundImage && (
                        <img
                          src={formData.backgroundImage}
                          alt="Fondo"
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Plan y Funciones */}
            <CollapsibleSection
              title="Plan y Funciones"
              subtitle="Selecciona el plan y configura las funciones"
              icon={<Settings size={20} />}
              defaultOpen={true}
            >
              <div className="mt-4">
                <PlanSelector
                  selectedPlan={selectedPlan}
                  features={premiumFeatures}
                  onPlanChange={setSelectedPlan}
                  onFeaturesChange={setPremiumFeatures}
                />
              </div>
            </CollapsibleSection>

            {/* Horarios de Atención */}
            <CollapsibleSection
              title="Horarios de Atención"
              subtitle="Configura cuándo está abierto tu negocio"
              icon={<Clock size={20} />}
            >
              <div className="space-y-3 mt-4">
                {[
                  { key: "monday", label: "Lunes" },
                  { key: "tuesday", label: "Martes" },
                  { key: "wednesday", label: "Miércoles" },
                  { key: "thursday", label: "Jueves" },
                  { key: "friday", label: "Viernes" },
                  { key: "saturday", label: "Sábado" },
                  { key: "sunday", label: "Domingo" },
                ].map(({ key, label }) => {
                  const dayKey = key as keyof BusinessHours;
                  const dayHours = businessHours[dayKey];

                  return (
                    <div
                      key={key}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-20">
                        <span className="text-sm font-medium text-gray-700">
                          {label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!dayHours.closed}
                          onChange={(e) => {
                            setBusinessHours((prev) => ({
                              ...prev,
                              [dayKey]: {
                                ...prev[dayKey],
                                closed: !e.target.checked,
                              },
                            }));
                          }}
                          className="rounded"
                        />
                        <span className="text-xs text-gray-600">Abierto</span>
                      </div>

                      {!dayHours.closed ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={dayHours.open}
                            onChange={(e) => {
                              setBusinessHours((prev) => ({
                                ...prev,
                                [dayKey]: {
                                  ...prev[dayKey],
                                  open: e.target.value,
                                },
                              }));
                            }}
                            className="border border-gray-300 rounded px-2 py-1 text-xs w-20 text-gray-900"
                          />
                          <span className="text-xs text-gray-500">a</span>
                          <input
                            type="time"
                            value={dayHours.close}
                            onChange={(e) => {
                              setBusinessHours((prev) => ({
                                ...prev,
                                [dayKey]: {
                                  ...prev[dayKey],
                                  close: e.target.value,
                                },
                              }));
                            }}
                            className="border border-gray-300 rounded px-2 py-1 text-xs w-20 text-gray-900"
                          />
                        </div>
                      ) : (
                        <span className="text-red-600 text-xs font-medium">
                          Cerrado
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>

            {/* Descuento General */}
            <CollapsibleSection
              title="Descuento General"
              subtitle="Aplica un descuento a todo el catálogo"
              icon={<span className="text-lg">🏷️</span>}
            >
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={generalDiscount.enabled}
                    onChange={(e) => {
                      setGeneralDiscount(prev => ({
                        ...prev,
                        enabled: e.target.checked
                      }));
                    }}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Activar descuento general</span>
                </div>

                {generalDiscount.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Porcentaje de descuento
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={generalDiscount.percentage}
                        onChange={(e) => {
                          setGeneralDiscount(prev => ({
                            ...prev,
                            percentage: parseInt(e.target.value) || 0
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        placeholder="Ej: 20"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Etiqueta del descuento (opcional)
                      </label>
                      <input
                        type="text"
                        value={generalDiscount.label}
                        onChange={(e) => {
                          setGeneralDiscount(prev => ({
                            ...prev,
                            label: e.target.value
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        placeholder="Ej: Oferta especial, Liquidación"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* Paleta de Colores */}
            <CollapsibleSection
              title="Paleta de Colores"
              subtitle="Elige los colores del catálogo"
              icon={<Palette size={20} />}
            >
              <div className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {colorPalettes.map((palette) => (
                    <motion.div
                      key={palette.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedPalette(palette.id);
                        setTheme(palette.theme);
                      }}
                      className={`relative cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                        selectedPalette === palette.id
                          ? "border-blue-500 ring-2 ring-blue-200"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {/* Preview de colores */}
                      <div className="h-12 flex">
                        <div
                          className="flex-1"
                          style={{
                            backgroundColor: palette.preview.background,
                          }}
                        />
                        <div
                          className="flex-1"
                          style={{ backgroundColor: palette.preview.primary }}
                        />
                        <div
                          className="flex-1"
                          style={{ backgroundColor: palette.preview.secondary }}
                        />
                      </div>

                      {/* Información */}
                      <div className="p-2">
                        <h3 className="font-medium text-xs text-gray-900">
                          {palette.name}
                        </h3>
                      </div>

                      {/* Check mark */}
                      {selectedPalette === palette.id && (
                        <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1">
                          <Check size={10} />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </CollapsibleSection>

            {/* Productos */}
            <CollapsibleSection
              title="Productos"
              subtitle={`${products.length} productos agregados`}
              icon={<Package size={20} />}
              badge="Requerido"
              defaultOpen={products.length === 0}
            >
              <div className="space-y-4 mt-4">
                {/* Importar desde Excel */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <ExcelImporter onImport={handleExcelImport} />
                </div>

                {/* Subir imágenes en lote */}
                {products.length > 0 && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <BulkImageUploader
                      onImagesUploaded={handleBulkImagesUpload}
                      productNames={products.map((p) => p.name)}
                    />
                  </div>
                )}

                {/* Agregar producto manual */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Agregar Producto Manual
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      value={currentProduct.name}
                      onChange={(e) =>
                        setCurrentProduct((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900"
                      placeholder="Nombre del producto"
                    />

                    <input
                      type="number"
                      step="0.01"
                      value={currentProduct.price}
                      onChange={(e) =>
                        setCurrentProduct((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900"
                      placeholder="Precio"
                    />
                  </div>

                  <textarea
                    value={currentProduct.description}
                    onChange={(e) =>
                      setCurrentProduct((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm mb-3 text-gray-900"
                    rows={2}
                    placeholder="Descripción del producto"
                  />

                  {/* Descuento individual */}
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={currentProduct.discountEnabled}
                        onChange={(e) =>
                          setCurrentProduct((prev) => ({
                            ...prev,
                            discountEnabled: e.target.checked,
                          }))
                        }
                        className="rounded"
                      />
                      <span className="text-xs font-medium text-gray-700">Descuento individual</span>
                    </div>

                    {currentProduct.discountEnabled && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min="1"
                          max="90"
                          value={currentProduct.discountPercentage}
                          onChange={(e) =>
                            setCurrentProduct((prev) => ({
                              ...prev,
                              discountPercentage: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-900"
                          placeholder="% desc."
                        />
                        <input
                          type="text"
                          value={currentProduct.discountLabel}
                          onChange={(e) =>
                            setCurrentProduct((prev) => ({
                              ...prev,
                              discountLabel: e.target.value,
                            }))
                          }
                          className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-900"
                          placeholder="Etiqueta"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "product")}
                      className="hidden"
                      id="product-image-upload"
                    />
                    <label
                      htmlFor="product-image-upload"
                      className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm"
                    >
                      <Upload size={14} />
                      Imagen
                    </label>
                    {currentProduct.image && (
                      <img
                        src={currentProduct.image}
                        alt="Producto"
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={addProduct}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors text-sm"
                  >
                    <Plus size={14} />
                    Agregar
                  </button>
                </div>

                {/* Lista de productos */}
                {products.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {products.map((product, index) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                            IMG
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {product.name}
                          </h4>
                          <p className="text-xs text-gray-600 truncate">
                            {product.description}
                          </p>
                          <p className="text-sm font-bold text-green-600">
                            ${product.price.toFixed(2)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProduct(product.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </form>
        </div>

        {/* Preview Panel */}
        <div className="w-1/2 bg-white border-l border-gray-200 p-6">
          <div className="sticky top-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Vista Previa
            </h3>
            <div
              className="border border-gray-200 rounded-lg overflow-hidden"
              style={{ height: "calc(100vh - 200px)" }}
            >
              <CatalogPreview
                storeName={formData.storeName}
                logo={formData.logo}
                backgroundImage={formData.backgroundImage}
                businessInfo={formData.businessInfo}
                whatsappNumber={formData.whatsappNumber}
                products={products}
                theme={theme}
                features={premiumFeatures}
                generalDiscount={generalDiscount.enabled ? generalDiscount : undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
