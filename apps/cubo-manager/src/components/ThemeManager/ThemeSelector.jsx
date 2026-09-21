import React, { useState } from 'react';
import { useTheme } from './ThemeProvider';
import './ThemeSelector.css';

const ThemeSelector = ({ moduleContext = null }) => {
  const { themes, currentTheme, switchTheme, moduleThemes, setModuleTheme, getTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeChange = (themeName) => {
    if (moduleContext) {
      setModuleTheme(moduleContext, themeName);
    } else {
      switchTheme(themeName);
    }
    setIsOpen(false);
  };

  const activeTheme = moduleContext ? (moduleThemes[moduleContext] || currentTheme) : currentTheme;
  const themeColor = getTheme(moduleContext || null);

  return (
    <div className="theme-selector">
      <button
        className="theme-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: themeColor.primary,
          color: themeColor.background,
        }}
      >
        🎨 Tema: {themes[activeTheme].name}
      </button>

      {isOpen && (
        <div className="theme-selector-menu" style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: `1px solid ${themeColor.primary}`,
        }}>
          {Object.entries(themes).map(([key, theme]) => (
            <button
              key={key}
              className={`theme-option ${key === activeTheme ? 'active' : ''}`}
              onClick={() => handleThemeChange(key)}
              style={{
                background: key === activeTheme ? `${theme.primary}40` : 'transparent',
                borderLeft: key === activeTheme ? `4px solid ${theme.primary}` : 'none',
                color: theme.primary,
              }}
            >
              <span className="theme-color" style={{ background: theme.primary }}></span>
              {theme.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;
