import './WarehouseMain.css';
import React, { useState } from 'react';
import StockMaterial from './StockMaterial';
import GestionPrecios from './GestionPrecios';
import systemMonitor from '../../components/Core/SystemMonitor';
import { deleteWithTrash } from '../../utils/deleteWithTrash';

const WarehouseMain = ({ onBackToDashboard }) => {
  const [activeTab, setActiveTab] = useState(null);

  React.useEffect(() => {
    systemMonitor.recordMetric('renders', Date.now());
    systemMonitor.log('almacen_render', {});
  }, []);

  return (
    <div className="almacen-main-container">
      <h1 className="almacen-title">Gestión de Almacén</h1>
      {!activeTab && (
        <div className="almacen-menu-botones">
          <button className="flecha-css-btn" onClick={() => setActiveTab('stock')}>
            Stock de Material
          </button>
          <button className="flecha-css-btn" onClick={() => setActiveTab('precios')}>
            Gestión de Precios
          </button>
          {/* Agrega más botones aquí si tienes más submódulos */}
        </div>
      )}
      {activeTab === 'stock' && <StockMaterial onEliminar={item => deleteWithTrash({ id: `stock-${item.id}`, name: item.nombre, type: 'stock' })} />}
      {activeTab === 'precios' && <GestionPrecios onEliminar={item => deleteWithTrash({ id: `precio-${item.id}`, name: item.nombre, type: 'precio' })} />}
      {activeTab && (
        <button className="volver-btn" onClick={() => setActiveTab(null)}>
          ← Volver al menú de Almacén
        </button>
      )}
      <button className="volver-dashboard-btn" onClick={onBackToDashboard}>
        ← Volver al menú principal
      </button>
    </div>
  );
};

export default WarehouseMain;