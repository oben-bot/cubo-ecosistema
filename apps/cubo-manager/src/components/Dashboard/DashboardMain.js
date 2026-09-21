import React from 'react';
import systemMonitor from '../Core/SystemMonitor';
import DashboardMonitor from '../Core/DashboardMonitor';

const DashboardMain = (props) => {
  React.useEffect(() => {
    systemMonitor.recordMetric('renders', Date.now());
    systemMonitor.log('dashboard_render', {});
  }, []);

  return (
    <div className="bg-gray-800 shadow-xl rounded-lg p-6 flex-1">
      <h1 className="text-2xl font-bold text-white mb-6">Panel de Control</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 hover:border-emerald-400 transition-colors">
          <h3 className="font-semibold text-emerald-400">Órdenes Activas</h3>
          <p className="text-3xl font-bold text-white mt-2">12</p>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 hover:border-amber-400 transition-colors">
          <h3 className="font-semibold text-amber-400">Ingresos Mensuales</h3>
          <p className="text-3xl font-bold text-white mt-2">$24,500</p>
        </div>
        <div className="bg-gray-700 p-4 rounded-lg border border-gray-600 hover:border-blue-400 transition-colors">
          <h3 className="font-semibold text-blue-400">Clientes Nuevos</h3>
          <p className="text-3xl font-bold text-white mt-2">8</p>
        </div>
      </div>
      <DashboardMonitor />
    </div>
  );
};

export default DashboardMain;