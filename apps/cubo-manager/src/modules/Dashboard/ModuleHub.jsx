import React from 'react';
import { useNavigate } from 'react-router-dom';
import moduleHubConfig from './moduleHubConfig';
import './ModuleHub.css';

// Hub visual del Dashboard: acceso rápido a cada módulo con efecto de
// "glow" al pasar el cursor (mismo lenguaje visual en toda la app,
// pero cada módulo tiene su propio color/identidad).
const ModuleHub = () => {
  const navigate = useNavigate();

  return (
    <div className="module-hub">
      {moduleHubConfig.map((mod) => (
        <button
          key={mod.key}
          className="module-hub-node"
          style={{ '--glow': mod.glow }}
          onClick={() => navigate(mod.route)}
        >
          <span className="module-hub-icon">{mod.icon}</span>
          <span className="module-hub-label">{mod.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ModuleHub;
