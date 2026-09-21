import React from 'react';

const AlmacenHeader = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex border-b border-gray-700 mb-6">
      <button
        onClick={() => setActiveTab('stock')}
        className={`px-4 py-2 font-medium ${activeTab === 'stock' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400 hover:text-amber-300'}`}
      >
        Stock de Material
      </button>
      <button
        onClick={() => setActiveTab('precios')}
        className={`px-4 py-2 font-medium ${activeTab === 'precios' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400 hover:text-amber-300'}`}
      >
        Gestión de Precios
      </button>
    </div>
  );
};

export default AlmacenHeader;