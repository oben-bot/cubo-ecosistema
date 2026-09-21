import React, { useState, useEffect } from 'react';
import './SalesMain.css';

const SalesMain = () => {
  const [ventas, setVentas] = useState([]);
  const [trabajosTerminados, setTrabajosTerminados] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFacturarModal, setShowFacturarModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    cliente_id: '',
    metodo_pago: 'efectivo',
    detalles: []
  });
  const [detalleActual, setDetalleActual] = useState({
    producto_id: '',
    descripcion: '',
    cantidad: 1,
    precio_unitario: 0
  });
  const [calculos, setCalculos] = useState({ subtotal: 0, iva: 0, total: 0 });
  const [showAddDetalle, setShowAddDetalle] = useState(false);

  useEffect(() => {
    loadData();
    loadClientes();
    loadProductos();
    loadTrabajosTerminados();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await window.electron.ventas.getAll();
      setVentas(data || []);
    } catch (error) {
      console.error('Error cargando ventas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientes = async () => {
    try {
      const data = await window.electron.database.query('SELECT id, nombre FROM clientes ORDER BY nombre');
      setClientes(data || []);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  };

  const loadProductos = async () => {
    try {
      const data = await window.electron.database.query(`SELECT id, nombre, precio_venta, unidad FROM inventario 
        WHERE tipo = 'producto_terminado' AND cantidad > 0 ORDER BY nombre`);
      setProductos(data || []);
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  };

  const loadTrabajosTerminados = async () => {
    try {
      const data = await window.electron.finanzas.getTrabajosTerminados();
      setTrabajosTerminados(data || []);
    } catch (error) {
      console.error('Error cargando trabajos:', error);
    }
  };

  const calcularTotales = (detalles) => {
    const subtotal = detalles.reduce((sum, d) => sum + (d.cantidad * d.precio_unitario), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    setCalculos({ subtotal, iva, total });
  };

  const agregarDetalle = () => {
    if (!detalleActual.descripcion && !detalleActual.producto_id) return;
    const nuevoDetalle = { ...detalleActual, total: detalleActual.cantidad * detalleActual.precio_unitario };
    const nuevosDetalles = [...formData.detalles, nuevoDetalle];
    setFormData({ ...formData, detalles: nuevosDetalles });
    calcularTotales(nuevosDetalles);
    setDetalleActual({ producto_id: '', descripcion: '', cantidad: 1, precio_unitario: 0 });
    setShowAddDetalle(false);
  };

  const seleccionarProducto = (producto) => {
    setDetalleActual({
      producto_id: producto.id,
      descripcion: producto.nombre,
      cantidad: 1,
      precio_unitario: producto.precio_venta || 0
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await window.electron.ventas.create({ ...formData, ...calculos });
      await loadData();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error guardando venta:', error);
    }
  };

  const handleFacturarTrabajo = async (trabajoId, metodo) => {
    if (!metodo) return;
    try {
      await window.electron.ventas.crearDesdeTrabajo(trabajoId, metodo);
      await loadData();
      await loadTrabajosTerminados();
      setShowFacturarModal(false);
    } catch (error) {
      console.error('Error facturando trabajo:', error);
    }
  };

  const resetForm = () => {
    setFormData({ cliente_id: '', metodo_pago: 'efectivo', detalles: [] });
    setCalculos({ subtotal: 0, iva: 0, total: 0 });
  };

  const filteredVentas = ventas.filter(v => 
    v.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading">Cargando ventas...</div>;

  return (
    <div className="sales-container">
      <div className="sales-header">
        <h1>💰 Ventas</h1>
        <div className="sales-actions">
          <input type="text" placeholder="🔍 Buscar venta..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
          <button onClick={() => setShowModal(true)} className="btn-primary">+ Nueva Venta</button>
          <button onClick={() => setShowFacturarModal(true)} className="btn-secondary">📦 Facturar Trabajo</button>
        </div>
      </div>

      <div className="sales-table-container">
        <table className="sales-table">
          <thead>
            <tr><th>Folio</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Método</th></tr>
          </thead>
          <tbody>
            {filteredVentas.map(venta => (
              <tr key={venta.id}>
                <td className="folio">{venta.folio}</td>
                <td>{venta.cliente_nombre}</td>
                <td>{new Date(venta.fecha).toLocaleDateString()}</td>
                <td>${venta.total?.toFixed(2)}</td>
                <td>{venta.metodo_pago}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Nueva Venta */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>Nueva Venta</h2>
            <form onSubmit={handleSubmit}>
              <select value={formData.cliente_id} onChange={(e) => setFormData({...formData, cliente_id: e.target.value})} required>
                <option value="">Cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <div className="detalles-section">
                <button type="button" onClick={() => setShowAddDetalle(!showAddDetalle)}>+ Producto</button>
                {showAddDetalle && (
                  <div className="detalle-form">
                    <select onChange={(e) => {
                      const p = productos.find(prod => prod.id === parseInt(e.target.value));
                      if (p) seleccionarProducto(p);
                    }}>
                      <option value="">Elegir producto...</option>
                      {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                    <button type="button" onClick={agregarDetalle}>Añadir</button>
                  </div>
                )}
                <div className="totales-section">
                  <div className="grand-total">Total: ${calculos.total.toFixed(2)}</div>
                </div>
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Facturar */}
      {showFacturarModal && (
        <div className="modal-overlay" onClick={() => setShowFacturarModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Facturar Trabajo</h2>
            {trabajosTerminados.map(t => (
              <div key={t.id} className="trabajo-item">
                <span>{t.numero_trabajo} - {t.cliente_nombre} (${t.precio_total})</span>
                <select onChange={(e) => handleFacturarTrabajo(t.id, e.target.value)}>
                  <option value="">Método...</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesMain;
