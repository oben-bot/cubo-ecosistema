import React, { useState } from 'react';
import './CotizacionMain.css';
import { useNavigate } from 'react-router-dom'; // <-- Agrega esto
import CotizacionesHeader from './CotizacionesHeader';
import FormularioCotizacion from './FormularioCotizacion';
import HistorialCotizaciones from './HistorialCotizaciones';
import systemMonitor from '../../components/Core/SystemMonitor';
import { deleteWithTrash } from '../../utils/deleteWithTrash';

const SECCIONES = [
  { id: 'formulario', label: 'Nueva Cotización' },
  { id: 'historial', label: 'Historial' }
];

const CotizacionesMain = (props) => {
  const { onBackToDashboard } = props;
  const [activeTab, setActiveTab] = useState('formulario');
  const [cotizaciones, setCotizaciones] = useState([]);
  const navigate = useNavigate(); // <-- Agrega esto

  React.useEffect(() => {
    systemMonitor.recordMetric('renders', Date.now());
    systemMonitor.log('cotizaciones_render', {});
  }, []);

  const handleAutorizar = (data) => {
    alert(`Presupuesto autorizado y enviado a producción por $${data.precio}`);
    const nuevaCotizacion = {
      id: cotizaciones.length + 1,
      cliente: data.cliente,
      fecha: new Date().toISOString().split('T')[0],
      trabajo: data.trabajoPersonalizado || data.trabajoSeleccionado,
      precio: Number(data.precio),
      estado: "Autorizado",
      detalles: "Enviado a producción"
    };
    setCotizaciones(prev => [...prev, nuevaCotizacion]);

    // --- GUARDAR EN FINANZAS ---
    const nuevoMovimiento = {
      tipo: "ganancia",
      descripcion: nuevaCotizacion.trabajo,
      monto: nuevaCotizacion.precio,
      fecha: nuevaCotizacion.fecha,
      cliente: nuevaCotizacion.cliente
    };
    // Obtén los movimientos actuales
    const movimientos = JSON.parse(localStorage.getItem("finanzasDatos") || "[]");
    movimientos.push(nuevoMovimiento);
    localStorage.setItem("finanzasDatos", JSON.stringify(movimientos));
    // --- FIN GUARDAR EN FINANZAS ---

    // Redirige al área de producción
    navigate('/production');
  };

  const handleGuardar = (data) => {
    alert(`Presupuesto guardado como referencia por $${data.precio}`);
    setCotizaciones(prev => [...prev, {
      id: prev.length + 1,
      cliente: data.cliente,
      fecha: new Date().toISOString().split('T')[0],
      trabajo: data.trabajoPersonalizado || data.trabajoSeleccionado,
      precio: Number(data.precio),
      estado: "Guardado",
      detalles: "Presupuesto de referencia"
    }]);
  };

  // Eliminar cotización (solo desde historial)
  const handleEliminarCotizacion = idx => {
    const cot = cotizaciones[idx];
    deleteWithTrash({
      id: `cotizacion-${cot.id}`,
      name: cot.trabajo || cot.detalles || cot.cliente,
      type: 'cotizacion'
    });
    setCotizaciones(cotizaciones.filter((_, i) => i !== idx));
  };

  return (
    <div className="cotizaciones-bg" style={{ minHeight: "100vh", position: "relative" }}>
      <div className="cotizaciones-menu-horizontal">
        {SECCIONES.map(sec => (
          <button
            key={sec.id}
            className={`cotizaciones-menu-btn${activeTab === sec.id ? ' active' : ''}`}
            onClick={() => setActiveTab(sec.id)}
          >
            {sec.label}
          </button>
        ))}
      </div>

      <div className="cotizaciones-seccion-panel">
        <h1 className="text-2xl font-bold text-white mb-6">Gestión de Cotizaciones</h1>
        {activeTab === 'formulario' ? (
          <FormularioCotizacion 
            onAutorizar={handleAutorizar} 
            onGuardar={handleGuardar} 
          />
        ) : (
          <HistorialCotizaciones cotizaciones={cotizaciones} onEliminar={handleEliminarCotizacion} />
        )}
      </div>

      {/* Botón fijo para volver al menú principal */}
      <button
        className="volver-dashboard-btn"
        onClick={onBackToDashboard}
      >
        ← Volver al menú principal
      </button>
    </div>
  );
};

export default CotizacionesMain;