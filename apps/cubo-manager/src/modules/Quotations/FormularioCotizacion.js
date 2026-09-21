import React, { useState, useEffect } from 'react';
import { trabajosAnteriores } from '../../mock/cotizacionesData';
import { materiales } from '../../mock/almacenData';

const FormularioCotizacion = ({ onAutorizar, onGuardar }) => {
  const [formData, setFormData] = useState({
    cliente: '',
    trabajoSeleccionado: '',
    trabajoPersonalizado: '',
    descripcion: '',
    precio: '',
    materiales: []
  });

  const [materialSeleccionado, setMaterialSeleccionado] = useState('');
  const [cantidadMaterial, setCantidadMaterial] = useState(1);

  useEffect(() => {
    if (formData.trabajoSeleccionado) {
      const trabajo = trabajosAnteriores.find(t => t.id === Number(formData.trabajoSeleccionado));
      if (trabajo) {
        setFormData(prev => ({
          ...prev,
          precio: trabajo.precio,
          descripcion: trabajo.descripcion,
          materiales: [...trabajo.materiales]
        }));
      }
    }
  }, [formData.trabajoSeleccionado]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const agregarMaterial = () => {
    if (materialSeleccionado) {
      const material = materiales.find(m => m.id === Number(materialSeleccionado));
      if (material) {
        setFormData(prev => ({
          ...prev,
          materiales: [
            ...prev.materiales,
            {
              id: material.id,
              nombre: material.nombre,
              cantidad: cantidadMaterial,
              precioUnitario: material.precio
            }
          ],
          precio: prev.precio ? (Number(prev.precio) + (material.precio * cantidadMaterial)) : (material.precio * cantidadMaterial)
        }));
      }
    }
  };

  const eliminarMaterial = (id) => {
    const material = formData.materiales.find(m => m.id === id);
    setFormData(prev => ({
      ...prev,
      materiales: prev.materiales.filter(m => m.id !== id),
      precio: prev.precio - (material.precioUnitario * material.cantidad)
    }));
  };

  const calcularTotal = () => {
    const subtotalMateriales = formData.materiales.reduce((sum, m) => sum + (m.precioUnitario * m.cantidad), 0);
    const manoDeObra = formData.precio ? Number(formData.precio) - subtotalMateriales : 0;
    return { subtotalMateriales, manoDeObra, total: formData.precio || 0 };
  };

  const totales = calcularTotal();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Cliente</label>
          <input
            type="text"
            name="cliente"
            value={formData.cliente}
            onChange={handleInputChange}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Seleccionar Trabajo Anterior</label>
          <select
            name="trabajoSeleccionado"
            value={formData.trabajoSeleccionado}
            onChange={handleInputChange}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
          >
            <option value="">-- Seleccionar --</option>
            {trabajosAnteriores.map(trabajo => (
              <option key={trabajo.id} value={trabajo.id}>{trabajo.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Nombre del Trabajo</label>
        <input
          type="text"
          name="trabajoPersonalizado"
          value={formData.trabajoPersonalizado}
          onChange={handleInputChange}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
        <textarea
          name="descripcion"
          value={formData.descripcion}
          onChange={handleInputChange}
          rows="3"
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
        />
      </div>

      <div className="bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-violet-400 mb-3">Materiales</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Material</label>
            <select
              value={materialSeleccionado}
              onChange={(e) => setMaterialSeleccionado(e.target.value)}
              className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
            >
              <option value="">-- Seleccionar --</option>
              {materiales.map(material => (
                <option key={material.id} value={material.id}>{material.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Cantidad</label>
            <input
              type="number"
              min="1"
              value={cantidadMaterial}
              onChange={(e) => setCantidadMaterial(Number(e.target.value))}
              className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={agregarMaterial}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Agregar
            </button>
          </div>
        </div>

        {formData.materiales.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-600">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-violet-300 uppercase">Material</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-violet-300 uppercase">Cantidad</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-violet-300 uppercase">Precio Unitario</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-violet-300 uppercase">Subtotal</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-violet-300 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600">
                {formData.materiales.map((material) => (
                  <tr key={material.id}>
                    <td className="px-4 py-2 text-gray-300">{material.nombre}</td>
                    <td className="px-4 py-2 text-gray-300">{material.cantidad}</td>
                    <td className="px-4 py-2 text-gray-300">${material.precioUnitario.toFixed(2)}</td>
                    <td className="px-4 py-2 text-gray-300">${(material.precioUnitario * material.cantidad).toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <button 
                        onClick={() => eliminarMaterial(material.id)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-violet-400 mb-3">Mano de Obra</h3>
          <input
            type="number"
            name="precio"
            value={totales.manoDeObra}
            onChange={(e) => {
              const nuevoValor = Number(e.target.value);
              setFormData(prev => ({
                ...prev,
                precio: nuevoValor + totales.subtotalMateriales
              }));
            }}
            className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
          />
        </div>

        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-violet-400 mb-3">Materiales</h3>
          <div className="text-2xl font-bold text-white">${totales.subtotalMateriales.toFixed(2)}</div>
        </div>

        <div className="bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-violet-400 mb-3">Total</h3>
          <div className="text-2xl font-bold text-white">${totales.total.toFixed(2)}</div>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          onClick={() => onGuardar(formData)}
          className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Guardar Presupuesto
        </button>
        <button
          onClick={() => onAutorizar(formData)}
          className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Autorizar y Enviar a Producción
        </button>
      </div>
    </div>
  );
};

export default FormularioCotizacion;