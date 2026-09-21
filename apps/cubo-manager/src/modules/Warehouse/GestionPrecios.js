import React, { useState } from 'react';
import { materiales } from '../../mock/almacenData';

const GestionPrecios = () => {
  const [materialesState, setMaterialesState] = useState(materiales);
  const [nuevoMaterial, setNuevoMaterial] = useState({
    nombre: '',
    precio: '',
    proveedor: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNuevoMaterial(prev => ({ ...prev, [name]: value }));
  };

  const agregarMaterial = () => {
    if (nuevoMaterial.nombre && nuevoMaterial.precio) {
      const nuevoId = Math.max(...materialesState.map(m => m.id)) + 1;
      setMaterialesState(prev => [
        ...prev,
        {
          id: nuevoId,
          nombre: nuevoMaterial.nombre,
          cantidad: 0,
          minimo: 10,
          precio: Number(nuevoMaterial.precio),
          proveedor: nuevoMaterial.proveedor || 'Sin proveedor'
        }
      ]);
      setNuevoMaterial({ nombre: '', precio: '', proveedor: '' });
    }
  };

  const actualizarPrecio = (id, nuevoPrecio) => {
    setMaterialesState(prev => prev.map(m => 
      m.id === id ? { ...m, precio: Number(nuevoPrecio) } : m
    ));
  };

  return (
    <div>
      <div className="bg-gray-700 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-amber-400 mb-3">Agregar Nuevo Material</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
            <input
              type="text"
              name="nombre"
              value={nuevoMaterial.nombre}
              onChange={handleInputChange}
              className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Precio Unitario</label>
            <input
              type="number"
              name="precio"
              value={nuevoMaterial.precio}
              onChange={handleInputChange}
              className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Proveedor</label>
            <input
              type="text"
              name="proveedor"
              value={nuevoMaterial.proveedor}
              onChange={handleInputChange}
              className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
            />
          </div>
        </div>
        <button
          onClick={agregarMaterial}
          className="mt-4 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Agregar Material
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Material</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Precio Unitario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Proveedor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {materialesState.map((material) => (
              <tr key={material.id}>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">{material.nombre}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="mr-1">$</span>
                    <input
                      type="number"
                      value={material.precio}
                      onChange={(e) => actualizarPrecio(material.id, e.target.value)}
                      className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                    />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">{material.proveedor}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button className="text-rose-400 hover:text-rose-300">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GestionPrecios;