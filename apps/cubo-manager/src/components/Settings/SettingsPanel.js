import React from 'react';
import { useTheme } from '../ThemeManager/ThemeProvider';
import ThemeSelector from '../ThemeManager/ThemeSelector';
import CoverImageUploader from '../ThemeManager/CoverImageUploader';
import './SettingsPanel.css';

const SettingsPanel = () => {
  const { getTheme } = useTheme();
  const theme = getTheme();

  return (
    <div 
      className="settings-panel-container"
      style={{
        background: `rgba(${parseInt(theme.background.slice(1, 3), 16)}, ${parseInt(theme.background.slice(3, 5), 16)}, ${parseInt(theme.background.slice(5, 7), 16)}, 0.95)`,
        borderColor: theme.primary,
      }}
    >
      <div className="settings-header">
        <h2 className="settings-title">⚙️ Configuración del Sistema</h2>
        <p className="settings-subtitle">Personaliza tu experiencia en Mi Taller</p>
      </div>

      <div className="settings-content">
        {/* Sección de Temas */}
        <div className="settings-section">
          <h3 className="settings-section-title" style={{ color: theme.primary }}>🎨 Tema Global</h3>
          <p className="settings-section-desc">Selecciona el tema oscuro que prefieres</p>
          <ThemeSelector />
        </div>

        {/* Sección de Portadas */}
        <div className="settings-section">
          <h3 className="settings-section-title" style={{ color: theme.primary }}>📸 Portadas de Módulos</h3>
          <p className="settings-section-desc">Sube imágenes personalizadas para cada módulo</p>
          <div className="cover-uploader-wrapper">
            <CoverImageUploader moduleName="dashboard" onUpload={(data) => console.log('Cover updated')} />
          </div>
        </div>

        {/* Sección de Información */}
        <div className="settings-section">
          <h3 className="settings-section-title" style={{ color: theme.primary }}>ℹ️ Información del Sistema</h3>
          <div className="settings-info">
            <div className="info-row">
              <span className="info-label">Versión:</span>
              <span className="info-value">1.0.0 Electron</span>
            </div>
            <div className="info-row">
              <span className="info-label">Entorno:</span>
              <span className="info-value">Desktop (Local)</span>
            </div>
            <div className="info-row">
              <span className="info-label">Almacenamiento:</span>
              <span className="info-value">SQLite + JSON</span>
            </div>
            <div className="info-row">
              <span className="info-label">Usuario:</span>
              <span className="info-value">{localStorage.getItem('userEmail') || 'Anónimo'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;