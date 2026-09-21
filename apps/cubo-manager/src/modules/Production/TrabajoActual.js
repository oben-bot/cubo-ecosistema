import React, { useState } from 'react';
import { trabajosPendientes } from '../../mock/trabajosData';

const TrabajoActual = ({ trabajo, onCambiarEstado }) => {
  const [notas, setNotas] = useState('');

  if (!trabajo) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 h-full flex items-center justify-center">
        <p className="text-gray-400 text-lg">No hay trabajo seleccionado</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 h-full">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold text-white">{trabajo.trabajo}</h2>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          trabajo.estado === 'En progreso' ? 'bg-blue-900/50 text-blue-300' :
          trabajo.estado === 'Pendiente' ? 'bg-amber-900/50 text-amber-300' :
          'bg-gray-700 text-gray-300'
        }`}>
          {trabajo.estado}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-1">Cliente</h3>
          <p className="text-white">{trabajo.cliente}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-1">Técnico</h3>
          <p className="text-white">{trabajo.tecnico || 'Sin asignar'}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-1">Fecha Entrada</h3>
          <p className="text-white">{trabajo.fechaEntrada}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-1">Fecha Estimada</h3>
          <p className="text-white">{trabajo.fechaEstimada}</p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-1">Descripción</h3>
        <p className="text-white">{trabajo.descripcion}</p>
      </div>

      {trabajo.materiales.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Materiales</h3>
          <ul className="space-y-2">
            {trabajo.materiales.map((material) => (
              <li key={material.id} className="flex justify-between">
                <span className="text-white">{material.nombre}</span>
                <span className="text-white">x{material.cantidad}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-1">Notas</h3>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows="3"
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          placeholder="Agregar notas sobre el trabajo..."
        />
      </div>

      <div className="flex space-x-4">
        <button
          onClick={() => onCambiarEstado(trabajo.id, 'Concluido', notas)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors flex-1"
        >
          Marcar como Concluido
        </button>
        <button
          onClick={() => onCambiarEstado(trabajo.id, 'Pausado', notas)}
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg transition-colors flex-1"
        >
          Pausar Trabajo
        </button>
        <button
          onClick={() => onCambiarEstado(trabajo.id, 'Cancelado', notas)}
          className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg transition-colors flex-1"
        >
          Cancelar Trabajo
        </button>
      </div>
    </div>
  );
};

export default TrabajoActual;