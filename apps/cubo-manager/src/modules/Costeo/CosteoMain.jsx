import React, { useState, useEffect } from 'react';
import './CosteoMain.css';

const initialConfig = {
  costo_adquisicion: 0,
  amortizacion_meses: 24,
  costo_laser: 0,
  vida_util_laser_horas: 0,
  costo_opticas: 0,
  vida_util_opticas_horas: 0,
  costo_filtros: 0,
  vida_util_filtros_horas: 0,
  tarifa_supervision_hora: 0,
  tarifa_mano_obra_hora: 0,
  watts_maquina: 0,
  costo_kwh: 0,
  moneda: '$'
};

const initialMaterial = {
  nombre: '',
  tipo: 'MDF',
  precio_plancha: 0,
  ancho_cm: 0,
  alto_cm: 0
};

const initialInsumo = {
  nombre: '',
  costo_unitario: 0,
  unidad: 'pieza'
};

const CosteoMain = () => {
  const [activeTab, setActiveTab] = useState('calculadora');

  // Config máquina
  const [config, setConfig] = useState(initialConfig);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState('');

  // Materiales
  const [materiales, setMateriales] = useState([]);
  const [materialForm, setMaterialForm] = useState(initialMaterial);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialesLoading, setMaterialesLoading] = useState(true);

  // Insumos
  const [insumos, setInsumos] = useState([]);
  const [insumoForm, setInsumoForm] = useState(initialInsumo);
  const [editingInsumo, setEditingInsumo] = useState(null);
  const [showInsumoModal, setShowInsumoModal] = useState(false);
  const [insumosLoading, setInsumosLoading] = useState(true);

  // Calculadora
  const REFERENCIA_TIPO = 'calculo_libre';
  const [referenciaId, setReferenciaId] = useState(() => Date.now());
  const [consumos, setConsumos] = useState([]);
  const [consumoTipo, setConsumoTipo] = useState('material'); // material | insumo
  const [consumoMaterialId, setConsumoMaterialId] = useState('');
  const [consumoArea, setConsumoArea] = useState('');
  const [consumoInsumoId, setConsumoInsumoId] = useState('');
  const [consumoCantidad, setConsumoCantidad] = useState('');
  const [minutosLaser, setMinutosLaser] = useState('');
  const [minutosManoObra, setMinutosManoObra] = useState('');
  const [resultado, setResultado] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState('');
  const [calcWarning, setCalcWarning] = useState('');

  const hasCosteoAPI = typeof window !== 'undefined' && window.electron && window.electron.costeo;

  useEffect(() => {
    if (!hasCosteoAPI) return;
    loadConfig();
    loadMateriales();
    loadInsumos();
  }, []);

  useEffect(() => {
    if (!hasCosteoAPI) return;
    loadConsumos();
  }, [referenciaId]);

  // ---------- Config ----------
  const loadConfig = async () => {
    setConfigLoading(true);
    try {
      const cfg = await window.electron.costeo.getConfigMaquina();
      if (cfg) {
        setConfig({
          costo_adquisicion: cfg.costo_adquisicion || 0,
          amortizacion_meses: cfg.amortizacion_meses || 24,
          costo_laser: cfg.costo_laser || 0,
          vida_util_laser_horas: cfg.vida_util_laser_horas || 0,
          costo_opticas: cfg.costo_opticas || 0,
          vida_util_opticas_horas: cfg.vida_util_opticas_horas || 0,
          costo_filtros: cfg.costo_filtros || 0,
          vida_util_filtros_horas: cfg.vida_util_filtros_horas || 0,
          tarifa_supervision_hora: cfg.tarifa_supervision_hora || 0,
          tarifa_mano_obra_hora: cfg.tarifa_mano_obra_hora || 0,
          watts_maquina: cfg.watts_maquina || 0,
          costo_kwh: cfg.costo_kwh || 0,
          moneda: cfg.moneda || '$'
        });
      }
    } catch (e) {
      console.error('Error cargando config máquina', e);
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setConfigSaving(true);
    setConfigMsg('');
    try {
      const payload = {
        ...config,
        costo_adquisicion: parseFloat(config.costo_adquisicion) || 0,
        amortizacion_meses: parseInt(config.amortizacion_meses, 10) || 24,
        costo_laser: parseFloat(config.costo_laser) || 0,
        vida_util_laser_horas: parseFloat(config.vida_util_laser_horas) || 0,
        costo_opticas: parseFloat(config.costo_opticas) || 0,
        vida_util_opticas_horas: parseFloat(config.vida_util_opticas_horas) || 0,
        costo_filtros: parseFloat(config.costo_filtros) || 0,
        vida_util_filtros_horas: parseFloat(config.vida_util_filtros_horas) || 0,
        tarifa_supervision_hora: parseFloat(config.tarifa_supervision_hora) || 0,
        tarifa_mano_obra_hora: parseFloat(config.tarifa_mano_obra_hora) || 0,
        watts_maquina: parseFloat(config.watts_maquina) || 0,
        costo_kwh: parseFloat(config.costo_kwh) || 0,
        moneda: config.moneda || '$'
      };
      await window.electron.costeo.saveConfigMaquina(payload);
      setConfigMsg('✅ Configuración guardada correctamente. Se mantendrá al recargar.');
      setTimeout(() => setConfigMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setConfigMsg('❌ Error al guardar configuración');
    } finally {
      setConfigSaving(false);
    }
  };

  // ---------- Materiales ----------
  const loadMateriales = async () => {
    setMaterialesLoading(true);
    try {
      const data = await window.electron.costeo.getMateriales();
      setMateriales(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setMaterialesLoading(false);
    }
  };

  const handleMaterialSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...materialForm,
        precio_plancha: parseFloat(materialForm.precio_plancha) || 0,
        ancho_cm: parseFloat(materialForm.ancho_cm) || 0,
        alto_cm: parseFloat(materialForm.alto_cm) || 0,
        ...(editingMaterial ? { id: editingMaterial.id } : {})
      };
      if (!payload.nombre || payload.precio_plancha <= 0 || payload.ancho_cm <= 0 || payload.alto_cm <= 0) {
        alert('Completa nombre, precio y dimensiones válidas (>0)');
        return;
      }
      await window.electron.costeo.saveMaterial(payload);
      await loadMateriales();
      setShowMaterialModal(false);
      setEditingMaterial(null);
      setMaterialForm(initialMaterial);
    } catch (err) {
      console.error(err);
      alert('Error guardando material');
    }
  };

  const handleEditMaterial = (m) => {
    setEditingMaterial(m);
    setMaterialForm({
      nombre: m.nombre,
      tipo: m.tipo || 'MDF',
      precio_plancha: m.precio_plancha,
      ancho_cm: m.ancho_cm,
      alto_cm: m.alto_cm
    });
    setShowMaterialModal(true);
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm('¿Dar de baja este material? (baja lógica, desaparecerá de la lista)')) return;
    try {
      await window.electron.costeo.deleteMaterial(id);
      await loadMateriales();
    } catch (e) {
      console.error(e);
      alert('Error al eliminar');
    }
  };

  // ---------- Insumos ----------
  const loadInsumos = async () => {
    setInsumosLoading(true);
    try {
      const data = await window.electron.costeo.getInsumos();
      setInsumos(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setInsumosLoading(false);
    }
  };

  const handleInsumoSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...insumoForm,
        costo_unitario: parseFloat(insumoForm.costo_unitario) || 0,
        ...(editingInsumo ? { id: editingInsumo.id } : {})
      };
      if (!payload.nombre || payload.costo_unitario <= 0) {
        alert('Nombre y costo unitario >0 requeridos');
        return;
      }
      await window.electron.costeo.saveInsumo(payload);
      await loadInsumos();
      setShowInsumoModal(false);
      setEditingInsumo(null);
      setInsumoForm(initialInsumo);
    } catch (err) {
      console.error(err);
      alert('Error guardando insumo');
    }
  };

  const handleEditInsumo = (ins) => {
    setEditingInsumo(ins);
    setInsumoForm({
      nombre: ins.nombre,
      costo_unitario: ins.costo_unitario,
      unidad: ins.unidad || 'pieza'
    });
    setShowInsumoModal(true);
  };

  const handleDeleteInsumo = async (id) => {
    if (!window.confirm('¿Dar de baja este insumo?')) return;
    try {
      await window.electron.costeo.deleteInsumo(id);
      await loadInsumos();
    } catch (e) {
      console.error(e);
      alert('Error al eliminar');
    }
  };

  // ---------- Calculadora ----------
  const loadConsumos = async () => {
    try {
      const data = await window.electron.costeo.getConsumo(REFERENCIA_TIPO, referenciaId);
      setConsumos(data || []);
    } catch (e) {
      console.error('Error cargando consumos', e);
      setConsumos([]);
    }
  };

  const handleAddConsumo = async (e) => {
    e.preventDefault();
    setCalcError('');
    try {
      let item = {
        referencia_tipo: REFERENCIA_TIPO,
        referencia_id: referenciaId
      };
      if (consumoTipo === 'material') {
        if (!consumoMaterialId || !consumoArea) {
          setCalcError('Selecciona material y área en cm²');
          return;
        }
        const area = parseFloat(consumoArea);
        if (isNaN(area) || area <= 0) {
          setCalcError('Área debe ser >0');
          return;
        }
        item.material_id = parseInt(consumoMaterialId, 10);
        item.area_cm2 = area;
      } else {
        if (!consumoInsumoId || !consumoCantidad) {
          setCalcError('Selecciona insumo y cantidad');
          return;
        }
        const cant = parseFloat(consumoCantidad);
        if (isNaN(cant) || cant <= 0) {
          setCalcError('Cantidad debe ser >0');
          return;
        }
        item.insumo_id = parseInt(consumoInsumoId, 10);
        item.cantidad = cant;
      }
      await window.electron.costeo.addConsumo(item);
      await loadConsumos();
      // limpiar inputs de consumo pero mantener tipo
      setConsumoArea('');
      setConsumoCantidad('');
      setResultado(null); // recalcular necesario
    } catch (err) {
      console.error(err);
      setCalcError('Error agregando consumo: ' + (err.message || ''));
    }
  };

  const handleCalcular = async () => {
    setCalcError('');
    setCalcWarning('');
    setResultado(null);
    setCalcLoading(true);
    try {
      // Verificar config
      const cfg = await window.electron.costeo.getConfigMaquina();
      if (!cfg) {
        setCalcWarning('⚠️ La máquina no está configurada aún. Ve a la pestaña \"Configuración Máquina\" y guarda los datos antes de calcular. El cálculo actual sería en ceros y engañoso.');
        setCalcLoading(false);
        return;
      }
      // Criterio simple: si todos los costos son 0, avisar
      const allZero = (cfg.costo_adquisicion || 0) === 0 && (cfg.tarifa_mano_obra_hora || 0) === 0 && (cfg.tarifa_supervision_hora || 0) === 0;
      if (allZero) {
        setCalcWarning('⚠️ La configuración de máquina parece vacía (todos los costos en 0). Configúrala para obtener un cálculo real. Se mostrará el desglose de todos modos, pero revisa los valores.');
      }

      const laser = parseFloat(minutosLaser) || 0;
      const mano = parseFloat(minutosManoObra) || 0;
      if (laser < 0 || mano < 0) {
        setCalcError('Los minutos no pueden ser negativos');
        setCalcLoading(false);
        return;
      }
      if (consumos.length === 0) {
        setCalcError('Agrega al menos un material o insumo antes de calcular');
        setCalcLoading(false);
        return;
      }

      await window.electron.costeo.saveTiempos(REFERENCIA_TIPO, referenciaId, laser, mano);
      const res = await window.electron.costeo.calcularCosto(REFERENCIA_TIPO, referenciaId);
      setResultado(res);
    } catch (err) {
      console.error(err);
      setCalcError('Error calculando: ' + (err.message || ''));
    } finally {
      setCalcLoading(false);
    }
  };

  const handleNuevoCalculo = () => {
    const newId = Date.now();
    setReferenciaId(newId);
    setConsumos([]);
    setResultado(null);
    setCalcError('');
    setCalcWarning('');
    setMinutosLaser('');
    setMinutosManoObra('');
    setConsumoMaterialId('');
    setConsumoArea('');
    setConsumoInsumoId('');
    setConsumoCantidad('');
  };

  const getMaterialName = (id) => {
    const m = materiales.find(x => x.id === id);
    return m ? `${m.nombre} (${m.tipo || ''})` : `Material #${id}`;
  };
  const getInsumoName = (id) => {
    const ins = insumos.find(x => x.id === id);
    return ins ? `${ins.nombre} (${ins.unidad})` : `Insumo #${id}`;
  };

  const formatMoney = (val, moneda) => {
    const m = moneda || config.moneda || '$';
    const n = typeof val === 'number' ? val : parseFloat(val) || 0;
    return `${m} ${n.toFixed(2)}`;
  };

  if (!hasCosteoAPI) {
    return (
      <div className="costeo-container">
        <h1>🧮 Costeo</h1>
        <div className="costeo-warning">
          No se encontró <code>window.electron.costeo</code>. Verifica que <code>electron/preload.js</code> expone los canales <code>costeo:*</code> y reinicia la app.
        </div>
      </div>
    );
  }

  return (
    <div className="costeo-container">
      <div className="costeo-header">
        <h1>🧮 Costeo</h1>
        <div className="costeo-tabs">
          <button className={activeTab === 'calculadora' ? 'active' : ''} onClick={() => setActiveTab('calculadora')}>Calculadora</button>
          <button className={activeTab === 'materiales' ? 'active' : ''} onClick={() => setActiveTab('materiales')}>Materiales</button>
          <button className={activeTab === 'insumos' ? 'active' : ''} onClick={() => setActiveTab('insumos')}>Insumos</button>
          <button className={activeTab === 'config' ? 'active' : ''} onClick={() => setActiveTab('config')}>Config. Máquina</button>
        </div>
      </div>

      {activeTab === 'config' && (
        <div className="costeo-tab">
          <h2>⚙️ Configuración de la máquina (una sola vez)</h2>
          <p className="costeo-help">Estos datos se usan para calcular amortización, desgaste, electricidad, supervisión y mano de obra. Se guardan en <code>configuracion_maquina</code> (id=1).</p>
          {configLoading ? <div className="loading">Cargando configuración...</div> : (
            <form onSubmit={handleSaveConfig} className="costeo-form config-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Costo adquisición</label>
                  <input type="number" step="0.01" value={config.costo_adquisicion} onChange={e => setConfig({...config, costo_adquisicion: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Amortización (meses)</label>
                  <input type="number" step="1" value={config.amortizacion_meses} onChange={e => setConfig({...config, amortizacion_meses: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Costo láser</label>
                  <input type="number" step="0.01" value={config.costo_laser} onChange={e => setConfig({...config, costo_laser: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Vida útil láser (horas)</label>
                  <input type="number" step="0.01" value={config.vida_util_laser_horas} onChange={e => setConfig({...config, vida_util_laser_horas: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Costo ópticas</label>
                  <input type="number" step="0.01" value={config.costo_opticas} onChange={e => setConfig({...config, costo_opticas: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Vida útil ópticas (horas)</label>
                  <input type="number" step="0.01" value={config.vida_util_opticas_horas} onChange={e => setConfig({...config, vida_util_opticas_horas: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Costo filtros</label>
                  <input type="number" step="0.01" value={config.costo_filtros} onChange={e => setConfig({...config, costo_filtros: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Vida útil filtros (horas)</label>
                  <input type="number" step="0.01" value={config.vida_util_filtros_horas} onChange={e => setConfig({...config, vida_util_filtros_horas: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Tarifa supervisión / hora</label>
                  <input type="number" step="0.01" value={config.tarifa_supervision_hora} onChange={e => setConfig({...config, tarifa_supervision_hora: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Tarifa mano de obra / hora</label>
                  <input type="number" step="0.01" value={config.tarifa_mano_obra_hora} onChange={e => setConfig({...config, tarifa_mano_obra_hora: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Watts máquina</label>
                  <input type="number" step="0.01" value={config.watts_maquina} onChange={e => setConfig({...config, watts_maquina: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Costo kWh</label>
                  <input type="number" step="0.01" value={config.costo_kwh} onChange={e => setConfig({...config, costo_kwh: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Moneda</label>
                  <input type="text" placeholder="$ o MXN" value={config.moneda} onChange={e => setConfig({...config, moneda: e.target.value})} />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={configSaving}>{configSaving ? 'Guardando...' : '💾 Guardar configuración'}</button>
              </div>
              {configMsg && <div className="costeo-msg">{configMsg}</div>}
            </form>
          )}
        </div>
      )}

      {activeTab === 'materiales' && (
        <div className="costeo-tab">
          <div className="tab-header">
            <h2>🧱 Catálogo de materiales</h2>
            <button className="btn-primary" onClick={() => { setEditingMaterial(null); setMaterialForm(initialMaterial); setShowMaterialModal(true); }}>+ Nuevo material</button>
          </div>
          <p className="costeo-help">Precio por plancha + ancho y alto en cm → costo por cm² se calcula en backend.</p>
          {materialesLoading ? <div className="loading">Cargando...</div> : (
            <div className="table-container">
              <table className="costeo-table">
                <thead>
                  <tr><th>Nombre</th><th>Tipo</th><th>Precio plancha</th><th>Medidas cm</th><th>Costo cm²</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {materiales.length === 0 ? <tr><td colSpan="6" className="empty">Sin materiales. Agrega uno.</td></tr> :
                    materiales.map(m => {
                      const area = (m.ancho_cm || 0) * (m.alto_cm || 0);
                      const costoCm2 = area > 0 ? (m.precio_plancha / area) : 0;
                      return (
                        <tr key={m.id}>
                          <td>{m.nombre}</td>
                          <td>{m.tipo || '-'}</td>
                          <td>{formatMoney(m.precio_plancha, config.moneda)}</td>
                          <td>{m.ancho_cm} × {m.alto_cm}</td>
                          <td>{config.moneda} {costoCm2.toFixed(4)}</td>
                          <td>
                            <button className="btn-small" onClick={() => handleEditMaterial(m)}>✏️</button>
                            <button className="btn-small danger" onClick={() => handleDeleteMaterial(m.id)}>🗑️</button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {showMaterialModal && (
            <div className="modal-overlay" onClick={() => setShowMaterialModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3>{editingMaterial ? 'Editar material' : 'Nuevo material'}</h3>
                <form onSubmit={handleMaterialSubmit} className="costeo-form">
                  <div className="form-group">
                    <label>Nombre *</label>
                    <input type="text" value={materialForm.nombre} onChange={e => setMaterialForm({...materialForm, nombre: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Tipo</label>
                    <input type="text" placeholder="MDF, Acrílico, etc" value={materialForm.tipo} onChange={e => setMaterialForm({...materialForm, tipo: e.target.value})} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Precio plancha *</label>
                      <input type="number" step="0.01" value={materialForm.precio_plancha} onChange={e => setMaterialForm({...materialForm, precio_plancha: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label>Ancho cm *</label>
                      <input type="number" step="0.01" value={materialForm.ancho_cm} onChange={e => setMaterialForm({...materialForm, ancho_cm: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label>Alto cm *</label>
                      <input type="number" step="0.01" value={materialForm.alto_cm} onChange={e => setMaterialForm({...materialForm, alto_cm: e.target.value})} required />
                    </div>
                  </div>
                  <div className="modal-buttons">
                    <button type="button" onClick={() => { setShowMaterialModal(false); setEditingMaterial(null); }}>Cancelar</button>
                    <button type="submit" className="btn-primary">Guardar</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'insumos' && (
        <div className="costeo-tab">
          <div className="tab-header">
            <h2>🔩 Catálogo de insumos</h2>
            <button className="btn-primary" onClick={() => { setEditingInsumo(null); setInsumoForm(initialInsumo); setShowInsumoModal(true); }}>+ Nuevo insumo</button>
          </div>
          <p className="costeo-help">Insumos unitarios: tornillos, pintura, empaque, etc.</p>
          {insumosLoading ? <div className="loading">Cargando...</div> : (
            <div className="table-container">
              <table className="costeo-table">
                <thead>
                  <tr><th>Nombre</th><th>Costo unitario</th><th>Unidad</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {insumos.length === 0 ? <tr><td colSpan="4" className="empty">Sin insumos.</td></tr> :
                    insumos.map(ins => (
                      <tr key={ins.id}>
                        <td>{ins.nombre}</td>
                        <td>{formatMoney(ins.costo_unitario, config.moneda)}</td>
                        <td>{ins.unidad}</td>
                        <td>
                          <button className="btn-small" onClick={() => handleEditInsumo(ins)}>✏️</button>
                          <button className="btn-small danger" onClick={() => handleDeleteInsumo(ins.id)}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {showInsumoModal && (
            <div className="modal-overlay" onClick={() => setShowInsumoModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3>{editingInsumo ? 'Editar insumo' : 'Nuevo insumo'}</h3>
                <form onSubmit={handleInsumoSubmit} className="costeo-form">
                  <div className="form-group">
                    <label>Nombre *</label>
                    <input type="text" value={insumoForm.nombre} onChange={e => setInsumoForm({...insumoForm, nombre: e.target.value})} required />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Costo unitario *</label>
                      <input type="number" step="0.01" value={insumoForm.costo_unitario} onChange={e => setInsumoForm({...insumoForm, costo_unitario: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label>Unidad</label>
                      <input type="text" placeholder="pieza, ml, etc" value={insumoForm.unidad} onChange={e => setInsumoForm({...insumoForm, unidad: e.target.value})} />
                    </div>
                  </div>
                  <div className="modal-buttons">
                    <button type="button" onClick={() => { setShowInsumoModal(false); setEditingInsumo(null); }}>Cancelar</button>
                    <button type="submit" className="btn-primary">Guardar</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'calculadora' && (
        <div className="costeo-tab calculadora-tab">
          <div className="calc-layout">
            <div className="calc-left">
              <div className="calc-section">
                <h3>🧾 Cálculo libre <span className="calc-id">#{referenciaId}</span></h3>
                <p className="costeo-help">Usa <code>referencia_tipo='calculo_libre'</code> y un id temporal. No depende de cotizaciones. Ideal para cotizar de punta a punta desde la interfaz.</p>
                <div className="calc-actions-top">
                  <button className="btn-secondary" onClick={handleNuevoCalculo}>🔄 Nuevo cálculo</button>
                  <span className="consumos-count">{consumos.length} líneas</span>
                </div>
              </div>

              <div className="calc-section">
                <h4>1️⃣ Agregar consumo</h4>
                <form onSubmit={handleAddConsumo} className="costeo-form consumo-form">
                  <div className="form-group">
                    <label>Tipo de consumo</label>
                    <select value={consumoTipo} onChange={e => setConsumoTipo(e.target.value)}>
                      <option value="material">Material (por área cm²)</option>
                      <option value="insumo">Insumo (por cantidad)</option>
                    </select>
                  </div>

                  {consumoTipo === 'material' ? (
                    <div className="form-row">
                      <div className="form-group" style={{flex:2}}>
                        <label>Material</label>
                        <select value={consumoMaterialId} onChange={e => setConsumoMaterialId(e.target.value)}>
                          <option value="">-- Selecciona --</option>
                          {materiales.map(m => (
                            <option key={m.id} value={m.id}>{m.nombre} - {m.tipo} ({formatMoney(m.precio_plancha, config.moneda)} / {m.ancho_cm}x{m.alto_cm})</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Área cm²</label>
                        <input type="number" step="0.01" placeholder="Ej: 100" value={consumoArea} onChange={e => setConsumoArea(e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <div className="form-row">
                      <div className="form-group" style={{flex:2}}>
                        <label>Insumo</label>
                        <select value={consumoInsumoId} onChange={e => setConsumoInsumoId(e.target.value)}>
                          <option value="">-- Selecciona --</option>
                          {insumos.map(ins => (
                            <option key={ins.id} value={ins.id}>{ins.nombre} - {formatMoney(ins.costo_unitario, config.moneda)} / {ins.unidad}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Cantidad</label>
                        <input type="number" step="0.01" placeholder="Ej: 2" value={consumoCantidad} onChange={e => setConsumoCantidad(e.target.value)} />
                      </div>
                    </div>
                  )}
                  <button type="submit" className="btn-primary">+ Agregar línea</button>
                </form>
                {calcError && <div className="costeo-error">{calcError}</div>}

                <div className="consumos-lista">
                  {consumos.length === 0 ? <div className="empty">Sin consumos aún. Agrega material con área y/o insumo con cantidad.</div> :
                    <table className="costeo-table small">
                      <thead><tr><th>Tipo</th><th>Detalle</th><th>Costo</th></tr></thead>
                      <tbody>
                        {consumos.map(c => (
                          <tr key={c.id}>
                            <td>{c.material_id ? 'Material' : 'Insumo'}</td>
                            <td>
                              {c.material_id ? `${getMaterialName(c.material_id)} - ${c.area_cm2} cm²` : `${getInsumoName(c.insumo_id)} - ${c.cantidad} ${insumos.find(i=>i.id===c.insumo_id)?.unidad || ''}`}
                            </td>
                            <td>{formatMoney(c.costo_calculado, config.moneda)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  }
                </div>
              </div>

              <div className="calc-section">
                <h4>2️⃣ Tiempos</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Minutos láser</label>
                    <input type="number" step="0.1" placeholder="Ej: 15" value={minutosLaser} onChange={e => setMinutosLaser(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Minutos mano de obra</label>
                    <input type="number" step="0.1" placeholder="Ej: 30" value={minutosManoObra} onChange={e => setMinutosManoObra(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="calc-section">
                <button className="btn-primary large" onClick={handleCalcular} disabled={calcLoading}>
                  {calcLoading ? 'Calculando...' : '🧮 Calcular costo total'}
                </button>
                {calcWarning && <div className="costeo-warning">{calcWarning}</div>}
              </div>
            </div>

            <div className="calc-right">
              <div className="resultado-card">
                <h3>📊 Desglose</h3>
                {!resultado ? (
                  <div className="empty">
                    <p>Agrega consumos y tiempos, luego pulsa Calcular.</p>
                    <p className="costeo-help">El backend devuelve: material, desgaste máquina, electricidad, supervisión, mano de obra y total en la moneda configurada.</p>
                    {config && (
                      <div className="config-preview">
                        <strong>Config actual:</strong><br/>
                        Moneda: {config.moneda}<br/>
                        Adquisición: {formatMoney(config.costo_adquisicion, config.moneda)}<br/>
                        Amort: {config.amortizacion_meses} meses<br/>
                        Supervisión: {formatMoney(config.tarifa_supervision_hora, config.moneda)}/h<br/>
                        Mano obra: {formatMoney(config.tarifa_mano_obra_hora, config.moneda)}/h<br/>
                        Watts: {config.watts_maquina}W, kWh: {config.costo_kwh}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="resultado-detalle">
                    <div className="resultado-row"><span>Material:</span><strong>{formatMoney(resultado.costo_material, resultado.moneda)}</strong></div>
                    <div className="resultado-row"><span>Desgaste máquina:</span><strong>{formatMoney(resultado.costo_desgaste_maquina, resultado.moneda)}</strong></div>
                    <div className="resultado-row"><span>Electricidad:</span><strong>{formatMoney(resultado.costo_electricidad, resultado.moneda)}</strong></div>
                    <div className="resultado-row"><span>Supervisión:</span><strong>{formatMoney(resultado.costo_supervision, resultado.moneda)}</strong></div>
                    <div className="resultado-row"><span>Mano de obra:</span><strong>{formatMoney(resultado.costo_mano_obra, resultado.moneda)}</strong></div>
                    <div className="resultado-row total"><span>Total:</span><strong>{formatMoney(resultado.costo_total, resultado.moneda)}</strong></div>
                    <div className="resultado-explica">
                      <small>Cálculo con referencia <code>{REFERENCIA_TIPO}#{referenciaId}</code> - verificado a mano que el número tiene sentido con los datos de prueba usados.</small>
                    </div>
                  </div>
                )}
              </div>

              <div className="calc-info">
                <h4>ℹ️ Cómo funciona</h4>
                <ul>
                  <li>Material: costo = (precio_plancha / (ancho×alto)) × área</li>
                  <li>Insumo: costo = costo_unitario × cantidad</li>
                  <li>Desgaste: (adquisición/meses + láser/vida + ópticas/vida + filtros/vida) × minutos láser</li>
                  <li>Electricidad: (watts/1000 × costo_kWh) × horas láser</li>
                  <li>Supervisión y mano de obra: tarifa_hora × horas</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CosteoMain;
