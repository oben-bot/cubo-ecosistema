import React, { useEffect, useState } from 'react';
import './TrashBin.css';
import { ReactComponent as TrashIcon } from '../assets/trash-icon.svg';
import { useNavigate } from 'react-router-dom';

const TRASH_KEY = 'app_trash_bin';
const AUTO_PURGE_DAYS = 15;

function getTrash() {
  const trash = JSON.parse(localStorage.getItem(TRASH_KEY) || '[]');
  return trash.filter(item => {
    // Eliminar si han pasado más de AUTO_PURGE_DAYS
    const age = (Date.now() - item.deletedAt) / (1000 * 60 * 60 * 24);
    return age < AUTO_PURGE_DAYS;
  });
}

function saveTrash(trash) {
  localStorage.setItem(TRASH_KEY, JSON.stringify(trash));
}

export function moveToTrash(item) {
  const trash = getTrash();
  trash.push({ ...item, deletedAt: Date.now() });
  saveTrash(trash);
}

const TrashBin = ({ onClose }) => {
  const [trash, setTrash] = useState(getTrash());
  const navigate = typeof useNavigate === 'function' ? useNavigate() : null;

  useEffect(() => {
    // Limpieza automática cada vez que se abre
    const filtered = getTrash();
    saveTrash(filtered);
    setTrash(filtered);
  }, []);

  const restoreItem = (id) => {
    const item = trash.find(i => i.id === id);
    // Aquí deberías implementar la lógica de restauración según el tipo de item
    setTrash(trash.filter(i => i.id !== id));
    saveTrash(trash.filter(i => i.id !== id));
  };

  const deleteItem = (id) => {
    const filtered = trash.filter(i => i.id !== id);
    setTrash(filtered);
    saveTrash(filtered);
  };

  const purgeAll = () => {
    setTrash([]);
    saveTrash([]);
  };

  // Nuevo handler para regresar
  const handleBack = () => {
    if (navigate) {
      navigate('/dashboard');
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div className="trash-bin-container">
      <h2><TrashIcon className="trash-bin-icon" /> Papelera de reciclaje</h2>
      <button className="trash-menu-btn" onClick={handleBack}>Regresar a menú</button>
      {trash.length === 0 ? (
        <p>La papelera está vacía.</p>
      ) : (
        <ul className="trash-list">
          {trash.map(item => (
            <li key={item.id} className="trash-item">
              <span>{item.name || item.path || 'Elemento eliminado'}</span>
              <button onClick={() => restoreItem(item.id)}>Restaurar</button>
              <button onClick={() => deleteItem(item.id)}>Eliminar</button>
            </li>
          ))}
        </ul>
      )}
      {trash.length > 0 && (
        <button className="purge-btn" onClick={purgeAll}>Vaciar papelera</button>
      )}
      <p className="auto-purge-info">Los elementos se eliminarán automáticamente cada 15 días.</p>
    </div>
  );
};

export default TrashBin;
