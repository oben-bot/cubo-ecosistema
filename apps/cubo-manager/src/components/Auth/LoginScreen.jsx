import React, { useState } from 'react';
import './LoginScreen.css';

const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const savedEmail = await window.electron.config.get('user_email');
      const savedPassword = await window.electron.config.get('password');
      
      if (!savedPassword) {
        setError('No hay cuenta configurada. La app se reiniciará para configuración');
        setTimeout(() => window.location.reload(), 2000);
        return;
      }

      if (email === savedEmail && password === savedPassword) {
        localStorage.setItem('isLoggedIn', 'true');
        onLogin();
      } else if (email !== savedEmail) {
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

  const handleRecovery = async () => {
    if (!recoveryEmail) {
      setRecoveryMessage('Ingresa tu correo electrónico');
      return;
    }
    
    setLoading(true);
    // Aquí iría la lógica de envío de correo (SMTP o servicio externo)
    // Por ahora, simulamos
    setRecoveryMessage(`Se ha enviado un enlace de recuperación a ${recoveryEmail}`);
    setTimeout(() => {
      setShowRecovery(false);
      setRecoveryMessage('');
      setRecoveryEmail('');
    }, 3000);
    setLoading(false);
  };

  if (showRecovery) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="logo">🔐 Recuperar contraseña</div>
          </div>
          <div className="input-group">
            <label>Correo electrónico</label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
            />
          </div>
          {recoveryMessage && <div className="success-message">{recoveryMessage}</div>}
          <button onClick={handleRecovery} disabled={loading} className="login-btn">
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
          <button onClick={() => setShowRecovery(false)} className="back-btn">
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

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
          <button onClick={() => setShowRecovery(true)} className="link-btn">
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
