import React, { useState, useEffect } from 'react';
import './LibraryMain.css';

const LibraryMain = () => {
  const [activos, setActivos] = useState([]);
  const [estado, setEstado] = useState({ conectada: false, mensaje: '' });
  const [loading, setLoading] = useState(true);
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActivo, setSelectedActivo] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [selectedCotizacion, setSelectedCotizacion] = useState('');
  const [imagenes, setImagenes] = useState({});

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoria, searchTerm]);

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const salud = await window.electron.biblioteca.getEstado();
      setEstado(salud);
      if (!salud.conectada) {
        setActivos([]);
        return;
      }
      const resultado = await window.electron.biblioteca.buscar({
        q: searchTerm,
        categoria: selectedCategoria,
      });
      const lista = resultado?.activos || resultado || [];
      setActivos(lista);
      cargarImagenes(lista);
    } catch (error) {
      console.error('Error cargando la Biblioteca:', error);
      setEstado({ conectada: false, mensaje: error.message });
      setActivos([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarImagenes = async (lista) => {
    const nuevas = {};
    for (const activo of lista) {
      try {
        nuevas[activo.id] = await window.electron.biblioteca.getImagenBase64(activo.id);
      } catch {
        // sin imagen: se muestra el marcador de posición
      }
    }
    setImagenes((prev) => ({ ...prev, ...nuevas }));
  };

  useEffect(() => {
    const cargarCotizaciones = async () => {
      try {
        const data = await window.electron.cotizaciones.getAll();
        setCotizaciones(data || []);
      } catch (error) {
        console.error('Error cargando cotizaciones:', error);
      }
    };
    cargarCotizaciones();
  }, []);

  const usarActivoEnCotizacion = async () => {
    if (!selectedActivo || !selectedCotizacion) {
      alert('Selecciona un diseño y una cotización');
      return;
    }
    alert(`Diseño "${selectedActivo.nombre}" agregado a la cotización`);
    setShowDetailModal(false);
  };

  const categorias = [...new Set(activos.map((a) => a.categoria).filter(Boolean))];

  return (
    <div className="library-container">
      <div className="library-header">
        <h1>📚 Biblioteca</h1>
        <div className="library-status">
          <span className={`status-badge ${estado.conectada ? 'connected' : 'disconnected'}`}>
            {estado.conectada ? '🟢 Conectada' : '🔴 Desconectada'}
          </span>
        </div>
      </div>

      {!estado.conectada && (
        <div className="library-status-message">
          <p>
            No se pudo conectar con la Biblioteca. {estado.mensaje || 'Verifica que el servicio esté corriendo.'}
          </p>
        </div>
      )}

      <div className="library-controls">
        <input
          type="text"
          placeholder="🔍 Buscar por nombre o palabra clave..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={selectedCategoria}
          onChange={(e) => setSelectedCategoria(e.target.value)}
          className="filter-select"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Cargando diseños...</div>
      ) : (
        <div className="disenos-grid">
          {activos.map((activo) => (
            <div
              key={activo.id}
              className="diseno-card"
              onClick={() => { setSelectedActivo(activo); setShowDetailModal(true); }}
            >
              <div className="diseno-preview">
                {imagenes[activo.id] ? (
                  <img src={imagenes[activo.id]} alt={activo.nombre} />
                ) : (
                  <span className="preview-placeholder">📐</span>
                )}
              </div>
              <div className="diseno-info">
                <h3>{activo.nombre}</h3>
                <span className="diseno-categoria">{activo.categoria}</span>
              </div>
            </div>
          ))}
          {estado.conectada && activos.length === 0 && (
            <div className="empty-state">No se encontraron diseños</div>
          )}
        </div>
      )}

      {showDetailModal && selectedActivo && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Detalle del Diseño</h2>
            <div className="diseno-detail">
              <div className="diseno-detail-preview">
                {imagenes[selectedActivo.id] ? (
                  <img src={imagenes[selectedActivo.id]} alt={selectedActivo.nombre} />
                ) : (
                  <span className="preview-placeholder large">📐</span>
                )}
              </div>
              <div className="diseno-detail-info">
                <h3>{selectedActivo.nombre}</h3>
                <p>Categoría: {selectedActivo.categoria}</p>
                {selectedActivo.material && <p>Material: {selectedActivo.material}</p>}
                {selectedActivo.medidas_mm && (
                  <p>
                    Medidas: {selectedActivo.medidas_mm.ancho} x {selectedActivo.medidas_mm.alto} mm
                  </p>
                )}
                <div className="usar-en-cotizacion">
                  <h4>Vincular a Cotización</h4>
                  <select value={selectedCotizacion} onChange={(e) => setSelectedCotizacion(e.target.value)}>
                    <option value="">Seleccione una cotización...</option>
                    {cotizaciones.map((c) => (
                      <option key={c.id} value={c.id}>{c.folio} - {c.cliente_nombre}</option>
                    ))}
                  </select>
                  <button onClick={usarActivoEnCotizacion} className="btn-primary">Vincular Diseño</button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowDetailModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryMain;
