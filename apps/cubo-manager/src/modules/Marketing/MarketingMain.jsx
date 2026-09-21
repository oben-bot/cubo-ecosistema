import React, { useState, useEffect } from 'react';
import './MarketingMain.css';

const MarketingMain = () => {
  const [activeTab, setActiveTab] = useState('catalogo');
  const [productos, setProductos] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [exportaciones, setExportaciones] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configWP, setConfigWP] = useState({ url: '', api_key: '', exportar_automatico: false });
  const [configWA, setConfigWA] = useState({ numero: '', token: '', recordatorios: true });
  const [configGum, setConfigGum] = useState({ access_token: '', productos_sync: false });

  useEffect(() => {
    loadData();
    loadConfigs();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productosData, cotizacionesData, exportacionesData] = await Promise.all([
        window.electron.database.query(`SELECT * FROM inventario WHERE tipo = 'producto_terminado' ORDER BY nombre`),
        window.electron.cotizaciones.getAll(),
        window.electron.marketing.getExportaciones(50)
      ]);
      
      setProductos(productosData || []);
      setCotizaciones(cotizacionesData || []);
      setExportaciones(exportacionesData || []);
      
      const cats = [...new Set((productosData || []).map(p => p.categoria))];
      setCategorias(cats);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConfigs = async () => {
    try {
      const wp = await window.electron.marketing.getConfig('wordpress');
      if (wp?.configuracion) setConfigWP(JSON.parse(wp.configuracion));
      
      const wa = await window.electron.marketing.getConfig('whatsapp');
      if (wa?.configuracion) setConfigWA(JSON.parse(wa.configuracion));
      
      const gum = await window.electron.marketing.getConfig('gumroad');
      if (gum?.configuracion) setConfigGum(JSON.parse(gum.configuracion));
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
    }
  };

  const saveConfigWP = async () => {
    await window.electron.marketing.saveConfig('wordpress', configWP, true);
    alert('Configuración de WordPress guardada');
  };

  const saveConfigWA = async () => {
    await window.electron.marketing.saveConfig('whatsapp', configWA, true);
    alert('Configuración de WhatsApp guardada');
  };

  const saveConfigGum = async () => {
    await window.electron.marketing.saveConfig('gumroad', configGum, true);
    alert('Configuración de Gumroad guardada');
  };

  const exportarProductoWP = async (producto) => {
    const result = await window.electron.marketing.exportToWordPress(producto.id);
    alert(result.message);
    loadData();
  };

  const exportarCatalogo = async () => {
    const result = await window.electron.marketing.exportCatalogo('todos');
    alert(`Catálogo preparado. ${result.count} productos incluidos.`);
    loadData();
  };

  const enviarWhatsApp = async (cotizacion) => {
    const telefono = prompt('Número de teléfono (ej: 521234567890):', configWA.numero || cotizacion.telefono || '');
    if (telefono) {
      const result = await window.electron.marketing.sendWhatsApp(cotizacion.id, telefono);
      alert(result.message);
      loadData();
    }
  };

  const syncGumroad = async () => {
    const result = await window.electron.marketing.syncGumroad();
    alert(result.message);
    loadData();
  };

  if (loading) return <div className="loading">Cargando marketing...</div>;

  return (
    <div className="marketing-container">
      <div className="marketing-header">
        <h1>📢 Marketing y Exportaciones</h1>
      </div>
      
      <div className="marketing-tabs">
        <button className={activeTab === 'catalogo' ? 'active' : ''} onClick={() => setActiveTab('catalogo')}>📚 Catálogo</button>
        <button className={activeTab === 'wordpress' ? 'active' : ''} onClick={() => setActiveTab('wordpress')}>🌐 WordPress</button>
        <button className={activeTab === 'whatsapp' ? 'active' : ''} onClick={() => setActiveTab('whatsapp')}>💬 WhatsApp</button>
        <button className={activeTab === 'gumroad' ? 'active' : ''} onClick={() => setActiveTab('gumroad')}>🛒 Gumroad</button>
        <button className={activeTab === 'historial' ? 'active' : ''} onClick={() => setActiveTab('historial')}>📋 Historial</button>
      </div>

      <div className="tab-content">
        {activeTab === 'catalogo' && (
          <div className="catalogo-section">
            <div className="section-header">
              <h2>📚 Catálogo Digital</h2>
              <button onClick={exportarCatalogo} className="btn-primary">📄 Generar PDF Completo</button>
            </div>
            <div className="productos-grid">
              {productos.map(p => (
                <div key={p.id} className="producto-card">
                  <div className="producto-img">🖼️</div>
                  <div className="producto-info">
                    <h3>{p.nombre}</h3>
                    <p className="precio">${p.precio_venta} MXN</p>
                    <button onClick={() => exportarProductoWP(p)} className="btn-secondary">🌐 Exportar Web</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'wordpress' && (
          <div className="config-section">
            <h2>🌐 Configuración WordPress</h2>
            <div className="form-group">
              <label>URL del sitio</label>
              <input type="text" value={configWP.url} onChange={e => setConfigWP({...configWP, url: e.target.value})} placeholder="https://tusitio.com" />
            </div>
            <div className="form-group">
              <label>API Key / Password</label>
              <input type="password" value={configWP.api_key} onChange={e => setConfigWP({...configWP, api_key: e.target.value})} placeholder="••••••••" />
            </div>
            <button onClick={saveConfigWP} className="btn-primary">Guardar Configuración</button>
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <div className="whatsapp-section">
            <h2>💬 Enviar Cotizaciones por WhatsApp</h2>
            <div className="cotizaciones-lista">
              {cotizaciones.filter(c => c.estado === 'pendiente' || c.estado === 'aprobada').map(c => (
                <div key={c.id} className="cotizacion-item">
                  <span>{c.folio} - {c.cliente_nombre}</span>
                  <button onClick={() => enviarWhatsApp(c)} className="btn-whatsapp">Enviar WA</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'gumroad' && (
          <div className="config-section">
            <h2>🛒 Sincronización Gumroad</h2>
            <div className="form-group">
              <label>Access Token</label>
              <input type="password" value={configGum.access_token} onChange={e => setConfigGum({...configGum, access_token: e.target.value})} />
            </div>
            <button onClick={saveConfigGum} className="btn-primary">Guardar Token</button>
            <hr />
            <button onClick={syncGumroad} className="btn-secondary">Sincronizar Productos Ahora</button>
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="historial-section">
            <h2>📋 Historial de Exportaciones</h2>
            <table className="historial-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Destino</th>
                  <th>Estado</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {exportaciones.map(ex => (
                  <tr key={ex.id}>
                    <td>{new Date(ex.created_at).toLocaleString()}</td>
                    <td>{ex.tipo}</td>
                    <td>{ex.destino}</td>
                    <td><span className={`status-${ex.estado}`}>{ex.estado}</span></td>
                    <td>{ex.resultado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketingMain;
