import React from 'react';

const CustomDashboard = () => {
  return (
    <div>
      <header>
        El Cubo de Madera
      </header>

      <div className="section">
        <h2>Configuración</h2>
        <button className="button yellow">Tema Predeterminado</button>
        <button className="button green">Moderno</button>
        <button className="button red">Madera</button>
      </div>

      <div className="section">
        <h2>Taller Madera</h2>
        <button className="button green">Herramientas</button>
        <button className="button yellow">Diseño Láser</button>
      </div>

      <div className="section">
        <h2>Negocio</h2>
        <button className="button red">Ventas</button>
        <button className="button yellow">Finanzas</button>
      </div>
    </div>
  );
};

export default CustomDashboard;