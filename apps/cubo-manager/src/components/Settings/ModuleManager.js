import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

const ModuleManager = () => {
  const { appStructure, setAppStructure } = useContext(AppContext);

  const toggleModule = (moduleName) => {
    setAppStructure(prev => prev.map(m => 
      m.name === moduleName ? { ...m, enabled: !m.enabled } : m
    ));
  };

  return (
    <div className="module-manager">
      <h3>Administrar Módulos</h3>
      <div className="modules-list">
        {appStructure.map((module, index) => (
          <div key={index} className="module-item">
            <label>
              <input
                type="checkbox"
                checked={module.enabled}
                onChange={() => toggleModule(module.name)}
              />
              <span>{module.name}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModuleManager;