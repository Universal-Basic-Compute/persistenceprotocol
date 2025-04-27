import React from 'react';
import Button from './Button';
import ImageUpload from './ImageUpload';

interface ChatInputProps {
  modelId: string;
  inputValue: string;
  imageDataArray: string[];
  isLoading: boolean;
  showInput: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: (index: number) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  modelId,
  inputValue,
  imageDataArray,
  isLoading,
  showInput,
  onInputChange,
  onSend,
  onImageUpload,
  onImageRemove,
  textareaRef
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  if (!showInput) {
    return null;
  }

  return (
    <div className="input-container h-24 min-h-24 border-t border-gray-200">
      <ImageUpload 
        images={imageDataArray}
        onUpload={onImageUpload}
        onRemove={onImageRemove}
        disabled={isLoading}
      />
      <textarea
        ref={textareaRef}
        className="message-input text-sm"
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={imageDataArray.length > 0 
          ? "Add a caption to your images..." 
          : "Type your message here... (Shift+Enter for new line)"}
        rows={2}
        disabled={isLoading}
        style={{ 
          minHeight: '60px', 
          height: '60px',
          boxSizing: 'border-box'
        }}
      />
      <Button 
        variant="primary"
        size="sm"
        onClick={onSend}
        disabled={isLoading || (inputValue.trim() === '' && imageDataArray.length === 0)}
        isLoading={isLoading}
        className="send-button"
      >
        Send
      </Button>
    </div>
  );
};

export default ChatInput;
