import React, { useState, useEffect } from 'react';
import './LibraryMain.css';

const LibraryMain = () => {
  const [disenos, setDisenos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [status, setStatus] = useState({ instalada: false, conectada: false });
  const [loading, setLoading] = useState(true);
  const [selectedCategoria, setSelectedCategoria] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDiseno, setSelectedDiseno] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [selectedCotizacion, setSelectedCotizacion] = useState('');
  const [syncStatus, setSyncStatus] = useState('');

  useEffect(() => {
    loadStatus();
    loadDisenos();
    loadCotizaciones();
  }, [selectedCategoria]);

  const loadStatus = async () => {
    try {
      const data = await window.electron.biblioteca.getStatus();
      setStatus(data);
      if (!data.conectada && data.instalada) {
        setSyncStatus('Biblioteca Laser instalada pero no conectada. ¿Iniciar?');
      } else if (data.conectada) {
        setSyncStatus('✅ Biblioteca Laser conectada');
      } else {
        setSyncStatus('⚠️ Biblioteca Laser no encontrada');
      }
    } catch (error) {
      console.error('Error cargando estado:', error);
      setSyncStatus('❌ Error conectando con Biblioteca Laser');
    }
  };

  const loadDisenos = async () => {
    setLoading(true);
    try {
      const data = await window.electron.biblioteca.getDisenos(selectedCategoria !== 'todos' ? selectedCategoria : null);
      setDisenos(data || []);
      const cats = [...new Set((data || []).map(d => d.categoria))];
      setCategorias(cats);
    } catch (error) {
      console.error('Error cargando diseños:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCotizaciones = async () => {
    try {
      const data = await window.electron.cotizaciones.getAll();
      setCotizaciones(data || []);
    } catch (error) {
      console.error('Error cargando cotizaciones:', error);
    }
  };

  const iniciarBiblioteca = async () => {
    const result = await window.electron.biblioteca.start();
    if (result.success) {
      loadStatus();
      setTimeout(() => loadDisenos(), 2000);
    } else {
      alert('No se pudo iniciar la Biblioteca Laser: ' + result.message);
    }
  };

  const sincronizarProductos = async () => {
    const result = await window.electron.biblioteca.syncProductos();
    alert(`${result.productos} productos sincronizados con la biblioteca`);
  };

  const usarDisenoEnCotizacion = async () => {
    if (!selectedDiseno || !selectedCotizacion) {
      alert('Seleccione un diseño y una cotización');
      return;
    }
    alert(`Diseño "${selectedDiseno.nombre}" agregado a la cotización`);
    setShowDetailModal(false);
  };

  const filteredDisenos = disenos.filter(d => 
    d.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="library-container">
      <div className="library-header">
        <h1>📚 Biblioteca Laser</h1>
        <div className="library-status">
          <span className={`status-badge ${status.conectada ? 'connected' : 'disconnected'}`}>
            {status.conectada ? '🟢 Conectada' : '🔴 Desconectada'}
          </span>
          {!status.conectada && status.instalada && (
            <button onClick={iniciarBiblioteca} className="btn-secondary">▶️ Iniciar</button>
          )}
          <button onClick={sincronizarProductos} className="btn-secondary">🔄 Sincronizar productos</button>
        </div>
      </div>
      
      <div className="library-status-message">
        <p>{syncStatus}</p>
      </div>

      <div className="library-controls">
        <input
          type="text"
          placeholder="🔍 Buscar diseños..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select value={selectedCategoria} onChange={(e) => setSelectedCategoria(e.target.value)} className="filter-select">
          <option value="todos">Todas las categorías</option>
          {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading">Cargando diseños...</div>
      ) : (
        <div className="disenos-grid">
          {filteredDisenos.map(diseno => (
            <div key={diseno.id} className="diseno-card" onClick={() => { setSelectedDiseno(diseno); setShowDetailModal(true); }}>
              <div className="diseno-preview">
                {diseno.tienePreview ? <img src={diseno.preview} alt={diseno.nombre} /> : <span className="preview-placeholder">📐</span>}
              </div>
              <div className="diseno-info">
                <h3>{diseno.nombre}</h3>
                <span className="diseno-categoria">{diseno.categoria}</span>
              </div>
            </div>
          ))}
          {filteredDisenos.length === 0 && <div className="empty-state">No se encontraron diseños</div>}
        </div>
      )}

      {showDetailModal && selectedDiseno && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Detalle del Diseño</h2>
            <div className="diseno-detail">
              <div className="diseno-detail-preview">
                {selectedDiseno.tienePreview ? <img src={selectedDiseno.preview} alt={selectedDiseno.nombre} /> : <span className="preview-placeholder large">📐</span>}
              </div>
              <div className="diseno-detail-info">
                <h3>{selectedDiseno.nombre}</h3>
                <p>Categoría: {selectedDiseno.categoria}</p>
                <div className="usar-en-cotizacion">
                  <h4>Vincular a Cotización</h4>
                  <select value={selectedCotizacion} onChange={e => setSelectedCotizacion(e.target.value)}>
                    <option value="">Seleccione una cotización...</option>
                    {cotizaciones.map(c => <option key={c.id} value={c.id}>{c.folio} - {c.cliente_nombre}</option>)}
                  </select>
                  <button onClick={usarDisenoEnCotizacion} className="btn-primary">Vincular Diseño</button>
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
