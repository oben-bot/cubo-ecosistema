import React, { useState, useEffect } from 'react';
import './WarehouseMain.css';

const WarehouseMain = () => {
  const [productos, setProductos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMovimientoModal, setShowMovimientoModal] = useState(false);
  const [editingProducto, setEditingProducto] = useState(null);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('todos');
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    categoria: 'material',
    tipo: 'materia_prima',
    cantidad: 0,
    unidad: 'unidad',
    stock_minimo: 0,
    ubicacion: '',
    proveedor: '',
    precio_compra: 0,
    precio_venta: 0,
    notas: ''
  });
  const [movimientoData, setMovimientoData] = useState({
    tipo: 'entrada',
    cantidad: 0,
    motivo: 'ajuste',
    notas: ''
  });

  useEffect(() => {
    loadData();
    checkAlertas();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await window.electron.inventario.getAll();
      setProductos(data || []);
    } catch (error) {
      console.error('Error cargando inventario:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAlertas = async () => {
    try {
      const alertasData = await window.electron.inventario.getAlertasStock();
      setAlertas(alertasData || []);
    } catch (error) {
      console.error('Error cargando alertas:', error);
    }
  };

  const loadMovimientos = async (productoId) => {
    try {
      const movs = await window.electron.inventario.getMovimientos(productoId);
      setMovimientos(movs || []);
    } catch (error) {
      console.error('Error cargando movimientos:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProducto) {
        await window.electron.inventario.update(editingProducto.id, formData);
      } else {
        await window.electron.inventario.create(formData);
      }
      await loadData();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error guardando producto:', error);
      alert('Error al guardar el producto');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este producto? Se eliminará todo su historial.')) {
      try {
        await window.electron.inventario.delete(id);
        await loadData();
        await checkAlertas();
      } catch (error) {
        console.error('Error eliminando producto:', error);
        alert('Error al eliminar el producto');
      }
    }
  };

  const handleRegistrarMovimiento = async () => {
    if (!selectedProducto) return;
    
    try {
      const cantidadMov = movimientoData.tipo === 'entrada' 
        ? Math.abs(movimientoData.cantidad) 
        : -Math.abs(movimientoData.cantidad);
      
      await window.electron.inventario.registrarMovimiento({
        producto_id: selectedProducto.id,
        tipo: movimientoData.tipo,
        cantidad: cantidadMov,
        motivo: movimientoData.motivo,
        usuario: 'admin',
        notas: movimientoData.notas
      });
      
      await loadData();
      await loadMovimientos(selectedProducto.id);
      await checkAlertas();
      setShowMovimientoModal(false);
      setMovimientoData({ tipo: 'entrada', cantidad: 0, motivo: 'ajuste', notas: '' });
    } catch (error) {
      console.error('Error registrando movimiento:', error);
      alert('Error al registrar el movimiento');
    }
  };

  const openMovimientoModal = async (producto) => {
    setSelectedProducto(producto);
    await loadMovimientos(producto.id);
    setShowMovimientoModal(true);
  };

  const resetForm = () => {
    setEditingProducto(null);
    setFormData({
      codigo: '',
      nombre: '',
      categoria: 'material',
      tipo: 'materia_prima',
      cantidad: 0,
      unidad: 'unidad',
      stock_minimo: 0,
      ubicacion: '',
      proveedor: '',
      precio_compra: 0,
      precio_venta: 0,
      notas: ''
    });
  };

  const handleEdit = (producto) => {
    setEditingProducto(producto);
    setFormData({
      codigo: producto.codigo || '',
      nombre: producto.nombre,
      categoria: producto.categoria,
      tipo: producto.tipo,
      cantidad: producto.cantidad,
      unidad: producto.unidad,
      stock_minimo: producto.stock_minimo,
      ubicacion: producto.ubicacion || '',
      proveedor: producto.proveedor || '',
      precio_compra: producto.precio_compra || 0,
      precio_venta: producto.precio_venta || 0,
      notas: producto.notas || ''
    });
    setShowModal(true);
  };

  const filteredProductos = productos.filter(producto => {
    const matchesSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (producto.codigo && producto.codigo.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategoria = categoriaFilter === 'todos' || producto.categoria === categoriaFilter;
    return matchesSearch && matchesCategoria;
  });

  const getStockStatus = (producto) => {
    if (producto.cantidad <= 0) return 'sin-stock';
    if (producto.stock_minimo > 0 && producto.cantidad <= producto.stock_minimo) return 'bajo-stock';
    return 'ok';
  };

  if (loading) {
    return <div className="loading">Cargando inventario...</div>;
  }

  return (
    <div className="warehouse-container">
      {alertas.length > 0 && (
        <div className="alertas-stock">
          <span className="alert-icon">⚠️</span>
          <span>{alertas.length} producto(s) con stock bajo:</span>
          {alertas.slice(0, 3).map(a => (
            <span key={a.id} className="alerta-item">{a.nombre}: {a.cantidad} {a.unidad}</span>
          ))}
          {alertas.length > 3 && <span>...</span>}
        </div>
      )}

      <div className="warehouse-header">
        <h1>📦 Almacén</h1>
        <div className="warehouse-actions">
          <input
            type="text"
            placeholder="🔍 Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select 
            value={categoriaFilter} 
            onChange={(e) => setCategoriaFilter(e.target.value)}
            className="filter-select"
          >
            <option value="todos">Todas las categorías</option>
            <option value="material">Materiales</option>
            <option value="producto">Productos</option>
            <option value="herramienta">Herramientas</option>
          </select>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
            + Nuevo Producto
          </button>
        </div>
      </div>

      <div className="productos-grid">
        {filteredProductos.map(producto => (
          <div key={producto.id} className={`producto-card ${getStockStatus(producto)}`}>
            <div className="producto-header">
              <h3>{producto.nombre}</h3>
              <div className="producto-actions">
                <button onClick={() => openMovimientoModal(producto)} className="movimiento-btn" title="Movimientos">📊</button>
                <button onClick={() => handleEdit(producto)} className="edit-btn" title="Editar">✏️</button>
                <button onClick={() => handleDelete(producto.id)} className="delete-btn" title="Eliminar">🗑️</button>
              </div>
            </div>
            <div className="codigo">{producto.codigo || 'SIN CÓDIGO'}</div>
            <div className="stock-info">
              <span className={`stock-cantidad ${getStockStatus(producto)}`}>
                {producto.cantidad} {producto.unidad}
              </span>
              <span className="stock-minimo">Mín: {producto.stock_minimo}</span>
            </div>
            <div className="precios">
              <span>Compra: ${producto.precio_compra}</span>
              <span>Venta: ${producto.precio_venta}</span>
            </div>
            {producto.notas && <div className="notas">{producto.notas}</div>}
          </div>
        ))}
      </div>

      {/* Modal Producto */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingProducto ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <input type="text" placeholder="Código" value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} />
                <input type="text" placeholder="Nombre *" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required />
              </div>
              <div className="form-row">
                <select value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}>
                  <option value="material">Material</option>
                  <option value="producto">Producto</option>
                  <option value="herramienta">Herramienta</option>
                </select>
                <select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}>
                  <option value="materia_prima">Materia Prima</option>
                  <option value="producto_terminado">Producto Terminado</option>
                  <option value="insumo">Insumo</option>
                </select>
              </div>
              <div className="form-row">
                <input type="number" step="0.01" placeholder="Cantidad" value={formData.cantidad} onChange={(e) => setFormData({ ...formData, cantidad: parseFloat(e.target.value) || 0 })} />
                <input type="text" placeholder="Unidad" value={formData.unidad} onChange={(e) => setFormData({ ...formData, unidad: e.target.value })} />
                <input type="number" step="0.01" placeholder="Stock mínimo" value={formData.stock_minimo} onChange={(e) => setFormData({ ...formData, stock_minimo: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="form-row">
                <input type="text" placeholder="Ubicación" value={formData.ubicacion} onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })} />
                <input type="text" placeholder="Proveedor" value={formData.proveedor} onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })} />
              </div>
              <div className="form-row">
                <input type="number" step="0.01" placeholder="Precio compra" value={formData.precio_compra} onChange={(e) => setFormData({ ...formData, precio_compra: parseFloat(e.target.value) || 0 })} />
                <input type="number" step="0.01" placeholder="Precio venta" value={formData.precio_venta} onChange={(e) => setFormData({ ...formData, precio_venta: parseFloat(e.target.value) || 0 })} />
              </div>
              <textarea placeholder="Notas" value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} rows="2" />
              <div className="modal-buttons">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}>Cancelar</button>
                <button type="submit">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Movimientos */}
      {showMovimientoModal && selectedProducto && (
        <div className="modal-overlay" onClick={() => setShowMovimientoModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>Movimientos - {selectedProducto.nombre}</h2>
            <div className="movimiento-section">
              <h3>Registrar movimiento</h3>
              <div className="form-row">
                <select value={movimientoData.tipo} onChange={(e) => setMovimientoData({ ...movimientoData, tipo: e.target.value })}>
                  <option value="entrada">➕ Entrada</option>
                  <option value="salida">➖ Salida</option>
                </select>
                <input type="number" step="0.01" placeholder="Cantidad" value={movimientoData.cantidad} onChange={(e) => setMovimientoData({ ...movimientoData, cantidad: parseFloat(e.target.value) || 0 })} />
                <select value={movimientoData.motivo} onChange={(e) => setMovimientoData({ ...movimientoData, motivo: e.target.value })}>
                  <option value="compra">Compra</option>
                  <option value="produccion">Producción</option>
                  <option value="venta">Venta</option>
                  <option value="ajuste">Ajuste</option>
                  <option value="merma">Merma</option>
                </select>
                <button onClick={handleRegistrarMovimiento} className="btn-primary">Registrar</button>
              </div>
              <input type="text" placeholder="Notas" value={movimientoData.notas} onChange={(e) => setMovimientoData({ ...movimientoData, notas: e.target.value })} style={{width: '100%', marginTop: '10px'}} />
            </div>
            
            <div className="movimiento-section">
              <h3>Historial de movimientos</h3>
              <div className="movimientos-lista">
                {movimientos.length === 0 ? (
                  <p>No hay movimientos registrados</p>
                ) : (
                  <table className="movimientos-table">
                    <thead>
                      <tr><th>Fecha</th><th>Tipo</th><th>Cant.</th><th>Motivo</th><th>Notas</th></tr>
                    </thead>
                    <tbody>
                      {movimientos.map(mov => (
                        <tr key={mov.id}>
                          <td>{new Date(mov.created_at).toLocaleDateString()}</td>
                          <td className={mov.tipo === 'entrada' ? 'entrada' : 'salida'}>{mov.tipo === 'entrada' ? 'ENTRADA' : 'SALIDA'}</td>
                          <td>{Math.abs(mov.cantidad)}</td>
                          <td>{mov.motivo}</td>
                          <td>{mov.notas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div className="modal-buttons">
              <button onClick={() => setShowMovimientoModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseMain;
