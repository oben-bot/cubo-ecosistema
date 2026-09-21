import React, { useState } from 'react';
import './LibraryMain.css';

const LibraryMain = ({ onBackToDashboard }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const handleLaunchMiniApp = async () => {
    setLoading(true);
    setError(null);
    setStatus('Iniciando Biblioteca Laser...');

    try {
      const appPath = 'C:\\Users\\HP\\Documents\\Logica_Biblioteca_Laser\\organizador_laser.pyw';
      
      if (window.electronAPI) {
        const result = await window.electronAPI.invoke('launch-mini-app', appPath);
        
        if (result.success) {
          setStatus('✅ Mini-App iniciada correctamente');
          setTimeout(() => setStatus(null), 3000);
        } else {
          setError('❌ Error: ' + result.error);
        }
      } else {
        setError('❌ No se pudo conectar con Electron');
      }
    } catch (err) {
      setError('❌ Error al iniciar Mini-App: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="library-container">
      <div className="library-header">
        <h1>📚 Biblioteca Laser</h1>
        <p>Gestión del inventario de diseños y materiales</p>
      </div>

      <div className="library-content">
        <div className="library-card">
          <div className="library-card-header">
            <span className="library-icon">🎨</span>
            <h2>Organizador de Diseños</h2>
          </div>
          <p className="library-description">
            Accede a la Mini-App "Organizador Laser" para gestionar tu biblioteca de diseños, 
            organizar por categorías y sincronizar con tu taller.
          </p>
          <div className="library-info">
            <div className="library-info-item">
              <span className="info-label">Ubicación:</span>
              <span className="info-value">C:\Users\HP\Documents\Logica_Biblioteca_Laser</span>
            </div>
            <div className="library-info-item">
              <span className="info-label">Formato:</span>
              <span className="info-value">Python App (.pyw)</span>
            </div>
          </div>

          {status && <div className="library-status success">{status}</div>}
          {error && <div className="library-status error">{error}</div>}

          <button
            className="library-launch-btn"
            onClick={handleLaunchMiniApp}
            disabled={loading}
          >
            {loading ? '⏳ Iniciando...' : '🚀 Abrir Biblioteca Laser'}
          </button>
        </div>

        <div className="library-card">
          <div className="library-card-header">
            <span className="library-icon">📊</span>
            <h2>Características</h2>
          </div>
          <ul className="library-features">
            <li>✅ Gestión de diseños y plantillas</li>
            <li>✅ Organización por categorías y tags</li>
            <li>✅ Búsqueda rápida de archivos</li>
            <li>✅ Sincronización automática</li>
            <li>✅ Historial de cambios</li>
            <li>✅ Exportación de datos</li>
          </ul>
        </div>

        <div className="library-card">
          <div className="library-card-header">
            <span className="library-icon">💾</span>
            <h2>Almacenamiento Local</h2>
          </div>
          <p className="library-description">
            Todos los datos se guardan localmente en formato JSON para máxima compatibilidad 
            y rapidez de acceso.
          </p>
          <div className="library-storage-info">
            <p><strong>Archivo principal:</strong> inventario_laser.json</p>
            <p><strong>Carpeta de datos:</strong> ~/.MiTaller/data/</p>
          </div>
        </div>
      </div>

      <button onClick={onBackToDashboard} className="library-back-btn">
        ← Volver al menú principal
      </button>
    </div>
  );
};

export default LibraryMain;
