import React, { useContext } from 'react';
import { ThemeContext } from '../Core/ThemeEngine';

const ThemeSelector = () => {
  const { theme, setTheme, themes } = useContext(ThemeContext);

  if (!theme || !themes || typeof themes !== 'object') {
    return <div>Error cargando temas</div>;
  }

  return (
    <div className="theme-selector">
      <h3>Selecciona un tema</h3>
      <div className="theme-options">
        {Object.entries(themes).map(([key, themeData]) => (
          <div
            key={key}
            className={`theme-option ${theme.name === themeData.name ? 'active' : ''}`}
            onClick={() => setTheme(themeData)}
            style={{
              backgroundColor: themeData.colors.background,
              border: `2px solid ${themeData.colors.primary}`
            }}
          >
            <div 
              className="theme-preview"
              style={{ backgroundColor: themeData.colors.primary }}
            >
              <span style={{ color: themeData.colors.accent }}>T</span>
            </div>
            <span style={{ color: themeData.colors.text }}>
              {themeData.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThemeSelector;