import React from 'react';
import { historialTrabajos } from '../../mock/trabajosData';

const ResumenFinanciero = () => {
  const trabajosConcluidos = historialTrabajos.filter(t => t.estado === 'Concluido');
  const totalGanancias = trabajosConcluidos.reduce((sum, t) => sum + t.ganancia, 0);
  const trabajosEsteMes = trabajosConcluidos.filter(t => {
    const fecha = new Date(t.fechaFin);
    const hoy = new Date();
    return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
  });

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-6">Resumen Financiero</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Total Histórico</h3>
          <p className="text-2xl font-bold text-emerald-400">${totalGanancias.toFixed(2)}</p>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Trabajos Este Mes</h3>
          <p className="text-2xl font-bold text-white">{trabajosEsteMes.length}</p>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Ganancias Mensuales</h3>
          <p className="text-2xl font-bold text-emerald-400">${
            trabajosEsteMes.reduce((sum, t) => sum + t.ganancia, 0).toFixed(2)
          }</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-2">Últimos Trabajos</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Trabajo</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Ganancia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {trabajosConcluidos.slice(0, 5).map((trabajo) => (
                <tr key={trabajo.id}>
                  <td className="px-4 py-2 text-white">{trabajo.cliente}</td>
                  <td className="px-4 py-2 text-white">{trabajo.trabajo}</td>
                  <td className="px-4 py-2 text-white">{trabajo.fechaFin}</td>
                  <td className="px-4 py-2 text-emerald-400">${trabajo.ganancia.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResumenFinanciero;