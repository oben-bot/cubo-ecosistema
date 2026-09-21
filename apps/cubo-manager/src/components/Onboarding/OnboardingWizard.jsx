import React, { useState } from 'react';
import './OnboardingWizard.css';

const OnboardingWizard = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    password: '',
    confirmPassword: '',
    theme: 'dark',
    language: 'es'
  });

  const totalSteps = 4;

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleNext = async () => {
    setError('');
    
    // Paso 1: Nombre del negocio
    if (step === 1 && !formData.businessName.trim()) {
      setError('Ingresa el nombre de tu negocio');
      return;
    }
    
    // Paso 2: Correo electrónico
    if (step === 2) {
      if (!formData.email.trim()) {
        setError('Ingresa tu correo electrónico');
        return;
      }
      if (!validateEmail(formData.email)) {
        setError('Ingresa un correo electrónico válido');
        return;
      }
    }
    
    // Paso 3: Contraseña
    if (step === 3) {
      if (!formData.password) {
        setError('Ingresa una contraseña');
        return;
      }
      if (formData.password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }
    }
    
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Guardar configuración final
      setLoading(true);
      await window.electron.config.set('business_name', formData.businessName);
      await window.electron.config.set('user_email', formData.email);
      await window.electron.config.set('password', formData.password);
      await window.electron.config.set('theme', formData.theme);
      await window.electron.config.set('language', formData.language);
      await window.electron.config.set('onboarding_completed', true);
      
      setLoading(false);
      onComplete();
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-wizard">
        <div className="onboarding-progress">
          <div className="progress-bar" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
          <span>Configuración inicial - Paso {step} de {totalSteps}</span>
        </div>

        {/* Paso 1: Nombre del negocio */}
        {step === 1 && (
          <div className="onboarding-step">
            <div className="step-icon">🏪</div>
            <h2>¿Cómo se llama tu negocio?</h2>
            <p>Este nombre aparecerá en la app y en los documentos</p>
            <div className="form-group">
              <input 
                type="text" 
                placeholder="Ej: Taller Laser Express" 
                value={formData.businessName}
                onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Paso 2: Correo electrónico */}
        {step === 2 && (
          <div className="onboarding-step">
            <div className="step-icon">📧</div>
            <h2>Tu correo electrónico</h2>
            <p>Lo usarás para recuperar tu contraseña</p>
            <div className="form-group">
              <input 
                type="email" 
                placeholder="tu@email.com" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>
        )}

        {/* Paso 3: Contraseña */}
        {step === 3 && (
          <div className="onboarding-step">
            <div className="step-icon">🔒</div>
            <h2>Crea una contraseña segura</h2>
            <p>Mínimo 6 caracteres</p>
            <div className="form-group">
              <input 
                type="password" 
                placeholder="Contraseña" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
              <input 
                type="password" 
                placeholder="Confirmar contraseña" 
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                style={{ marginTop: '10px' }}
              />
            </div>
          </div>
        )}

        {/* Paso 4: Personalización */}
        {step === 4 && (
          <div className="onboarding-step">
            <div className="step-icon">🎨</div>
            <h2>Personaliza tu experiencia</h2>
            <div className="form-group">
              <label>Tema</label>
              <div className="theme-options">
                <button 
                  className={formData.theme === 'dark' ? 'selected' : ''}
                  onClick={() => setFormData({...formData, theme: 'dark'})}
                >🌙 Oscuro</button>
                <button 
                  className={formData.theme === 'light' ? 'selected' : ''}
                  onClick={() => setFormData({...formData, theme: 'light'})}
                >☀️ Claro</button>
              </div>
            </div>
            <div className="form-group">
              <label>Idioma</label>
              <div className="theme-options">
                <button 
                  className={formData.language === 'es' ? 'selected' : ''}
                  onClick={() => setFormData({...formData, language: 'es'})}
                >🇪🇸 Español</button>
                <button 
                  className={formData.language === 'en' ? 'selected' : ''}
                  onClick={() => setFormData({...formData, language: 'en'})}
                >🇬🇧 English</button>
              </div>
            </div>
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}

        <div className="onboarding-buttons">
          {step > 1 && <button onClick={handlePrev} className="btn-secondary">Anterior</button>}
          <button onClick={handleNext} className="btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : (step === totalSteps ? 'Comenzar' : 'Siguiente')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
