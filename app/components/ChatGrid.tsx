import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Model, ChatState } from '../types';
import ChatMessage from './ChatMessage';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';

interface ChatGridProps {
  models: Model[];
  chats: Record<string, ChatState>;
  messagesEndRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  textareaRefs: React.MutableRefObject<Record<string, HTMLTextAreaElement | null>>;
  fullscreenChat: string | null;
  playingAudio: string | null;
  generatingImage: string | null;
  handleTextareaChange: (modelId: string, value: string) => void;
  toggleChatMenu: (modelId: string) => void;
  toggleChatInput: (modelId: string) => void;
  toggleFullscreen: (modelId: string) => void;
  sendMessage: (modelId: string) => void;
  handleImageUpload: (modelId: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: (modelId: string, index: number) => void;
  setPlayingAudio: (id: string | null) => void;
  generateImage: (text: string, messageId: string) => void;
}

// Error fallback component
function ErrorFallback({error, resetErrorBoundary}: {error: Error; resetErrorBoundary: () => void}) {
  return (
    <div role="alert" className="p-4 bg-red-50 text-red-800 rounded-lg">
      <p className="font-bold">Something went wrong:</p>
      <pre className="mt-2 text-sm overflow-auto">{error.message}</pre>
      <button
        onClick={() => resetErrorBoundary()}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}

const ChatGrid: React.FC<ChatGridProps> = ({ 
  models,
  chats,
  messagesEndRefs,
  textareaRefs,
  fullscreenChat,
  playingAudio,
  generatingImage,
  handleTextareaChange,
  toggleChatMenu,
  toggleChatInput,
  toggleFullscreen,
  sendMessage,
  handleImageUpload,
  removeImage,
  setPlayingAudio,
  generateImage
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {models.filter(model => model.selected).map(model => (
        <ErrorBoundary
          key={model.id}
          FallbackComponent={ErrorFallback}
          onReset={() => {
            // Reset logic would go here
          }}
        >
          <div 
            className={`chat-grid-item rounded-lg overflow-hidden flex flex-col h-[500px] relative ${fullscreenChat === model.id ? 'chat-fullscreen' : ''} model-shape-${model.id.replace(/[^a-zA-Z0-9]/g, '_')}`}
            data-model={model.id}
          >
            <ChatHeader 
              modelName={model.name}
              menuOpen={chats[model.id]?.menuOpen || false}
              isFullscreen={fullscreenChat === model.id}
              toggleChatMenu={() => toggleChatMenu(model.id)}
              toggleFullscreen={() => toggleFullscreen(model.id)}
            />
            
            {/* Chat menu */}
            {chats[model.id]?.menuOpen && (
              <div className="chat-menu">
                <div 
                  className="chat-menu-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleChatInput(model.id);
                  }}
                >
                  {chats[model.id]?.showInput ? "Hide message input" : "Send message"}
                </div>
              </div>
            )}
            
            <div className="messages-container flex-grow overflow-y-auto p-3">
              {chats[model.id]?.messages.map((message) => (
                <ChatMessage
                  key={message.id || `msg_${model.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`}
                  message={message}
                  models={models}
                  playingAudio={playingAudio}
                  generatingImage={generatingImage}
                  setPlayingAudio={setPlayingAudio}
                  generateImage={generateImage}
                />
              ))}
              {chats[model.id]?.isLoading && (
                <div className="message system-message" key={`loading-message-${model.id}`}>
                  <p className="text-xs">Thinking...</p>
                </div>
              )}
              <div ref={el => messagesEndRefs.current[model.id] = el} />
            </div>
            
            <ChatInput 
              modelId={model.id}
              inputValue={chats[model.id]?.inputValue || ''}
              imageDataArray={chats[model.id]?.imageDataArray || []}
              isLoading={chats[model.id]?.isLoading || false}
              showInput={chats[model.id]?.showInput || false}
              onInputChange={(value) => handleTextareaChange(model.id, value)}
              onSend={() => sendMessage(model.id)}
              onImageUpload={(e) => handleImageUpload(model.id, e)}
              onImageRemove={(index) => removeImage(model.id, index)}
              textareaRef={el => {
                if (el) textareaRefs.current[model.id] = el;
              }}
            />
          </div>
        </ErrorBoundary>
      ))}
    </div>
  );
};

export default ChatGrid;
