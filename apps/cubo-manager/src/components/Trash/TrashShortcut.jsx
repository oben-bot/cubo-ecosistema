import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ReactComponent as TrashIcon } from '../assets/trash-icon.svg';
import './TrashShortcut.css';

const TrashShortcut = () => {
  const navigate = useNavigate();
  return (
    <button className="trash-shortcut-btn" onClick={() => navigate('/trash')} title="Papelera de reciclaje">
      <TrashIcon className="trash-shortcut-icon" />
    </button>
  );
};

export default TrashShortcut;
