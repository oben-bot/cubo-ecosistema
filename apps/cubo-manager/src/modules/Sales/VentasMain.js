import React, { useEffect, useState } from 'react';
import { getProductos, enviarPedido } from '../../components/api';
import { useNavigate } from 'react-router-dom';
import systemMonitor from '../../components/Core/SystemMonitor';
import { deleteWithTrash } from '../../utils/deleteWithTrash';

const VentasMain = () => {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getProductos()
      .then(data => {
        setProductos(data);
        setLoading(false);
      })
      .catch(error => {
        setLoading(false);
        setMensaje('Error al cargar productos. Intente nuevamente más tarde.');
        console.error('Error al cargar productos:', error);
      });
  }, []);

  useEffect(() => {
    systemMonitor.recordMetric('renders', Date.now());
    systemMonitor.log('ventas_render', {});
  }, []);

  const agregarAlCarrito = (producto) => {
    setCarrito(prev => [...prev, producto]);
  };

  const enviarPedidoHandler = async () => {
    if (carrito.length === 0) {
      setMensaje('Agrega productos al carrito antes de enviar el pedido.');
      return;
    }
    setMensaje('Enviando pedido...');
    try {
      const res = await enviarPedido({ productos: carrito, fecha: new Date().toISOString() });
      if (res.ok || res.success) {
        setMensaje('¡Pedido enviado correctamente!');
        setCarrito([]);
        // --- GUARDAR EN FINANZAS ---
        const movimientos = JSON.parse(localStorage.getItem("finanzasDatos") || "[]");
        const total = carrito.reduce((sum, p) => sum + (p.precio || p.price || 0), 0);
        movimientos.push({
          tipo: "ganancia",
          descripcion: `Venta web (${carrito.map(p => p.nombre || p.name).join(", ")})`,
          monto: total,
          fecha: new Date().toISOString().split('T')[0],
          cliente: "Web"
        });
        localStorage.setItem("finanzasDatos", JSON.stringify(movimientos));
        // --- FIN GUARDAR EN FINANZAS ---
        // --- AGREGAR A TRABAJO ---
        const trabajos = JSON.parse(localStorage.getItem("trabajosPendientes") || "[]");
        trabajos.push({
          id: Date.now(),
          cliente: "Web",
          trabajo: `Pedido web (${carrito.map(p => p.nombre || p.name).join(", ")})`,
          descripcion: "Pedido realizado desde la web",
          prioridad: "Media",
          fechaEntrada: new Date().toISOString().split('T')[0],
          fechaEstimada: "",
          materiales: carrito.map(p => ({ id: p.id, nombre: p.nombre || p.name, cantidad: 1 })),
          precio: total,
          estado: "Pendiente",
          tecnico: ""
        });
        localStorage.setItem("trabajosPendientes", JSON.stringify(trabajos));
        // --- FIN AGREGAR A TRABAJO ---
        // --- ACTUALIZAR ALMACÉN ---
        const almacen = JSON.parse(localStorage.getItem("materiales") || "null") || [];
        let alertaMateriales = [];
        carrito.forEach(prod => {
          const matIdx = almacen.findIndex(m => m.id === prod.id);
          if (matIdx !== -1) {
            almacen[matIdx].cantidad = (almacen[matIdx].cantidad || 0) - 1;
            if (almacen[matIdx].cantidad <= almacen[matIdx].minimo) {
              alertaMateriales.push(almacen[matIdx].nombre);
            }
          }
        });
        localStorage.setItem("materiales", JSON.stringify(almacen));
        if (alertaMateriales.length > 0) {
          alert(`¡Atención! Los siguientes materiales están por debajo del mínimo: ${alertaMateriales.join(", ")}`);
        }
        // --- FIN ACTUALIZAR ALMACÉN ---
      } else {
        setMensaje(res.mensaje || 'Error al enviar el pedido.');
      }
    } catch (error) {
      setMensaje('Error al enviar el pedido. Intente nuevamente más tarde.');
      console.error('Error al enviar pedido:', error);
    }
  };

  return (
    <div className="bg-gray-800 shadow-xl rounded-lg p-6 flex-1">
      <h1 className="text-2xl font-bold text-white mb-6">Página Web de Ventas</h1>
      <div className="space-y-6">
        <div className="border-b border-gray-700 pb-4">
          <h2 className="text-lg font-semibold text-cyan-400 mb-3">Catálogo</h2>
          {loading ? (
            <p className="text-gray-300">Cargando productos...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {productos.map((prod, idx) => (
                <div key={idx} className="bg-gray-700 rounded-lg p-4 flex flex-col items-center">
                  <div className="text-white font-bold text-lg mb-2">{prod.nombre || prod.name}</div>
                  <div className="text-cyan-300 mb-2">${prod.precio || prod.price}</div>
                  <button className="bg-cyan-500 hover:bg-cyan-400 text-white px-4 py-2 rounded" onClick={() => agregarAlCarrito(prod)}>
                    Agregar al carrito
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-b border-gray-700 pb-4">
          <h2 className="text-lg font-semibold text-cyan-400 mb-3">Carrito</h2>
          {carrito.length === 0 ? (
            <p className="text-gray-300">No hay productos en el carrito.</p>
          ) : (
            <ul className="text-white mb-2">
              {carrito.map((prod, idx) => (
                <li key={idx}>
                  {prod.nombre || prod.name} - ${prod.precio || prod.price}
                  <button className="text-red-400 hover:text-red-300 ml-2" onClick={() => {
                    deleteWithTrash({
                      id: `venta-carrito-${prod.id || idx}`,
                      name: prod.nombre || prod.name,
                      type: 'producto_carrito'
                    });
                    setCarrito(carrito.filter((_, i) => i !== idx));
                  }}>Eliminar</button>
                </li>
              ))}
            </ul>
          )}
          <button className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-2 rounded mt-2" onClick={enviarPedidoHandler}>
            Enviar Pedido
          </button>
          {mensaje && <div className="mt-2 text-cyan-300">{mensaje}</div>}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-cyan-400 mb-3">Marketing</h2>
          <p className="text-gray-300">Promociones y descuentos.</p>
        </div>
      </div>
      <button
        className="volver-dashboard-btn"
        style={{ marginTop: 32 }}
        onClick={() => navigate('/dashboard')}
      >
        ← Volver al menú principal
      </button>
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button
          className="bg-blue-500 hover:bg-blue-400 text-white px-6 py-2 rounded mt-2"
          onClick={() => window.open('file:///C:/Users/HP/Desktop/IA´s/PAjina%20web/Nueva%20carpeta/index.html', '_blank')}
        >
          Acceso Interno (Admin) a Página Web
        </button>
      </div>
    </div>
  );
};

export default VentasMain;