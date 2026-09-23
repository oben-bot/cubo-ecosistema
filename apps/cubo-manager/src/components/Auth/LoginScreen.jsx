import React, { useState } from 'react';
import './LoginScreen.css';

const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const tieneContrasena = await window.electron.auth.tieneContrasena();
      if (!tieneContrasena) {
        setError('No hay cuenta configurada. La app se reiniciará para configuración');
        setTimeout(() => window.location.reload(), 2000);
        return;
      }

      const resultado = await window.electron.auth.verificarCredenciales(email, password);
      if (resultado.ok) {
        localStorage.setItem('isLoggedIn', 'true');
        onLogin();
      } else if (resultado.motivo === 'correo_incorrecto') {
        setError('Correo electrónico incorrecto');
      } else {
        setError('Contraseña incorrecta');
      }
    } catch (err) {
      console.error('Error en login:', err);
      setError('Error al verificar. Reinicia la app');
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">🏪 Mi Taller</div>
          <div className="subtitle">Sistema de gestión</div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Correo electrónico</label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div className="input-group">
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? 'Verificando...' : 'INICIAR SESIÓN'}
          </button>
        </form>

        <div className="login-footer">
          <p className="recovery-disabled-note">
            ¿Olvidaste tu contraseña? Por ahora, contacta al administrador del taller.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
