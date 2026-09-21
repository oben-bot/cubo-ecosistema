import React from 'react';

const CotizacionesHeader = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex border-b border-gray-700 mb-6">
      <button
        onClick={() => setActiveTab('formulario')}
        className={`px-4 py-2 font-medium ${activeTab === 'formulario' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-gray-400 hover:text-violet-300'}`}
      >
        Nuevo Presupuesto
      </button>
      <button
        onClick={() => setActiveTab('historial')}
        className={`px-4 py-2 font-medium ${activeTab === 'historial' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-gray-400 hover:text-violet-300'}`}
      >
        Historial
      </button>
    </div>
  );
};

export default CotizacionesHeader;