import React from 'react';
import { Model } from '../types';

interface SideMenuProps {
  menuOpen: boolean;
  darkMode: boolean;
  models: Model[];
  toggleDarkMode: () => void;
  toggleModel: (modelId: string) => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ 
  menuOpen, 
  darkMode, 
  models, 
  toggleDarkMode, 
  toggleModel 
}) => {
  return (
    <div className={`side-menu ${menuOpen ? '' : 'side-menu-hidden'}`}>
      <h1 className="text-xl font-bold mb-6">Persistence Protocol</h1>
      
      <div className="menu-section">
        <h2>Theme</h2>
        <div className="model-option">
          <span>Dark Mode</span>
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={darkMode} 
              onChange={toggleDarkMode}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
      
      <div className="menu-section">
        <h2>Models</h2>
        {models.map(model => (
          <div key={model.id} className="model-option">
            <div>
              <div>{model.name}</div>
              <div className="text-xs opacity-60">{model.description}</div>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={model.selected} 
                onChange={() => toggleModel(model.id)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SideMenu;
