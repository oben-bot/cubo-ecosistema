import React, { useState, useEffect } from 'react';
import { materiales } from '../../mock/almacenData';

const StockMaterial = ({ onEliminar }) => {
  const [materialesState, setMaterialesState] = useState(materiales);
  const [alerta, setAlerta] = useState(null);

  useEffect(() => {
    const materialesBajos = materialesState.filter(m => m.cantidad <= m.minimo);
    if (materialesBajos.length > 0) {
      setAlerta(`¡Atención! ${materialesBajos.length} materiales están por debajo del mínimo`);
    } else {
      setAlerta(null);
    }
  }, [materialesState]);

  const handleCantidadChange = (id, nuevaCantidad) => {
    setMaterialesState(prev => prev.map(m => 
      m.id === id ? { ...m, cantidad: Number(nuevaCantidad) } : m
    ));
  };

  return (
    <div>
      {alerta && (
        <div className="bg-rose-900/50 border border-rose-700 text-rose-300 px-4 py-3 rounded-lg mb-6 flex items-center">
          <span className="mr-2">⚠️</span>
          {alerta}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Material</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Cantidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Mínimo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Proveedor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {materialesState.map((material) => (
              <tr key={material.id} className={material.cantidad <= material.minimo ? 'bg-rose-900/20' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">{material.nombre}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="number"
                    value={material.cantidad}
                    onChange={(e) => handleCantidadChange(material.id, e.target.value)}
                    className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">{material.minimo}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">{material.proveedor}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {material.cantidad <= material.minimo ? (
                    <span className="px-2 py-1 text-xs font-semibold text-rose-100 bg-rose-900/50 rounded-full">Bajo Stock</span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-semibold text-emerald-100 bg-emerald-900/50 rounded-full">Disponible</span>
                  )}
                </td>
                <td>
                  <button className="btn-eliminar" onClick={() => onEliminar && onEliminar(material)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockMaterial;