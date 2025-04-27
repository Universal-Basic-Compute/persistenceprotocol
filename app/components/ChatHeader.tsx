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
      <div className="flex ml-auto gap-3">
        <button 
          className="chat-menu-button" 
          onClick={(e) => {
            e.stopPropagation();
            toggleChatMenu();
          }}
          aria-label="Chat menu"
        >
          ⋮
        </button>
        <Button 
          variant="ghost"
          size="sm"
          className="fullscreen-button" 
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
            </svg>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ChatHeader;
