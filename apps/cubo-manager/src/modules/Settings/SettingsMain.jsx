import React, { useState, useEffect } from 'react';
import './SettingsMain.css';

const SettingsMain = () => {
  const [activeTab, setActiveTab] = useState('apariencia');
  const [settings, setSettings] = useState({
    theme: 'system',
    language: 'es',
    moneda: 'MXN'
  });
  const [fondos, setFondos] = useState({});
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [modulos, setModulos] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Cargar configuraciones al iniciar
  useEffect(() => {
    loadSettings();
    loadFondos();
    loadModulos();
  }, []);

  const loadSettings = async () => {
    const theme = await window.electron.config.get('theme');
    const language = await window.electron.config.get('language');
    const moneda = await window.electron.config.get('moneda');
    setSettings({ theme: theme || 'system', language: language || 'es', moneda: moneda || 'MXN' });
  };

  const loadFondos = async () => {
    const modulosList = ['dashboard', 'customers', 'quotations', 'production', 'warehouse', 'sales', 'finance', 'calendar', 'library'];
    const fondosData = {};
    for (const modulo of modulosList) {
      const fondo = await window.electron.database.get(
        'SELECT tipo, valor, imagen_url FROM fondos_por_modulo WHERE modulo = ?',
        [modulo]
      );
      fondosData[modulo] = fondo || { tipo: 'color', valor: '#1a1a2e' };
    }
    setFondos(fondosData);
  };

  const loadModulos = async () => {
    const modulosList = [
      { id: 'dashboard', nombre: 'Dashboard', activado: true },
      { id: 'customers', nombre: 'Clientes', activado: true },
      { id: 'quotations', nombre: 'Cotizaciones', activado: true },
      { id: 'production', nombre: 'Producción', activado: true },
      { id: 'warehouse', nombre: 'Almacén', activado: true },
      { id: 'sales', nombre: 'Ventas', activado: true },
      { id: 'finance', nombre: 'Finanzas', activado: true },
      { id: 'calendar', nombre: 'Calendario', activado: true },
      { id: 'library', nombre: 'Biblioteca', activado: false },
      { id: 'marketing', nombre: 'Marketing', activado: false }
    ];
    setModulos(modulosList);
  };

  const saveTheme = async (theme) => {
    await window.electron.config.set('theme', theme);
    setSettings({ ...settings, theme });
    // Aplicar tema al DOM
    document.documentElement.setAttribute('data-theme', theme);
    setMessage({ text: 'Tema guardado', type: 'success' });
    setTimeout(() => setMessage({ text: '', type: '' }), 2000);
  };

  const saveLanguage = async (language) => {
    await window.electron.config.set('language', language);
    setSettings({ ...settings, language });
    setMessage({ text: 'Idioma guardado', type: 'success' });
    setTimeout(() => setMessage({ text: '', type: '' }), 2000);
  };

  const saveFondo = async (modulo, tipo, valor) => {
    if (tipo === 'color') {
      await window.electron.database.run(
        `UPDATE fondos_por_modulo SET tipo = 'color', valor = ?, imagen_url = NULL WHERE modulo = ?`,
        [valor, modulo]
      );
    } else {
      await window.electron.database.run(
        `UPDATE fondos_por_modulo SET tipo = 'imagen', imagen_url = ?, valor = '#1a1a2e' WHERE modulo = ?`,
        [valor, modulo]
      );
    }
    setFondos({ ...fondos, [modulo]: { tipo, valor } });
    setMessage({ text: `Fondo guardado para ${modulo}`, type: 'success' });
    setTimeout(() => setMessage({ text: '', type: '' }), 2000);
  };

  const changePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      setMessage({ text: 'Las contraseñas no coinciden', type: 'error' });
      return;
    }
    if (passwordData.new.length < 6) {
      setMessage({ text: 'La contraseña debe tener al menos 6 caracteres', type: 'error' });
      return;
    }
    // Guardar contraseña (en producción, usar hash)
    await window.electron.config.set('password', passwordData.new);
    setMessage({ text: 'Contraseña actualizada', type: 'success' });
    setPasswordData({ current: '', new: '', confirm: '' });
    setTimeout(() => setMessage({ text: '', type: '' }), 2000);
  };

  const toggleModulo = async (moduloId, currentState) => {
    const newState = !currentState;
    setModulos(modulos.map(m => m.id === moduloId ? { ...m, activado: newState } : m));
    await window.electron.config.set(`modulo_${moduloId}_activo`, newState);
    setMessage({ text: `${moduloId} ${newState ? 'activado' : 'desactivado'}`, type: 'success' });
    setTimeout(() => setMessage({ text: '', type: '' }), 2000);
  };

  return (
    <div className="settings-container">
      <h1>Configuración</h1>
      
      {message.text && (
        <div className={`settings-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-tabs">
        <button className={activeTab === 'apariencia' ? 'active' : ''} onClick={() => setActiveTab('apariencia')}>
          🎨 Apariencia
        </button>
        <button className={activeTab === 'idioma' ? 'active' : ''} onClick={() => setActiveTab('idioma')}>
          🌐 Idioma
        </button>
        <button className={activeTab === 'fondos' ? 'active' : ''} onClick={() => setActiveTab('fondos')}>
          🖼️ Fondos
        </button>
        <button className={activeTab === 'seguridad' ? 'active' : ''} onClick={() => setActiveTab('seguridad')}>
          🔒 Seguridad
        </button>
        <button className={activeTab === 'modulos' ? 'active' : ''} onClick={() => setActiveTab('modulos')}>
          📦 Módulos
        </button>
      </div>

      <div className="settings-content">
        {/* Apariencia */}
        {activeTab === 'apariencia' && (
          <div className="settings-section">
            <h2>Tema</h2>
            <div className="theme-options">
              <button className={settings.theme === 'light' ? 'selected' : ''} onClick={() => saveTheme('light')}>
                ☀️ Claro
              </button>
              <button className={settings.theme === 'dark' ? 'selected' : ''} onClick={() => saveTheme('dark')}>
                🌙 Oscuro
              </button>
              <button className={settings.theme === 'system' ? 'selected' : ''} onClick={() => saveTheme('system')}>
                💻 Sistema
              </button>
            </div>
          </div>
        )}

        {/* Idioma */}
        {activeTab === 'idioma' && (
          <div className="settings-section">
            <h2>Idioma / Language</h2>
            <div className="language-options">
              <button className={settings.language === 'es' ? 'selected' : ''} onClick={() => saveLanguage('es')}>
                🇪🇸 Español
              </button>
              <button className={settings.language === 'en' ? 'selected' : ''} onClick={() => saveLanguage('en')}>
                🇬🇧 English
              </button>
            </div>
          </div>
        )}

        {/* Fondos por módulo */}
        {activeTab === 'fondos' && (
          <div className="settings-section">
            <h2>Fondo por módulo</h2>
            {Object.entries(fondos).map(([modulo, fondo]) => (
              <div key={modulo} className="fondo-modulo">
                <label>{modulo.toUpperCase()}</label>
                <div className="fondo-options">
                  <input
                    type="color"
                    value={fondo.valor}
                    onChange={(e) => saveFondo(modulo, 'color', e.target.value)}
                  />
                  <button onClick={() => document.getElementById(`file-${modulo}`).click()}>
                    📷 Subir imagen
                  </button>
                  <input
                    id={`file-${modulo}`}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => saveFondo(modulo, 'imagen', event.target.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Seguridad */}
        {activeTab === 'seguridad' && (
          <div className="settings-section">
            <h2>Cambiar contraseña</h2>
            <div className="password-form">
              <input
                type="password"
                placeholder="Contraseña actual"
                value={passwordData.current}
                onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
              />
              <input
                type="password"
                placeholder="Nueva contraseña"
                value={passwordData.new}
                onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
              />
              <input
                type="password"
                placeholder="Confirmar nueva contraseña"
                value={passwordData.confirm}
                onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
              />
              <button onClick={changePassword}>Actualizar contraseña</button>
            </div>
          </div>
        )}

        {/* Módulos */}
        {activeTab === 'modulos' && (
          <div className="settings-section">
            <h2>Módulos activos</h2>
            <div className="modulos-grid">
              {modulos.map(modulo => (
                <div key={modulo.id} className="modulo-item">
                  <span>{modulo.nombre}</span>
                  <button
                    className={modulo.activado ? 'active' : 'inactive'}
                    onClick={() => toggleModulo(modulo.id, modulo.activado)}
                  >
                    {modulo.activado ? 'Activado' : 'Desactivado'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsMain;
