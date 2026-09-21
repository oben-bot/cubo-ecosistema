import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './WelcomeScreen.css';

const PASSWORD = "admin123";
const MAX_ATTEMPTS = 5;

const WelcomeScreen = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [mailSent, setMailSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (locked) return;
    if (password === PASSWORD) {
      localStorage.setItem("isAuth", "true");
      navigate('/dashboard');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        setLocked(true);
        setError("Demasiados intentos fallidos. Acceso bloqueado localmente.");
        setMailSent(false);
      } else {
        setError(`Contraseña incorrecta. Intentos restantes: ${MAX_ATTEMPTS - newAttempts}`);
      }
    }
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1 className="welcome-title">¡Hola jefe!</h1>
        <p className="welcome-subtitle">Sharpy al mando</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            disabled={locked}
          />
          <button className="start-button" type="submit" disabled={locked}>
            Entrar al panel
          </button>
        </form>
        {error && <div className="login-error">{error}</div>}
        {locked && (
          <div className="login-locked">
            {mailSent
              ? "Se ha enviado una alerta a tu correo. Espera autorización."
              : "Por seguridad, contacta al administrador para restablecer el acceso."}
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeScreen;