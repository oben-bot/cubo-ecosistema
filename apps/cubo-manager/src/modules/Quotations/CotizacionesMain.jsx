import React, { useState, useEffect } from 'react';
import './CotizacionesMain.css';

const CotizacionesMain = () => {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCotizacion, setSelectedCotizacion] = useState(null);
  const [editingCotizacion, setEditingCotizacion] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [formData, setFormData] = useState({
    cliente_id: '',
    validez_dias: 15,
    notas: '',
    detalles: []
  });
  const [detalleActual, setDetalleActual] = useState({
    tipo: 'producto',
    referencia_id: '',
    descripcion: '',
    cantidad: 1,
    precio_unitario: 0,
    descuento: 0
  });
  const [showAddDetalle, setShowAddDetalle] = useState(false);
  const [calculos, setCalculos] = useState({ subtotal: 0, iva: 0, total: 0 });

  useEffect(() => {
    loadData();
    loadClientes();
    loadProductos();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await window.electron.cotizaciones.getAll();
      setCotizaciones(data || []);
    } catch (error) {
      console.error('Error cargando cotizaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientes = async () => {
    try {
      const data = await window.electron.database.query('SELECT id, nombre, telefono FROM clientes ORDER BY nombre');
      setClientes(data || []);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  };

  const loadProductos = async () => {
    try {
      const data = await window.electron.cotizaciones.getProductosDisponibles();
      setProductos(data || []);
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  };

  const calcularTotales = (detalles) => {
    const subtotal = detalles.reduce((sum, d) => sum + (d.total || (d.cantidad * d.precio_unitario * (1 - d.descuento / 100))), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    setCalculos({ subtotal, iva, total });
    return { subtotal, iva, total };
  };

  const agregarDetalle = () => {
    if (!detalleActual.descripcion) {
      alert('La descripción es obligatoria');
      return;
    }
    
    const total = detalleActual.cantidad * detalleActual.precio_unitario * (1 - detalleActual.descuento / 100);
    const nuevoDetalle = { ...detalleActual, total, id: Date.now() };
    
    const nuevosDetalles = [...formData.detalles, nuevoDetalle];
    setFormData({ ...formData, detalles: nuevosDetalles });
    calcularTotales(nuevosDetalles);
    
    setDetalleActual({
      tipo: 'producto',
      referencia_id: '',
      descripcion: '',
      cantidad: 1,
      precio_unitario: 0,
      descuento: 0
    });
    setShowAddDetalle(false);
  };

  const eliminarDetalle = (index) => {
    const nuevosDetalles = formData.detalles.filter((_, i) => i !== index);
    setFormData({ ...formData, detalles: nuevosDetalles });
    calcularTotales(nuevosDetalles);
  };

  const seleccionarProducto = (producto) => {
    setDetalleActual({
      tipo: 'producto',
      referencia_id: producto.id,
      descripcion: producto.nombre,
      cantidad: 1,
      precio_unitario: producto.precio_venta || 0,
      descuento: 0
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cliente_id) {
      alert('Seleccione un cliente');
      return;
    }
    if (formData.detalles.length === 0) {
      alert('Agregue al menos un producto/servicio');
      return;
    }
    
    const cotizacionData = {
      ...formData,
      subtotal: calculos.subtotal,
      iva: calculos.iva,
      total: calculos.total
    };
    
    try {
      if (editingCotizacion) {
        await window.electron.cotizaciones.update(editingCotizacion.id, cotizacionData);
      } else {
        await window.electron.cotizaciones.create(cotizacionData);
      }
      await loadData();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error guardando cotización:', error);
      alert('Error al guardar la cotización');
    }
  };

  const handleStatusChange = async (id, nuevoEstado) => {
    try {
      await window.electron.cotizaciones.changeStatus(id, nuevoEstado);
      await loadData();
    } catch (error) {
      console.error('Error cambiando estado:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta cotización?')) {
      try {
        await window.electron.cotizaciones.delete(id);
        await loadData();
      } catch (error) {
        console.error('Error eliminando cotización:', error);
      }
    }
  };

  const verDetalle = async (id) => {
    try {
      const cotizacion = await window.electron.cotizaciones.getById(id);
      setSelectedCotizacion(cotizacion);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error cargando detalle:', error);
    }
  };

  const convertirATrabajo = async (cotizacion) => {
    if (window.confirm(`Convertir cotización ${cotizacion.folio} a trabajo de producción?`)) {
      alert('Funcionalidad en desarrollo - Se conectará con Producción en la siguiente fase');
    }
  };

  const resetForm = () => {
    setEditingCotizacion(null);
    setFormData({
      cliente_id: '',
      validez_dias: 15,
      notas: '',
      detalles: []
    });
    setDetalleActual({
      tipo: 'producto',
      referencia_id: '',
      descripcion: '',
      cantidad: 1,
      precio_unitario: 0,
      descuento: 0
    });
    setCalculos({ subtotal: 0, iva: 0, total: 0 });
    setShowAddDetalle(false);
  };

  const handleEdit = async (cotizacion) => {
    const fullCotizacion = await window.electron.cotizaciones.getById(cotizacion.id);
    setEditingCotizacion(fullCotizacion);
    setFormData({
      cliente_id: fullCotizacion.cliente_id,
      validez_dias: fullCotizacion.validez_dias,
      notas: fullCotizacion.notas || '',
      detalles: fullCotizacion.detalles || []
    });
    calcularTotales(fullCotizacion.detalles || []);
    setShowModal(true);
  };

  const filteredCotizaciones = cotizaciones.filter(c => {
    const matchesSearch = c.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.folio?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'todos' || c.estado === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (estado) => {
    switch (estado) {
      case 'pendiente': return { text: 'Pendiente', class: 'status-pendiente' };
      case 'aprobada': return { text: 'Aprobada', class: 'status-aprobada' };
      case 'rechazada': return { text: 'Rechazada', class: 'status-rechazada' };
      case 'vencida': return { text: 'Vencida', class: 'status-vencida' };
      case 'convertida': return { text: 'En Producción', class: 'status-convertida' };
      default: return { text: estado, class: '' };
    }
  };

  if (loading) return <div className="loading">Cargando cotizaciones...</div>;

  return (
    <div className="quotations-container">
      <div className="quotations-header">
        <h1>📝 Cotizaciones</h1>
        <div className="quotations-actions">
          <input
            type="text"
            placeholder="🔍 Buscar folio o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="aprobada">Aprobadas</option>
            <option value="rechazada">Rechazadas</option>
          </select>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
            + Nueva Cotización
          </button>
        </div>
      </div>

      <div className="cotizaciones-table-container">
        <table className="cotizaciones-table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCotizaciones.length === 0 ? (
              <tr><td colSpan="6" className="empty-row">No hay cotizaciones registradas</td></tr>
            ) : (
              filteredCotizaciones.map(cotizacion => (
                <tr key={cotizacion.id}>
                  <td className="folio">{cotizacion.folio}</td>
                  <td>{cotizacion.cliente_nombre}</td>
                  <td>{new Date(cotizacion.fecha).toLocaleDateString()}</td>
                  <td className="total">${cotizacion.total?.toFixed(2)}</td>
                  <td><span className={`status-badge ${getStatusBadge(cotizacion.estado).class}`}>{getStatusBadge(cotizacion.estado).text}</span></td>
                  <td className="acciones">
                    <button onClick={() => verDetalle(cotizacion.id)} className="view-btn">👁️</button>
                    <button onClick={() => handleEdit(cotizacion)} className="edit-btn">✏️</button>
                    {cotizacion.estado === 'aprobada' && (
                      <button onClick={() => convertirATrabajo(cotizacion)} className="convert-btn" title="Producción">🔄</button>
                    )}
                    {cotizacion.estado === 'pendiente' && (
                      <>
                        <button onClick={() => handleStatusChange(cotizacion.id, 'aprobada')} className="approve-btn">✓</button>
                        <button onClick={() => handleStatusChange(cotizacion.id, 'rechazada')} className="reject-btn">✗</button>
                      </>
                    )}
                    <button onClick={() => handleDelete(cotizacion.id)} className="delete-btn">🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Creación/Edición */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>{editingCotizacion ? 'Editar Cotización' : 'Nueva Cotización'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <select value={formData.cliente_id} onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })} required>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <input type="number" placeholder="Validez (días)" value={formData.validez_dias} onChange={(e) => setFormData({ ...formData, validez_dias: parseInt(e.target.value) || 15 })} />
              </div>
              
              <div className="detalles-section">
                <h3>Productos/Servicios</h3>
                <button type="button" onClick={() => setShowAddDetalle(!showAddDetalle)} className="btn-secondary">
                  + Agregar concepto
                </button>
                
                {showAddDetalle && (
                  <div className="detalle-form">
                    <div className="form-row">
                      <select value={detalleActual.tipo} onChange={(e) => setDetalleActual({ ...detalleActual, tipo: e.target.value })}>
                        <option value="producto">Producto</option>
                        <option value="servicio">Servicio</option>
                        <option value="diseno">Diseño</option>
                      </select>
                      {detalleActual.tipo === 'producto' && (
                        <select onChange={(e) => {
                          const prod = productos.find(p => p.id === parseInt(e.target.value));
                          if (prod) seleccionarProducto(prod);
                        }}>
                          <option value="">Elegir del inventario...</option>
                          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} (${p.precio_venta})</option>)}
                        </select>
                      )}
                      <input type="text" placeholder="Descripción" value={detalleActual.descripcion} onChange={(e) => setDetalleActual({ ...detalleActual, descripcion: e.target.value })} required />
                    </div>
                    <div className="form-row">
                      <input type="number" step="0.01" placeholder="Cantidad" value={detalleActual.cantidad} onChange={(e) => setDetalleActual({ ...detalleActual, cantidad: parseFloat(e.target.value) || 0 })} />
                      <input type="number" step="0.01" placeholder="Precio" value={detalleActual.precio_unitario} onChange={(e) => setDetalleActual({ ...detalleActual, precio_unitario: parseFloat(e.target.value) || 0 })} />
                      <input type="number" step="0.01" placeholder="Dto %" value={detalleActual.descuento} onChange={(e) => setDetalleActual({ ...detalleActual, descuento: parseFloat(e.target.value) || 0 })} />
                      <button type="button" onClick={agregarDetalle} className="btn-primary">Añadir</button>
                    </div>
                  </div>
                )}
                
                <div className="detalles-lista">
                  <table className="detalles-table">
                    <thead><tr><th>Descripción</th><th>Cant</th><th>Precio</th><th>Total</th><th></th></tr></thead>
                    <tbody>
                      {formData.detalles.map((d, idx) => (
                        <tr key={idx}>
                          <td>{d.descripcion}</td>
                          <td>{d.cantidad}</td>
                          <td>${d.precio_unitario.toFixed(2)}</td>
                          <td>${(d.cantidad * d.precio_unitario * (1 - d.descuento / 100)).toFixed(2)}</td>
                          <td><button type="button" onClick={() => eliminarDetalle(idx)} className="delete-btn">🗑️</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="totales-section">
                <div>Subtotal: ${calculos.subtotal.toFixed(2)}</div>
                <div>IVA (16%): ${calculos.iva.toFixed(2)}</div>
                <div className="grand-total">Total: ${calculos.total.toFixed(2)}</div>
              </div>
              
              <textarea placeholder="Notas" value={formData.notes} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} rows="2" />
              <div className="modal-buttons">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}>Cancelar</button>
                <button type="submit">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {showDetailModal && selectedCotizacion && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Cotización {selectedCotizacion.folio}</h2>
            <div className="detail-info">
              <p><strong>Cliente:</strong> {selectedCotizacion.cliente_nombre}</p>
              <p><strong>Fecha:</strong> {new Date(selectedCotizacion.fecha).toLocaleString()}</p>
              <p><strong>Estado:</strong> {getStatusBadge(selectedCotizacion.estado).text}</p>
            </div>
            <table className="detalles-table">
              <thead><tr><th>Descripción</th><th>Cant</th><th>Precio</th><th>Total</th></tr></thead>
              <tbody>
                {selectedCotizacion.detalles?.map((d, idx) => (
                  <tr key={idx}>
                    <td>{d.descripcion}</td>
                    <td>{d.cantidad}</td>
                    <td>${d.precio_unitario.toFixed(2)}</td>
                    <td>${d.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="totales-section">
              <div className="grand-total">Total: ${selectedCotizacion.total?.toFixed(2)}</div>
            </div>
            <div className="modal-buttons">
              <button onClick={() => setShowDetailModal(false)}>Cerrar</button>
              {selectedCotizacion.estado === 'aprobada' && (
                <button onClick={() => convertirATrabajo(selectedCotizacion)} className="btn-primary">Producir</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CotizacionesMain;
