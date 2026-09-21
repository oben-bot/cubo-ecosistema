import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';

const StructureEditor = () => {
  const { appStructure, setAppStructure } = useContext(AppContext);
  const [newModule, setNewModule] = useState({
    name: '',
    icon: 'cube',
    enabled: true
  });

  const toggleModule = (moduleName) => {
    setAppStructure(prev => prev.map(m => 
      m.name === moduleName ? { ...m, enabled: !m.enabled } : m
    ));
  };

  const addModule = () => {
    if (newModule.name.trim()) {
      setAppStructure(prev => [...prev, newModule]);
      setNewModule({ name: '', icon: 'cube', enabled: true });
    }
  };

  return (
    <div className="structure-editor">
      <h3>Módulos Activos</h3>
      <div className="modules-list">
        {appStructure.map((module, i) => (
          <div key={i} className="module-item">
            <input
              type="checkbox"
              checked={module.enabled}
              onChange={() => toggleModule(module.name)}
            />
            <span>{module.name}</span>
          </div>
        ))}
      </div>

      <h3>Añadir Nuevo Módulo</h3>
      <div className="add-module">
        <input
          value={newModule.name}
          onChange={(e) => setNewModule({...newModule, name: e.target.value})}
          placeholder="Nombre del módulo"
        />
        <button onClick={addModule}>Añadir</button>
      </div>
    </div>
  );
};

export default StructureEditor;