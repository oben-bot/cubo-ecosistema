import React, { useState, useEffect } from 'react';
import './ClientesMain.css';

const ClientesMain = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    notas: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar clientes al iniciar
  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    setLoading(true);
    try {
      const result = await window.electron.database.query('SELECT * FROM clientes ORDER BY nombre');
      setClientes(result || []);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCliente) {
        // Actualizar
        await window.electron.database.run(
          `UPDATE clientes SET nombre = ?, telefono = ?, email = ?, direccion = ?, notas = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [formData.nombre, formData.telefono, formData.email, formData.direccion, formData.notas, editingCliente.id]
        );
      } else {
        // Insertar
        await window.electron.database.run(
          `INSERT INTO clientes (nombre, telefono, email, direccion, notas) VALUES (?, ?, ?, ?, ?)`,
          [formData.nombre, formData.telefono, formData.email, formData.direccion, formData.notas]
        );
      }
      await loadClientes();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error guardando cliente:', error);
      alert('Error al guardar el cliente');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este cliente? Se eliminará todo su historial.')) {
      try {
        await window.electron.database.run('DELETE FROM clientes WHERE id = ?', [id]);
        await loadClientes();
      } catch (error) {
        console.error('Error eliminando cliente:', error);
        alert('Error al eliminar el cliente');
      }
    }
  };

  const handleEdit = (cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nombre: cliente.nombre,
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      notas: cliente.notas || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingCliente(null);
    setFormData({
      nombre: '',
      telefono: '',
      email: '',
      direccion: '',
      notas: ''
    });
  };

  const filteredClientes = clientes.filter(cliente =>
    cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cliente.telefono && cliente.telefono.includes(searchTerm))
  );

  if (loading) {
    return <div className="loading">Cargando clientes...</div>;
  }

  return (
    <div className="clientes-container">
      <div className="clientes-header">
        <h1>Clientes</h1>
        <div className="clientes-actions">
          <input
            type="text"
            placeholder="🔍 Buscar por nombre o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
            + Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="clientes-grid">
        {filteredClientes.length === 0 ? (
          <div className="empty-state">
            <p>No hay clientes registrados</p>
            <button onClick={() => { resetForm(); setShowModal(true); }}>Crear primer cliente</button>
          </div>
        ) : (
          filteredClientes.map(cliente => (
            <div key={cliente.id} className="cliente-card">
              <div className="cliente-header">
                <h3>{cliente.nombre}</h3>
                <div className="cliente-actions">
                  <button onClick={() => handleEdit(cliente)} className="edit-btn">✏️</button>
                  <button onClick={() => handleDelete(cliente.id)} className="delete-btn">🗑️</button>
                </div>
              </div>
              {cliente.telefono && <p>📞 {cliente.telefono}</p>}
              {cliente.email && <p>✉️ {cliente.email}</p>}
              {cliente.direccion && <p>📍 {cliente.direccion}</p>}
              {cliente.notas && <p className="notas">📝 {cliente.notas.substring(0, 100)}</p>}
              <p className="fecha">Cliente desde: {new Date(cliente.created_at).toLocaleDateString()}</p>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Nombre completo *"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
              <input
                type="tel"
                placeholder="Teléfono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <input
                type="text"
                placeholder="Dirección"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              />
              <textarea
                placeholder="Notas adicionales"
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                rows="3"
              />
              <div className="modal-buttons">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}>Cancelar</button>
                <button type="submit">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientesMain;
