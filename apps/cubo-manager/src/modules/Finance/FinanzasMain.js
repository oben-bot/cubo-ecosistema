import React, { useState } from 'react';
import './FinanzasMain.css';
import fondoFinanzas from '../../assets/finanzas-bg.jpg';
import FinanzasChart from './FinanzasChart';
import systemMonitor from '../../components/Core/SystemMonitor';
import { deleteWithTrash } from '../../utils/deleteWithTrash';

// Opciones de menú
const SECCIONES = [
  { id: 'gastos', label: 'Gastos' },
  { id: 'ganancias', label: 'Ganancias' },
  { id: 'trabajos', label: 'Trabajos' },
  { id: 'perdidas', label: 'Pérdidas' },
  { id: 'fechas', label: 'Fechas' },
];

const TIPOS = ['Gasto', 'Ganancia', 'Trabajo', 'Pérdida', 'Cliente'];

const FinanzasMain = ({ onBackToDashboard }) => {
  React.useEffect(() => {
    systemMonitor.recordMetric('renders', Date.now());
    systemMonitor.log('finanzas_render', {});
  }, []);

  const [seccionActiva, setSeccionActiva] = useState(null);
  const [mostrarIngreso, setMostrarIngreso] = useState(false);
  const [datos, setDatos] = useState(() => {
    const guardados = localStorage.getItem("finanzasDatos");
    return guardados ? JSON.parse(guardados) : [];
  });
  const [nuevoDato, setNuevoDato] = useState({
    tipo: 'Gasto',
    descripcion: '',
    monto: '',
    fecha: '',
    cliente: ''
  });

  // Manejo de ingreso de datos
  const handleInputChange = e => {
    setNuevoDato({ ...nuevoDato, [e.target.name]: e.target.value });
  };

  const handleGuardar = e => {
    e.preventDefault();
    setDatos([...datos, nuevoDato]);
    setNuevoDato({ tipo: 'Gasto', descripcion: '', monto: '', fecha: '', cliente: '' });
    setMostrarIngreso(false);
  };

  // Eliminar dato financiero
  const handleEliminarDato = idx => {
    const dato = datosFiltrados[idx];
    deleteWithTrash({
      id: `finanza-${idx}-${dato.descripcion}`,
      name: dato.descripcion,
      type: 'finanza'
    });
    // Eliminar del array principal
    const indexInDatos = datos.findIndex(d => d === dato);
    if (indexInDatos !== -1) {
      setDatos(datos.filter((_, i) => i !== indexInDatos));
    }
  };

  // Filtrar datos por sección
  const datosFiltrados = seccionActiva
    ? datos.filter(d => d.tipo.toLowerCase() === seccionActiva)
    : [];

  return (
    <div
      className="finanzas-bg"
      style={{
        background: `#f4f4f4 url(${fondoFinanzas}) center center/cover no-repeat`
      }}
    >
      {/* Menú horizontal */}
      <div className="finanzas-menu-horizontal">
        {SECCIONES.map(sec => (
          <button
            key={sec.id}
            className={`finanzas-menu-btn${seccionActiva === sec.id ? ' active' : ''}`}
            onClick={() => setSeccionActiva(sec.id)}
          >
            {sec.label}
          </button>
        ))}
        <button
          className="finanzas-menu-btn ingresar"
          onClick={() => setMostrarIngreso(true)}
        >
          INGRESAR
        </button>
      </div>

      {/* Pantalla de sección */}
      {seccionActiva && (
        <div className="finanzas-seccion-panel">
          <h2>{SECCIONES.find(s => s.id === seccionActiva).label}</h2>
          <button className="volver-finanzas-btn" onClick={() => setSeccionActiva(null)}>
            ← Volver al menú de Finanzas
          </button>
          <table className="finanzas-seccion-tabla">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Monto</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {datosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#aaa' }}>Sin datos</td>
                </tr>
              )}
              {datosFiltrados.map((d, i) => (
                <tr key={i}>
                  <td>{d.tipo}</td>
                  <td>{d.descripcion}</td>
                  <td>${d.monto}</td>
                  <td>{d.fecha}</td>
                  <td>{d.cliente}</td>
                  <td><button className="btn-eliminar" onClick={() => handleEliminarDato(i)}>Eliminar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Formulario de ingreso */}
      {mostrarIngreso && (
        <div className="finanzas-modal-bg">
          <div className="finanzas-modal">
            <h2>Ingresar Dato</h2>
            <form onSubmit={handleGuardar}>
              <label>
                Tipo:
                <select name="tipo" value={nuevoDato.tipo} onChange={handleInputChange}>
                  {TIPOS.map(t => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label>
                Descripción:
                <input name="descripcion" value={nuevoDato.descripcion} onChange={handleInputChange} required />
              </label>
              <label>
                Monto:
                <input name="monto" type="number" value={nuevoDato.monto} onChange={handleInputChange} required />
              </label>
              <label>
                Fecha:
                <input name="fecha" type="date" value={nuevoDato.fecha} onChange={handleInputChange} required />
              </label>
              <label>
                Cliente:
                <input name="cliente" value={nuevoDato.cliente} onChange={handleInputChange} />
              </label>
              <div className="finanzas-modal-botones">
                <button type="submit" className="guardar-btn">Guardar</button>
                <button type="button" className="cancelar-btn" onClick={() => setMostrarIngreso(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gráficas */}
      <div className="finanzas-graficas">
  <FinanzasChart datos={datos} />
</div>
      {/* Botón fijo para volver al menú principal */}
      <button className="volver-dashboard-btn" onClick={onBackToDashboard}>
        ← Volver al menú principal
      </button>
    </div>
  );
};

export default FinanzasMain;