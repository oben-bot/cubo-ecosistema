import React from 'react';

const HistorialCotizaciones = ({ cotizaciones, onEliminar }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-violet-400 uppercase tracking-wider">Cliente</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-violet-400 uppercase tracking-wider">Fecha</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-violet-400 uppercase tracking-wider">Trabajo</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-violet-400 uppercase tracking-wider">Precio</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-violet-400 uppercase tracking-wider">Estado</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-violet-400 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-gray-800 divide-y divide-gray-700">
          {cotizaciones.map((cotizacion, idx) => (
            <tr key={cotizacion.id}>
              <td className="px-6 py-4 whitespace-nowrap text-gray-300">{cotizacion.cliente}</td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-300">{cotizacion.fecha}</td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-300">{cotizacion.trabajo}</td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-300">${cotizacion.precio.toFixed(2)}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                {cotizacion.estado === 'Autorizado' ? (
                  <span className="px-2 py-1 text-xs font-semibold text-green-100 bg-green-900/50 rounded-full">Autorizado</span>
                ) : (
                  <span className="px-2 py-1 text-xs font-semibold text-blue-100 bg-blue-900/50 rounded-full">Guardado</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button className="text-violet-400 hover:text-violet-300 mr-3">Ver</button>
                <button className="text-amber-400 hover:text-amber-300 mr-3">Reutilizar</button>
                <button className="text-red-400 hover:text-red-300" onClick={() => onEliminar(idx)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HistorialCotizaciones;