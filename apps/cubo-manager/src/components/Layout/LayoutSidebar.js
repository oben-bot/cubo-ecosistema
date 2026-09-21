import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const LayoutSidebar = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const sections = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊', path: '/dashboard' },
    { id: 'warehouse', name: 'Almacén', icon: '📦', path: '/warehouse' },
    { id: 'production', name: 'Producción', icon: '🔧', path: '/production' },
    { id: 'cotizaciones', name: 'Cotizaciones', icon: '📝', path: '/quotations' },
    { id: 'customers', name: 'Clientes', icon: '👥', path: '/customers' },
    { id: 'finance', name: 'Finanzas', icon: '💰', path: '/finance' },
    { id: 'sales', name: 'Ventas', icon: '🛒', path: '/sales' },
    { id: 'library', name: 'Biblioteca', icon: '📚', path: '/library' },
    { id: 'settings', name: 'Configuración', icon: '⚙️', path: '/settings' },
  ];

  return (
    <div className="sidebar-container">
      <div className="sidebar-header">
        <h2>Mi Taller</h2>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {sections.map((section) => (
            <li key={section.id}>
              <button
                onClick={() => navigate(section.path)}
                className={`nav-button ${location.pathname === section.path ? 'active' : ''}`}
              >
                <span className="icon">{section.icon}</span>
                <span className="name">{section.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <button onClick={onLogout} className="logout-button">
          🚪 Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

export default LayoutSidebar;
