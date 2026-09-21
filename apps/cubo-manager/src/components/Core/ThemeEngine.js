import React, { useState, useEffect } from 'react';

export const themes = {
  default: {
    name: 'default',
    colors: {
      primary: '#3A5A40',
      secondary: '#588157',
      accent: '#DAD7CD',
      background: '#F8F9FA',
      text: '#212529'
    }
  },
  moderno: {
    name: 'moderno',
    colors: {
      primary: '#2B2D42',
      secondary: '#8D99AE',
      accent: '#EDF2F4',
      background: '#FFFFFF',
      text: '#2B2D42'
    }
  },
  madera: {
    name: 'madera',
    colors: {
      primary: '#5E3023',
      secondary: '#895737',
      accent: '#D8B08C',
      background: '#F3E9DC',
      text: '#3A2D17'
    }
  }
};

const ThemeEngine = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('appTheme') || 'default';
    return themes[savedTheme] || themes.default;
  });

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
    localStorage.setItem('appTheme', theme.name);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const ThemeContext = React.createContext();
export default ThemeEngine;

// DONE