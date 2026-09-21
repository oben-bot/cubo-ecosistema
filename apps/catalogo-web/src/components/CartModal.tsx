"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, X, Plus, Minus, MessageCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

interface CartModalProps {
  storeName: string;
  whatsappNumber: string;
}

export default function CartModal({
  storeName,
  whatsappNumber,
}: CartModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotalItems,
    getTotalPrice,
  } = useCart();

  const formatPhoneNumber = (phone: string): string => {
    // Remover todos los caracteres que no sean números
    let cleanNumber = phone.replace(/\D/g, "");

    // Si el número empieza con 0, removerlo (formato local argentino)
    if (cleanNumber.startsWith("0")) {
      cleanNumber = cleanNumber.substring(1);
    }

    // Si no tiene código de país, agregar 54 (Argentina)
    if (!cleanNumber.startsWith("54") && cleanNumber.length >= 10) {
      cleanNumber = "54" + cleanNumber;
    }

    // Si empieza con +54, remover el +
    if (cleanNumber.startsWith("+54")) {
      cleanNumber = cleanNumber.substring(1);
    }

    return cleanNumber;
  };

  const handleWhatsAppCheckout = () => {
    if (items.length === 0) return;

    try {
      const orderDetails = items
        .map(
          (item) =>
            `• ${item.product.name} x${item.quantity} - $${(
              item.product.price * item.quantity
            ).toFixed(2)}`
        )
        .join("\n");

      const total = getTotalPrice();

      const message = `¡Hola ${storeName}!\n\nQuiero hacer el siguiente pedido:\n\n${orderDetails}\n\nTOTAL: $${total.toFixed(
        2
      )}\n\n¿Cómo puedo proceder con el pago?\n\n¡Gracias!`;

      const cleanPhone = formatPhoneNumber(whatsappNumber);

      if (cleanPhone.length < 10) {
        alert(
          "El número de teléfono no es válido. Por favor verifica el formato."
        );
        return;
      }

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

      console.log("📱 Número original:", whatsappNumber);
      console.log("📱 Número limpio:", cleanPhone);
      console.log("🔗 URL de WhatsApp:", whatsappUrl);

      // Intentar abrir en la app de WhatsApp primero, luego en web
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

      if (isMobile) {
        // En móvil, intentar abrir la app directamente
        window.location.href = `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;

        // Fallback a WhatsApp Web después de un delay
        setTimeout(() => {
          window.open(whatsappUrl, "_blank");
        }, 1000);
      } else {
        // En desktop, abrir WhatsApp Web directamente
        window.open(whatsappUrl, "_blank");
      }

      // Limpiar carrito después de enviar
      clearCart();
      setIsOpen(false);
    } catch (error) {
      console.error("Error al abrir WhatsApp:", error);
      alert(
        "Error al abrir WhatsApp. Por favor verifica el número de teléfono."
      );
    }
  };

  if (getTotalItems() === 0) return null;

  return (
    <>
      {/* Botón flotante */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 md:bottom-20 md:right-6 md:left-auto md:transform-none bg-orange-500 text-white px-6 py-3 rounded-full shadow-lg hover:bg-orange-600 transition-colors z-40 flex items-center gap-2 font-bold"
      >
        <ShoppingCart size={20} />
        <span className="hidden md:inline">Ver Productos</span>
        <span className="md:hidden">Ver Carrito</span>
        <span>({getTotalItems()})</span>
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
          {getTotalItems()}
        </div>
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingCart size={20} />
                  Mi Pedido
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Items */}
              <div className="p-4 max-h-96 overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-b-0"
                  >
                    {item.product.image && (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}

                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {item.product.name}
                      </h3>
                      <p className="text-green-600 font-bold text-sm">
                        ${item.product.price.toFixed(2)}
                      </p>
                    </div>

                    {/* Controles de cantidad */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <Minus size={14} />
                      </button>

                      <span className="w-8 text-center font-semibold">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Eliminar */}
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-red-500 hover:text-red-700 transition-colors p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-gray-900">
                    Total:
                  </span>
                  <span className="text-2xl font-bold text-green-600">
                    ${getTotalPrice().toFixed(2)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={clearCart}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Limpiar Todo
                  </button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleWhatsAppCheckout}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={18} />
                    Finalizar Compra
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
