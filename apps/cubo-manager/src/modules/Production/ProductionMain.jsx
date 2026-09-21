import React, { useState, useEffect } from 'react';
import './ProductionMain.css';

const ProductionMain = () => {
  const [trabajos, setTrabajos] = useState([]);
  const [cotizacionesAprobadas, setCotizacionesAprobadas] = useState([]);
  const [selectedTrabajo, setSelectedTrabajo] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientes, setClientes] = useState([]);
  const [formData, setFormData] = useState({
    cliente_id: '',
    titulo: '',
    descripcion: '',
    prioridad: 1,
    fecha_entrega_estimada: '',
    precio_total: 0,
    notas: ''
  });
  const [nuevaActividad, setNuevaActividad] = useState('');
  const [nuevaDuracion, setNuevaDuracion] = useState('');

  useEffect(() => {
    loadData();
    loadClientes();
    loadCotizacionesAprobadas();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await window.electron.trabajos.getAll();
      setTrabajos(data || []);
    } catch (error) {
      console.error('Error cargando trabajos:', error);
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

  const loadCotizacionesAprobadas = async () => {
    try {
      const data = await window.electron.trabajos.getCotizacionesAprobadas();
      setCotizacionesAprobadas(data || []);
    } catch (error) {
      console.error('Error cargando cotizaciones:', error);
    }
  };

  const handleStatusChange = async (id, nuevoEstado) => {
    try {
      await window.electron.trabajos.changeStatus(id, nuevoEstado);
      await loadData();
      if (selectedTrabajo && selectedTrabajo.id === id) {
        const updated = await window.electron.trabajos.getById(id);
        setSelectedTrabajo(updated);
      }
    } catch (error) {
      console.error('Error cambiando estado:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await window.electron.trabajos.create(formData);
      await loadData();
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creando trabajo:', error);
      alert('Error al crear el trabajo');
    }
  };

  const handleConvertirCotizacion = async (cotizacionId) => {
    try {
      await window.electron.trabajos.crearDesdeCotizacion(cotizacionId);
      await loadData();
      await loadCotizacionesAprobadas();
      setShowConvertModal(false);
    } catch (error) {
      console.error('Error convirtiendo cotización:', error);
      alert('Error al convertir la cotización');
    }
  };

  const handleAddActividad = async (trabajoId) => {
    if (!nuevaActividad) return;
    try {
      await window.electron.trabajos.addActividad(trabajoId, nuevaActividad, parseInt(nuevaDuracion) || 0);
      const updated = await window.electron.trabajos.getById(trabajoId);
      setSelectedTrabajo(updated);
      setNuevaActividad('');
      setNuevaDuracion('');
    } catch (error) {
      console.error('Error agregando actividad:', error);
    }
  };

  const verDetalle = async (id) => {
    try {
      const data = await window.electron.trabajos.getById(id);
      setSelectedTrabajo(data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error cargando detalle:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      titulo: '',
      descripcion: '',
      prioridad: 1,
      fecha_entrega_estimada: '',
      precio_total: 0,
      notas: ''
    });
  };

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'en_cola': return { text: 'En cola', class: 'status-cola', icon: '⏳' };
      case 'en_proceso': return { text: 'En proceso', class: 'status-proceso', icon: '⚙️' };
      case 'terminado': return { text: 'Terminado', class: 'status-terminado', icon: '✅' };
      case 'entregado': return { text: 'Entregado', class: 'status-entregado', icon: '📦' };
      default: return { text: estado, class: '', icon: '' };
    }
  };

  const getPrioridadIcon = (p) => {
    if (p >= 3) return '🔴 Alta';
    if (p === 2) return '🟡 Media';
    return '🟢 Baja';
  };

  const filteredTrabajos = trabajos.filter(t => {
    const matchesSearch = t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.numero_trabajo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = filterEstado === 'todos' || t.estado === filterEstado;
    return matchesSearch && matchesEstado;
  });

  const stats = {
    en_cola: trabajos.filter(t => t.estado === 'en_cola').length,
    en_proceso: trabajos.filter(t => t.estado === 'en_proceso').length,
    terminado: trabajos.filter(t => t.estado === 'terminado').length,
    entregado: trabajos.filter(t => t.estado === 'entregado').length,
    total_ganancia: trabajos.reduce((sum, t) => sum + (t.ganancia || 0), 0)
  };

  if (loading) return <div className="loading">Cargando producción...</div>;

  return (
    <div className="production-container">
      <div className="production-header">
        <h1>🔧 Producción</h1>
        <div className="production-actions">
          <input
            type="text"
            placeholder="🔍 Buscar trabajo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="filter-select">
            <option value="todos">Todos los estados</option>
            <option value="en_cola">En cola</option>
            <option value="en_proceso">En proceso</option>
            <option value="terminado">Terminado</option>
            <option value="entregado">Entregado</option>
          </select>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">+ Nuevo Trabajo</button>
          <button onClick={() => setShowConvertModal(true)} className="btn-secondary">📄 Desde Cotización</button>
        </div>
      </div>

      <div className="production-stats">
        <div className="stat-card cola"><span className="stat-number">{stats.en_cola}</span><span className="stat-label">En cola</span></div>
        <div className="stat-card proceso"><span className="stat-number">{stats.en_proceso}</span><span className="stat-label">En proceso</span></div>
        <div className="stat-card terminado"><span className="stat-number">{stats.terminado}</span><span className="stat-label">Terminado</span></div>
        <div className="stat-card entregado"><span className="stat-number">{stats.entregado}</span><span className="stat-label">Entregado</span></div>
      </div>

      <div className="trabajos-lista">
        {filteredTrabajos.length === 0 ? (
          <div className="empty-state"><p>No hay trabajos registrados</p></div>
        ) : (
          filteredTrabajos.map(trabajo => {
            const estado = getEstadoBadge(trabajo.estado);
            return (
              <div key={trabajo.id} className={`trabajo-card ${trabajo.estado}`}>
                <div className="trabajo-header">
                  <div className="trabajo-info">
                    <span className="trabajo-numero">{trabajo.numero_trabajo}</span>
                    <h3>{trabajo.titulo}</h3>
                    <span className="trabajo-cliente">{trabajo.cliente_nombre}</span>
                  </div>
                  <div className="trabajo-estado">
                    <span className={`status-badge ${estado.class}`}>{estado.icon} {estado.text}</span>
                    <span className="prioridad-badge">{getPrioridadIcon(trabajo.prioridad)}</span>
                  </div>
                </div>
                <div className="trabajo-body">
                  <p className="trabajo-descripcion">{trabajo.descripcion?.substring(0, 100)}</p>
                  <div className="trabajo-fechas">
                    {trabajo.fecha_entrega_estimada && <span>⏰ Entrega: {new Date(trabajo.fecha_entrega_estimada).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="trabajo-actions">
                  <button onClick={() => verDetalle(trabajo.id)} className="view-btn">👁️ Detalle</button>
                  {trabajo.estado === 'en_cola' && <button onClick={() => handleStatusChange(trabajo.id, 'en_proceso')} className="start-btn">▶️ Iniciar</button>}
                  {trabajo.estado === 'en_proceso' && <button onClick={() => handleStatusChange(trabajo.id, 'terminado')} className="complete-btn">✅ Terminar</button>}
                  {trabajo.estado === 'terminado' && <button onClick={() => handleStatusChange(trabajo.id, 'entregado')} className="deliver-btn">📦 Entregar</button>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Detalle */}
      {showDetailModal && selectedTrabajo && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedTrabajo.numero_trabajo} - {selectedTrabajo.titulo}</h2>
            <div className="detail-grid">
              <div><strong>Cliente:</strong> {selectedTrabajo.cliente_nombre}</div>
              <div><strong>Estado:</strong> {getEstadoBadge(selectedTrabajo.estado).text}</div>
              <div><strong>Prioridad:</strong> {getPrioridadIcon(selectedTrabajo.prioridad)}</div>
              <div><strong>Inicio:</strong> {selectedTrabajo.fecha_inicio ? new Date(selectedTrabajo.fecha_inicio).toLocaleString() : 'Pendiente'}</div>
            </div>
            
            <div className="detail-actividades">
              <h4>📋 Bitácora</h4>
              <div className="add-actividad">
                <input type="text" placeholder="Actividad..." value={nuevaActividad} onChange={(e) => setNuevaActividad(e.target.value)} />
                <button onClick={() => handleAddActividad(selectedTrabajo.id)}>Añadir</button>
              </div>
              <div className="actividades-lista">
                {selectedTrabajo.actividades?.map(act => (
                  <div key={act.id} className="actividad-item">
                    <span>{new Date(act.created_at).toLocaleString()}</span>
                    <span>{act.actividad}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-buttons">
              <button onClick={() => setShowDetailModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Convertir */}
      {showConvertModal && (
        <div className="modal-overlay" onClick={() => setShowConvertModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Convertir Cotización</h2>
            <div className="cotizaciones-lista">
              {cotizacionesAprobadas.map(cot => (
                <div key={cot.id} className="cotizacion-item">
                  <span>{cot.folio} - {cot.cliente_nombre}</span>
                  <button onClick={() => handleConvertirCotizacion(cot.id)} className="btn-primary">Convertir</button>
                </div>
              ))}
              {cotizacionesAprobadas.length === 0 && <p>No hay cotizaciones aprobadas pendientes.</p>}
            </div>
            <div className="modal-buttons"><button onClick={() => setShowConvertModal(false)}>Cerrar</button></div>
          </div>
        </div>
      )}

      {/* Modal Crear */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Nuevo Trabajo</h2>
            <form onSubmit={handleSubmit}>
              <select value={formData.cliente_id} onChange={(e) => setFormData({...formData, cliente_id: e.target.value})} required>
                <option value="">Cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <input type="text" placeholder="Título *" value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} required />
              <textarea placeholder="Descripción" value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} />
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button type="submit">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionMain;
