import React from 'react';
import Button from './Button';

interface ChatHeaderProps {
  modelName: string;
  menuOpen: boolean;
  isFullscreen: boolean;
  toggleChatMenu: () => void;
  toggleFullscreen: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  modelName, 
  menuOpen, 
  isFullscreen, 
  toggleChatMenu, 
  toggleFullscreen 
}) => {
  return (
    <div className="chat-header p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 flex items-center">
      <h2 className="font-semibold">{modelName}</h2>
      <div className="flex ml-auto">
        <button 
          className="chat-menu-button mr-2" 
          onClick={toggleChatMenu}
          aria-label="Chat menu"
        >
          ⋮
        </button>
        <Button 
          variant="ghost"
          size="sm"
          className="fullscreen-button" 
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? '⊖' : '⊕'}
        </Button>
      </div>
    </div>
  );
};

export default ChatHeader;
