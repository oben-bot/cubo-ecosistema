import React, { useState } from 'react';

const AssistantSettings = () => {
  const [settings, setSettings] = useState({
    nivelAsistencia: 'completo',
    notificaciones: true,
    analisisAutomatico: true
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="assistant-settings">
      <h3>Configuración del Asistente</h3>
      
      <div className="setting-group">
        <label>Nivel de Asistencia:</label>
        <select
          name="nivelAsistencia"
          value={settings.nivelAsistencia}
          onChange={handleChange}
        >
          <option value="basico">Básico</option>
          <option value="intermedio">Intermedio</option>
          <option value="completo">Completo</option>
        </select>
      </div>

      <div className="setting-group">
        <label>
          <input
            type="checkbox"
            name="notificaciones"
            checked={settings.notificaciones}
            onChange={handleChange}
          />
          Notificaciones activas
        </label>
      </div>

      <div className="setting-group">
        <label>
          <input
            type="checkbox"
            name="analisisAutomatico"
            checked={settings.analisisAutomatico}
            onChange={handleChange}
          />
          Análisis automático de decisiones
        </label>
      </div>
    </div>
  );
};

export default AssistantSettings;