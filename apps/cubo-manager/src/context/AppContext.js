import React, { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [appStructure, setAppStructure] = useState([
    { name: 'Taller Madera', icon: 'wood', enabled: true },
    { name: 'Herramientas', icon: 'tools', enabled: true },
    { name: 'Diseño Laser', icon: 'laser', enabled: true },
    { name: 'Ventas', icon: 'sales', enabled: true },
    { name: 'Finanzas', icon: 'finance', enabled: true }
  ]);

  const [businessMetrics, setBusinessMetrics] = useState({
    monthlyRevenue: 0,
    activeProjects: 0,
    // +10 métricas
  });

  return (
    <AppContext.Provider value={{ 
      appStructure, 
      setAppStructure,
      businessMetrics,
      setBusinessMetrics
    }}>
      {children}
    </AppContext.Provider>
  );
};