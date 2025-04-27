import React, { useEffect } from 'react';
import Button from './Button';

interface GlobalInputProps {
  globalInput: string;
  globalImages: string[];
  isGlobalInputCollapsed: boolean;
  isGlobalLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: (index: number) => void;
  onToggleCollapse: () => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

const GlobalInput: React.FC<GlobalInputProps> = ({ 
  globalInput,
  globalImages,
  isGlobalInputCollapsed,
  isGlobalLoading,
  onInputChange,
  onImageUpload,
  onImageRemove,
  onToggleCollapse,
  onSend,
  onKeyDown,
  textareaRef
}) => {
  // Add global keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Alt+G to focus the global input
      if (e.altKey && e.key === 'g') {
        e.preventDefault();
        if (isGlobalInputCollapsed) {
          onToggleCollapse();
        }
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }
      
      // Alt+S to send the message if input is focused and not empty
      if (e.altKey && e.key === 's') {
        if (document.activeElement === textareaRef.current && 
            (globalInput.trim() !== '' || globalImages.length > 0)) {
          e.preventDefault();
          onSend();
        }
      }
      
      // Escape to collapse the input if it's expanded and focused
      if (e.key === 'Escape') {
        if (!isGlobalInputCollapsed && document.activeElement === textareaRef.current) {
          e.preventDefault();
          onToggleCollapse();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isGlobalInputCollapsed, onToggleCollapse, textareaRef, globalInput, globalImages, onSend]);
  return (
    <div 
      className={`global-input-container ${isGlobalInputCollapsed ? 'collapsed' : ''}`}
      onClick={isGlobalInputCollapsed ? onToggleCollapse : undefined}
    >
      <div className="global-input-header">
        <div className="global-input-title">
          Message All Models
          <span className="global-input-shortcut" title="Keyboard shortcut: Alt+G">Alt+G</span>
        </div>
        <button 
          className="global-input-toggle"
          onClick={onToggleCollapse}
          aria-label={isGlobalInputCollapsed ? "Expand global input" : "Collapse global input"}
        >
          {isGlobalInputCollapsed ? '⊕' : '⊖'}
        </button>
      </div>
      
      <div className="global-input-content">
        <textarea
          ref={textareaRef}
          className="global-textarea"
          value={globalInput}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          placeholder="Type a message to send to all active models... (Alt+S to send, Esc to collapse)"
          disabled={isGlobalLoading}
        />
        
        <div className="global-input-footer">
          <div className="global-image-upload">
            <label className="image-upload-button" title="Upload images">
              📷
              <input
                type="file"
                className="image-upload-input"
                accept="image/*"
                multiple
                onChange={onImageUpload}
                disabled={isGlobalLoading}
              />
            </label>
            
            {globalImages.map((imageData, index) => (
              <div key={`global-img-${index}`} className="global-image-preview">
                <img src={imageData} alt="Preview" />
                <button 
                  className="global-image-remove"
                  onClick={() => onImageRemove(index)}
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          
          <div className="global-button-container">
            <div className="global-shortcuts-hint">
              <span title="Send message">Alt+S</span>
              <span title="Collapse input">Esc</span>
            </div>
            <Button 
              variant="primary"
              size="sm"
              onClick={onSend}
              disabled={isGlobalLoading || (globalInput.trim() === '' && globalImages.length === 0)}
              isLoading={isGlobalLoading}
              className="global-send-button"
            >
              Send to All Models
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalInput;
