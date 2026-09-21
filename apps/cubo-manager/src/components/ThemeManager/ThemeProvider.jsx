import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

const THEMES = {
  dark: {
    name: 'Dark (Predeterminado)',
    primary: '#22d3ee',
    secondary: '#06b6d4',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#e2e8f0',
    accent: '#39ff14',
  },
  midnight: {
    name: 'Medianoche',
    primary: '#8b5cf6',
    secondary: '#a855f7',
    background: '#0a0a1f',
    surface: '#1a1a3f',
    text: '#e2e8f0',
    accent: '#c084fc',
  },
  ocean: {
    name: 'Océano',
    primary: '#0ea5e9',
    secondary: '#0284c7',
    background: '#0c1929',
    surface: '#1e3a8a',
    text: '#e0f2fe',
    accent: '#38bdf8',
  },
  forest: {
    name: 'Bosque',
    primary: '#10b981',
    secondary: '#059669',
    background: '#0f1517',
    surface: '#1f3a2a',
    text: '#d1fae5',
    accent: '#6ee7b7',
  },
  sunset: {
    name: 'Atardecer',
    primary: '#f97316',
    secondary: '#ea580c',
    background: '#1a1310',
    surface: '#3a2817',
    text: '#fde68a',
    accent: '#fdba74',
  },
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [moduleThemes, setModuleThemes] = useState({});
  const [coverImages, setCoverImages] = useState({});

  // Cargar temas del localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cubo_theme');
    const savedModules = localStorage.getItem('cubo_module_themes');
    const savedCovers = localStorage.getItem('cubo_cover_images');

    if (saved) setCurrentTheme(saved);
    if (savedModules) setModuleThemes(JSON.parse(savedModules));
    if (savedCovers) setCoverImages(JSON.parse(savedCovers));
  }, []);

  // Guardar tema actual
  const switchTheme = (themeName) => {
    if (THEMES[themeName]) {
      setCurrentTheme(themeName);
      localStorage.setItem('cubo_theme', themeName);
      applyThemeStyles(THEMES[themeName]);
    }
  };

  // Cambiar tema por módulo
  const setModuleTheme = (moduleName, themeName) => {
    setModuleThemes({
      ...moduleThemes,
      [moduleName]: themeName,
    });
    localStorage.setItem('cubo_module_themes', JSON.stringify({
      ...moduleThemes,
      [moduleName]: themeName,
    }));
  };

  // Subir portada por módulo
  const uploadCoverImage = (moduleName, imageData) => {
    setCoverImages({
      ...coverImages,
      [moduleName]: imageData,
    });
    localStorage.setItem('cubo_cover_images', JSON.stringify({
      ...coverImages,
      [moduleName]: imageData,
    }));
  };

  // Aplicar estilos CSS del tema
  // IMPORTANTE: estos son los nombres de variable que usan de verdad
  // los módulos (Dashboard, Warehouse, Settings, etc.). Antes esta función
  // escribía --theme-*, que no coincidía con nada y dejaba todo sin estilo.
  const applyThemeStyles = (theme) => {
    const root = document.documentElement;
    root.style.setProperty('--bg-dark', theme.background);
    root.style.setProperty('--card-bg', theme.surface);
    root.style.setProperty('--border-color', 'rgba(148, 163, 184, 0.15)');
    root.style.setProperty('--button-bg', theme.surface);
    root.style.setProperty('--primary-color', theme.primary);
    root.style.setProperty('--main-color', theme.primary);
    root.style.setProperty('--hover-bg', `${theme.primary}1f`); // ~12% opacidad
    root.style.setProperty('--header-bg', theme.background);
    root.style.setProperty('--input-bg', theme.background);
    root.style.setProperty('--text-color', theme.text);
    root.style.setProperty('--text-muted', theme.text + '99'); // ~60% opacidad

    // Se mantienen también por compatibilidad, por si algún componente
    // futuro los usa directamente.
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-secondary', theme.secondary);
    root.style.setProperty('--theme-background', theme.background);
    root.style.setProperty('--theme-surface', theme.surface);
    root.style.setProperty('--theme-text', theme.text);
    root.style.setProperty('--theme-accent', theme.accent);
  };

  // Obtener tema actual (global o por módulo)
  const getTheme = (moduleName = null) => {
    if (moduleName && moduleThemes[moduleName]) {
      return THEMES[moduleThemes[moduleName]];
    }
    return THEMES[currentTheme];
  };

  // Obtener portada de módulo
  const getModuleCover = (moduleName) => {
    return coverImages[moduleName] || null;
  };

  // Aplicar tema inicial
  useEffect(() => {
    applyThemeStyles(THEMES[currentTheme]);
  }, [currentTheme]);

  const value = {
    themes: THEMES,
    currentTheme,
    switchTheme,
    getTheme,
    moduleThemes,
    setModuleTheme,
    uploadCoverImage,
    getModuleCover,
    coverImages,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return context;
};
