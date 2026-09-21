import React, { useState } from 'react';
import fondoTrabajo from '../../assets/trabajo-bg.jpg'; // Ajusta la ruta si usas "assets"
import ColaTrabajos from './ColaTrabajos';
import TrabajoActual from './TrabajoActual';
import ResumenFinanciero from './ResumenFinanciero';
import './ProductionMain.css';
import systemMonitor from '../../components/Core/SystemMonitor';
import { deleteWithTrash } from '../../utils/deleteWithTrash';

const SECCIONES = [
  { id: 'cola', label: 'Cola de Trabajos' },
  { id: 'actual', label: 'Trabajo Actual' },
  { id: 'resumen', label: 'Resumen Financiero' }
];

const ProductionMain = ({ onBackToDashboard }) => {
  const [seccionActiva, setSeccionActiva] = useState(null);
  // Trabajos pendientes (simulado, normalmente vendría de localStorage o API)
  const [trabajos, setTrabajos] = useState([]);

  React.useEffect(() => {
    systemMonitor.recordMetric('renders', Date.now());
    systemMonitor.log('trabajo_render', {});
  }, []);

  // Eliminar trabajo de la cola
  const handleEliminarTrabajo = idx => {
    const trabajo = trabajos[idx];
    deleteWithTrash({
      id: `trabajo-${trabajo.id}`,
      name: trabajo.trabajo,
      type: 'trabajo'
    });
    setTrabajos(trabajos.filter((_, i) => i !== idx));
  };

  return (
    <div
      className="trabajo-bg"
      style={{
        background: `#f4f4f4 url(${fondoTrabajo}) center center/cover no-repeat`
      }}
    >
      <div className="trabajo-menu-horizontal">
        {SECCIONES.map(sec => (
          <button
            key={sec.id}
            className={`trabajo-menu-btn${seccionActiva === sec.id ? ' active' : ''}`}
            onClick={() => setSeccionActiva(sec.id)}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {seccionActiva === 'cola' && (
        <div className="trabajo-seccion-panel">
          <ColaTrabajos trabajos={trabajos} onSeleccionarTrabajo={() => {}} onEliminar={handleEliminarTrabajo} />
          <button className="volver-trabajo-btn" onClick={() => setSeccionActiva(null)}>
            ← Volver al menú de Trabajo
          </button>
        </div>
      )}
      {seccionActiva === 'actual' && (
        <div className="trabajo-seccion-panel">
          <TrabajoActual />
          <button className="volver-trabajo-btn" onClick={() => setSeccionActiva(null)}>
            ← Volver al menú de Trabajo
          </button>
        </div>
      )}
      {seccionActiva === 'resumen' && (
        <div className="trabajo-seccion-panel">
          <ResumenFinanciero />
          <button className="volver-trabajo-btn" onClick={() => setSeccionActiva(null)}>
            ← Volver al menú de Trabajo
          </button>
        </div>
      )}

      {/* Botón fijo para volver al menú principal */}
      <button className="volver-dashboard-btn" onClick={onBackToDashboard}>
        ← Volver al menú principal
      </button>
    </div>
  );
};

export default ProductionMain;