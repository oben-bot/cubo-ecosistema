import React, { useState, useEffect } from 'react';
import './CalendarMain.css';

const CalendarMain = () => {
  const [eventos, setEventos] = useState([]);
  const [vista, setVista] = useState('mes');
  const [fechaActual, setFechaActual] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState(null);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'personal',
    fecha_inicio: '',
    fecha_fin: '',
    color: '#3b82f6',
    recordatorio_minutos: 0
  });

  useEffect(() => {
    loadEventos();
    sincronizarTrabajos();
  }, [fechaActual, vista]);

  const loadEventos = async () => {
    setLoading(true);
    try {
      let eventosData;
      if (vista === 'mes') {
        const inicio = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
        const fin = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);
        eventosData = await window.electron.calendario.getEventos(inicio.toISOString(), fin.toISOString());
      } else {
        eventosData = await window.electron.calendario.getAll();
      }
      setEventos(eventosData || []);
    } catch (error) {
      console.error('Error cargando eventos:', error);
    } finally {
      setLoading(false);
    }
  };

  const sincronizarTrabajos = async () => {
    try {
      await window.electron.calendario.syncTrabajos();
    } catch (error) {
      console.error('Error sincronizando trabajos:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedEvento) {
        await window.electron.calendario.update(selectedEvento.id, formData);
      } else {
        await window.electron.calendario.create(formData);
      }
      await loadEventos();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error guardando evento:', error);
    }
  };

  const resetForm = () => {
    setSelectedEvento(null);
    setFormData({ titulo: '', descripcion: '', tipo: 'personal', fecha_inicio: '', fecha_fin: '', color: '#3b82f6', recordatorio_minutos: 0 });
  };

  const renderVistaMes = () => {
    const año = fechaActual.getFullYear();
    const mes = fechaActual.getMonth();
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const diaInicioSemana = primerDia.getDay();

    const dias = [];
    for (let i = 0; i < diaInicioSemana; i++) dias.push(null);
    for (let i = 1; i <= diasEnMes; i++) dias.push(new Date(año, mes, i));

    const semanas = [];
    for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));

    const eventosporDia = {};
    eventos.forEach(evento => {
      const fechaKey = evento.fecha_inicio.split('T')[0];
      if (!eventosporDia[fechaKey]) eventosporDia[fechaKey] = [];
      eventosporDia[fechaKey].push(evento);
    });

    return (
      <div className="calendario-mes">
        <div className="calendario-header-mes">
          <button onClick={() => setFechaActual(new Date(año, mes - 1, 1))}>◀</button>
          <h2>{fechaActual.toLocaleString('es', { month: 'long', year: 'numeric' })}</h2>
          <button onClick={() => setFechaActual(new Date(año, mes + 1, 1))}>▶</button>
        </div>
        <div className="calendario-grid">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(dia => <div key={dia} className="calendario-dia-header">{dia}</div>)}
          {semanas.map((semana, idx) => semana.map((dia, diaIdx) => (
            <div key={`${idx}-${diaIdx}`} className="calendario-dia">
              {dia && (
                <>
                  <div className="dia-numero">{dia.getDate()}</div>
                  <div className="dia-eventos">
                    {eventosporDia[dia.toISOString().split('T')[0]]?.map(evento => (
                      <div key={evento.id} className="dia-evento" style={{ backgroundColor: evento.color }}>
                        {evento.titulo}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )))}
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading">Cargando calendario...</div>;

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h1>📅 Calendario</h1>
        <div className="calendar-actions">
          <button onClick={() => setVista('mes')} className={vista === 'mes' ? 'active' : ''}>Mes</button>
          <button onClick={() => setVista('lista')} className={vista === 'lista' ? 'active' : ''}>Lista</button>
          <button onClick={() => setShowModal(true)} className="btn-primary">+ Nuevo Evento</button>
        </div>
      </div>

      {vista === 'mes' ? renderVistaMes() : (
        <div className="eventos-lista">
          {eventos.map(e => (
            <div key={e.id} className="evento-item" style={{ borderLeftColor: e.color }}>
              <strong>{new Date(e.fecha_inicio).toLocaleDateString()}</strong> - {e.titulo}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedEvento ? 'Editar Evento' : 'Nuevo Evento'}</h2>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Título" value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} required />
              <input type="datetime-local" value={formData.fecha_inicio} onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})} required />
              <select value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})}>
                <option value="personal">Personal</option>
                <option value="trabajo">Trabajo</option>
                <option value="cotizacion">Cotización</option>
                <option value="recordatorio">Recordatorio</option>
              </select>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarMain;
