import React from 'react';
import { trabajosPendientes } from '../../mock/trabajosData';

const ColaTrabajos = ({ trabajos, onSeleccionarTrabajo, onEliminar }) => {
  const trabajosOrdenados = [...trabajos].sort((a, b) => {
    const prioridadOrden = { 'Alta': 1, 'Media': 2, 'Baja': 3 };
    return prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad] || 
           new Date(a.fechaEntrada) - new Date(b.fechaEntrada);
  });

  return (
    <div className="bg-gray-800 rounded-lg p-6 h-full">
      <h2 className="text-xl font-bold text-white mb-6">Cola de Trabajos</h2>
      
      <div className="space-y-4">
        {trabajosOrdenados.map((trabajo, idx) => (
          <div 
            key={trabajo.id}
            onClick={() => onSeleccionarTrabajo(trabajo)}
            className={`p-4 rounded-lg cursor-pointer transition-colors ${
              trabajo.estado === 'En progreso' ? 'bg-blue-900/30 border border-blue-700' :
              'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <div className="flex justify-between items-start">
              <h3 className="font-medium text-white">{trabajo.trabajo}</h3>
              <span className={`px-2 py-1 rounded-full text-xs ${
                trabajo.prioridad === 'Alta' ? 'bg-rose-900/50 text-rose-300' :
                trabajo.prioridad === 'Media' ? 'bg-amber-900/50 text-amber-300' :
                'bg-gray-600 text-gray-300'
              }`}>
                {trabajo.prioridad}
              </span>
              <button className="text-red-400 hover:text-red-300 ml-3" onClick={e => { e.stopPropagation(); onEliminar && onEliminar(idx); }}>Eliminar</button>
            </div>
            <p className="text-sm text-gray-400 mt-1">{trabajo.cliente}</p>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-500">{trabajo.fechaEntrada}</span>
              <span className="text-xs font-semibold text-white">${trabajo.precio.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColaTrabajos;