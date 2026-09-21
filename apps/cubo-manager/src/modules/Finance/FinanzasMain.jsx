import React, { useState, useEffect } from 'react';
import './FinanzasMain.css';

const FinanzasMain = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [resumen, setResumen] = useState({ ingresos: 0, egresos: 0, balance: 0 });
  const [periodo, setPeriodo] = useState('mes');
  const [loading, setLoading] = useState(true);
  const [showEgresoModal, setShowEgresoModal] = useState(false);
  const [egresoData, setEgresoData] = useState({ categoria: 'gasto_operativo', monto: 0, descripcion: '' });

  useEffect(() => {
    loadData();
    loadResumen();
  }, [periodo]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await window.electron.finanzas.getAll();
      setMovimientos(data || []);
    } catch (error) {
      console.error('Error cargando movimientos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadResumen = async () => {
    try {
      const data = await window.electron.finanzas.getResumen(periodo);
      setResumen(data);
    } catch (error) {
      console.error('Error cargando resumen:', error);
    }
  };

  const handleRegistrarEgreso = async (e) => {
    e.preventDefault();
    try {
      await window.electron.finanzas.registrarEgreso({ ...egresoData, usuario: 'admin' });
      await loadData();
      await loadResumen();
      setShowEgresoModal(false);
      setEgresoData({ categoria: 'gasto_operativo', monto: 0, descripcion: '' });
    } catch (error) {
      console.error('Error registrando egreso:', error);
    }
  };

  if (loading) return <div className="loading">Cargando finanzas...</div>;

  return (
    <div className="finanzas-container">
      <div className="finanzas-header">
        <h1>📊 Finanzas</h1>
        <div className="finanzas-actions">
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="periodo-select">
            <option value="dia">Hoy</option>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
            <option value="año">Año</option>
          </select>
          <button onClick={() => setShowEgresoModal(true)} className="btn-secondary">➖ Registrar Gasto</button>
        </div>
      </div>

      <div className="finanzas-resumen">
        <div className="resumen-card ingresos">
          <span className="label">Ingresos</span>
          <span className="monto">${resumen.ingresos?.toFixed(2)}</span>
        </div>
        <div className="resumen-card egresos">
          <span className="label">Egresos</span>
          <span className="monto">${resumen.egresos?.toFixed(2)}</span>
        </div>
        <div className="resumen-card balance">
          <span className="label">Balance</span>
          <span className="monto">${resumen.balance?.toFixed(2)}</span>
        </div>
      </div>

      <div className="movimientos-table-container">
        <table className="movimientos-table">
          <thead>
            <tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>Monto</th><th>Descripción</th></tr>
          </thead>
          <tbody>
            {movimientos.map(mov => (
              <tr key={mov.id}>
                <td>{new Date(mov.fecha).toLocaleDateString()}</td>
                <td className={mov.tipo}>{mov.tipo === 'ingreso' ? '💰 Ingreso' : '➖ Egreso'}</td>
                <td>{mov.categoria}</td>
                <td className={mov.tipo}>${mov.monto.toFixed(2)}</td>
                <td>{mov.descripcion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Egreso */}
      {showEgresoModal && (
        <div className="modal-overlay" onClick={() => setShowEgresoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Registrar Gasto</h2>
            <form onSubmit={handleRegistrarEgreso}>
              <select value={egresoData.categoria} onChange={(e) => setEgresoData({...egresoData, categoria: e.target.value})}>
                <option value="compra_material">Compra de material</option>
                <option value="gasto_operativo">Gasto operativo</option>
                <option value="salario">Salario</option>
              </select>
              <input type="number" step="0.01" placeholder="Monto" value={egresoData.monto} onChange={(e) => setEgresoData({...egresoData, monto: parseFloat(e.target.value) || 0})} required />
              <textarea placeholder="Descripción" value={egresoData.descripcion} onChange={(e) => setEgresoData({...egresoData, descripcion: e.target.value})} />
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowEgresoModal(false)}>Cancelar</button>
                <button type="submit">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanzasMain;
