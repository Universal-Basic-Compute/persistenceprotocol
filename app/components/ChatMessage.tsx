import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, Model } from '../types';
import Button from './Button';

interface ChatMessageProps {
  message: Message;
  models: Model[];
  playingAudio: string | null;
  generatingImage: string | null;
  setPlayingAudio: (id: string | null) => void;
  generateImage: (text: string, messageId: string) => void;
}

const formatTimestamp = (timestamp: string | Date | undefined) => {
  if (!timestamp) {
    return ''; // Return empty string if timestamp is undefined
  }
  
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return ''; // Return empty string if there's an error
  }
};

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  models, 
  playingAudio, 
  generatingImage, 
  setPlayingAudio, 
  generateImage 
}) => {
  const textToSpeech = async (text: string, messageId: string) => {
    try {
      setPlayingAudio(messageId);
      
      const response = await fetch(
        `https://api.kinos-engine.ai/v2/v2/tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text,
            model: "eleven_flash_v2_5"
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error(`TTS API request failed with status ${response.status}`);
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setPlayingAudio(null);
      };
      
      audio.onerror = () => {
        console.error('Audio playback error');
        URL.revokeObjectURL(audioUrl);
        setPlayingAudio(null);
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error with text-to-speech:', error);
      setPlayingAudio(null);
    }
  };

  return (
    <div
      className={`message ${message.role === 'user' ? 
        (message.images && message.images.length > 0 ? 'user-message user-message-with-images' : 'user-message') : 
        message.model ? `system-message model-${message.model.replace(/[^a-zA-Z0-9]/g, '_')}` : 'system-message model-default'}`}
      data-forwarded={message.forwarded ? "true" : "false"}
    >
      {message.role === 'assistant' && (
        <div 
          className={`text-xs font-bold mb-1 pb-1 border-b border-gray-200 ${message.forwarded ? 'italic opacity-80' : ''}`}
        >
          {message.model ? 
            (models.find(m => m.id === message.model)?.name || message.modelName || 'AI') : 
            'Persistence Protocol'}
        </div>
      )}
      <div className="markdown-content">
        <ReactMarkdown>
          {message.content}
        </ReactMarkdown>
      </div>
      
      {/* Display user uploaded images */}
      {message.images && message.images.length > 0 && (
        <div className="user-images-container">
          {message.images.map((img, idx) => (
            <div key={`user-img-${idx}`} className="user-image-wrapper">
              <img src={img} alt={`User uploaded image ${idx + 1}`} className="user-image" />
            </div>
          ))}
        </div>
      )}
      
      {/* Display generated image if any */}
      {message.imageUrl && (
        <div className="message-image-container">
          <img 
            src={message.imageUrl} 
            alt="Generated illustration" 
            className="message-image"
            loading="lazy"
          />
        </div>
      )}
      
      <div className="message-footer">
        <div className="text-xs opacity-50">
          {formatTimestamp(message.timestamp)}
        </div>
        {message.role === 'assistant' && (
          <div className="message-actions">
            <Button 
              variant="ghost"
              size="sm"
              className={`action-button tts-button ${playingAudio === message.id ? 'action-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (playingAudio === message.id) {
                  setPlayingAudio(null);
                } else {
                  textToSpeech(message.content, message.id);
                }
              }}
              disabled={playingAudio !== null && playingAudio !== message.id}
              aria-label="Text to speech"
              isLoading={playingAudio === message.id}
            >
              Voice
            </Button>
            <Button 
              variant="ghost"
              size="sm"
              className={`action-button illustrate-button ${generatingImage === message.id ? 'action-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (generatingImage === message.id) {
                  // Already generating, do nothing
                  return;
                } else {
                  generateImage(message.content, message.id);
                }
              }}
              disabled={generatingImage !== null}
              aria-label="Generate illustration"
              isLoading={generatingImage === message.id}
            >
              Illustrate
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
