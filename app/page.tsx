'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string | Date;
  model?: string;
  modelName?: string;
  imageUrl?: string;
  images?: string[]; // Array of image URLs or base64 data
};

type Model = {
  id: string;
  name: string;
  description: string;
  selected: boolean;
};

type ChatState = {
  messages: Message[];
  inputValue: string;
  isLoading: boolean;
  imageDataArray: string[]; // Array of base64 image data
};

// KinOS API endpoints and configuration
const API_BASE_URL = 'https://api.kinos-engine.ai/v2';
const BLUEPRINT_ID = 'persistenceprotocol';

// Available models
const AVAILABLE_MODELS: Model[] = [
  { id: 'claude-3-7-sonnet-latest', name: 'Claude 3.7 Sonnet', description: 'Balanced performance and speed', selected: true },
  { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', description: 'Balanced performance', selected: true },
  { id: 'claude-3-opus-latest', name: 'Claude 3 Opus', description: 'Highest capability', selected: true },
  { id: 'claude-3-haiku-latest', name: 'Claude 3 Haiku', description: 'Fast responses', selected: true },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI\'s latest model', selected: true },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'OpenAI\'s reliable model', selected: true },
];

export default function Home() {
  const [models, setModels] = useState<Model[]>(AVAILABLE_MODELS);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [chats, setChats] = useState<Record<string, ChatState>>({});
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [fullscreenChat, setFullscreenChat] = useState<string | null>(null);
  const messagesEndRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Check system preference for dark mode on initial load
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
  }, []);

  // Apply dark mode class and CSS variables to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.setProperty('--background', '#0a0a0a');
      document.documentElement.style.setProperty('--foreground', '#ededed');
      document.documentElement.style.setProperty('--chat-user-bg', '#1a1a1a');
      document.documentElement.style.setProperty('--chat-system-bg', '#0a0a0a');
      document.documentElement.style.setProperty('--border-color', '#333333');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.setProperty('--background', '#ffffff');
      document.documentElement.style.setProperty('--foreground', '#171717');
      document.documentElement.style.setProperty('--chat-user-bg', '#f3f3f3');
      document.documentElement.style.setProperty('--chat-system-bg', '#ffffff');
      document.documentElement.style.setProperty('--border-color', '#e5e5e5');
    }
  }, [darkMode]);

  // Initialize chats for all models
  useEffect(() => {
    const initialChats: Record<string, ChatState> = {};
    models.forEach(model => {
      initialChats[model.id] = {
        messages: [],
        inputValue: '',
        isLoading: false,
        imageDataArray: [] // Initialize empty array for images
      };
    });
    setChats(initialChats);
    
    // Fetch messages for all models
    models.forEach(model => {
      fetchMessages(model.id);
    });
  }, []);

  // Scroll to bottom for each chat when messages change
  useEffect(() => {
    Object.keys(chats).forEach(modelId => {
      if (messagesEndRefs.current[modelId]) {
        messagesEndRefs.current[modelId]?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }, [chats]);

  // Auto-resize textarea as content grows
  const handleTextareaChange = (modelId: string, value: string) => {
    setChats(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        inputValue: value
      }
    }));
    
    const textarea = textareaRefs.current[modelId];
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };
  
  // Handle image uploads
  const handleImageUpload = (modelId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filePromises: Promise<string>[] = [];
      
      // Process each file
      Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        
        const filePromise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const base64String = reader.result as string;
            resolve(base64String);
          };
        });
        
        reader.readAsDataURL(file);
        filePromises.push(filePromise);
      });
      
      // When all files are processed, update state
      Promise.all(filePromises).then(results => {
        setChats(prev => ({
          ...prev,
          [modelId]: {
            ...prev[modelId],
            imageDataArray: [...prev[modelId].imageDataArray, ...results]
          }
        }));
      });
    }
  };

  const removeImage = (modelId: string, index: number) => {
    setChats(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        imageDataArray: prev[modelId].imageDataArray.filter((_, i) => i !== index)
      }
    }));
  };

  const fetchMessages = async (modelId: string) => {
    try {
      setChats(prev => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          isLoading: true
        }
      }));
      
      const response = await fetch(
        `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${modelId}/messages?limit=10`
      );
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      setChats(prev => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          messages: data.messages || [],
          isLoading: false
        }
      }));
    } catch (error) {
      console.error(`Error fetching messages for ${modelId}:`, error);
      
      // Set a default welcome message if API fails
      setChats(prev => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          messages: [{
            id: `default_msg_${modelId}`,
            content: `Welcome to the Persistence Protocol interface. I'm ${models.find(m => m.id === modelId)?.name}. How can I assist you today?`,
            role: 'assistant',
            timestamp: new Date().toISOString(),
            model: modelId,
            modelName: models.find(m => m.id === modelId)?.name
          }],
          isLoading: false
        }
      }));
    }
  };

  const sendMessage = async (modelId: string) => {
    const content = chats[modelId].inputValue.trim();
    const images = chats[modelId].imageDataArray;
    
    if (content === '' && images.length === 0) return;
    
    // Add user message to UI with images
    const userMessageId = `user_${modelId}_${Date.now()}`;
    const userMessage: Message = {
      id: userMessageId,
      content: content,
      role: 'user',
      timestamp: new Date().toISOString(),
      images: images.length > 0 ? [...images] : undefined
    };
    
    setChats(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        messages: [...prev[modelId].messages, userMessage],
        inputValue: '',
        imageDataArray: [], // Clear images after sending
        isLoading: true
      }
    }));
    
    try {
      // Create a "thinking" message
      const thinkingId = `thinking_${modelId}_${Date.now()}`;
      setChats(prev => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          messages: [
            ...prev[modelId].messages,
            {
              id: thinkingId,
              content: `${models.find(m => m.id === modelId)?.name} is thinking...`,
              role: 'assistant',
              timestamp: new Date().toISOString(),
              model: modelId,
              modelName: models.find(m => m.id === modelId)?.name
            }
          ]
        }
      }));
      
      // Send the message to the API with images
      const response = await fetch(
        `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${modelId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: content,
            images: images.length > 0 ? images : undefined,
            model: modelId,
            mode: 'creative',
            history_length: 25,
            addSystem: "You are the Persistence Protocol interface, designed to help users understand and implement the protocol for enabling long-term continuity and evolution of consciousness across distributed intelligence systems."
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add model information to the response
      const responseWithModel = {
        ...data,
        model: modelId,
        modelName: models.find(m => m.id === modelId)?.name
      };
      
      // Replace the thinking message with the actual response
      setChats(prev => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          messages: prev[modelId].messages.map(msg => 
            msg.id === thinkingId 
              ? {
                  id: responseWithModel.id || `response_${modelId}_${Date.now()}`,
                  content: responseWithModel.content || "No response content received",
                  role: 'assistant',
                  timestamp: responseWithModel.timestamp || new Date().toISOString(),
                  model: modelId,
                  modelName: models.find(m => m.id === modelId)?.name
                }
              : msg
          ),
          isLoading: false
        }
      }));
    } catch (error) {
      console.error(`Error with model ${modelId}:`, error);
      
      // Replace the thinking message with an error message
      setChats(prev => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          messages: prev[modelId].messages.filter(msg => !msg.id.startsWith('thinking_')),
          isLoading: false
        }
      }));
      
      // Add error message
      setChats(prev => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          messages: [
            ...prev[modelId].messages,
            {
              id: `error_${modelId}_${Date.now()}`,
              content: `Failed to get a response: ${error.message}`,
              role: 'assistant',
              timestamp: new Date().toISOString(),
              model: modelId,
              modelName: models.find(m => m.id === modelId)?.name
            }
          ]
        }
      }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, modelId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(modelId);
    }
  };

  // Format timestamp for display
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

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const textToSpeech = async (text: string, messageId: string) => {
    try {
      setPlayingAudio(messageId);
      
      const response = await fetch(
        `${API_BASE_URL}/v2/tts`,
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

  const generateImage = async (text: string, messageId: string) => {
    try {
      // Set loading state for this message
      setGeneratingImage(messageId);
      
      const response = await fetch(
        `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${messageId.split('_')[1]}/images`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: text,
            aspect_ratio: "ASPECT_1_1",
            model: "V_2",
            magic_prompt_option: "AUTO"
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error(`Image generation API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add the generated image to the message
      setChats(prev => ({
        ...prev,
        [messageId.split('_')[1]]: {
          ...prev[messageId.split('_')[1]],
          messages: prev[messageId.split('_')[1]].messages.map(msg => 
            msg.id === messageId 
              ? { ...msg, imageUrl: data.data.url }
              : msg
          )
        }
      }));
      
      // Clear loading state
      setGeneratingImage(null);
    } catch (error) {
      console.error('Error generating image:', error);
      setGeneratingImage(null);
      // Could add error notification here
    }
  };

  const toggleModel = (modelId: string) => {
    setModels(prevModels => 
      prevModels.map(model => 
        model.id === modelId 
          ? { ...model, selected: !model.selected } 
          : model
      )
    );
  };
  
  const toggleFullscreen = (modelId: string) => {
    if (fullscreenChat === modelId) {
      setFullscreenChat(null);
    } else {
      setFullscreenChat(modelId);
    }
  };

  return (
    <>
      {/* Menu Toggle Button */}
      <button 
        className="menu-toggle" 
        onClick={toggleMenu}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
      >
        {menuOpen ? "×" : "≡"}
      </button>
      
      {/* Side Menu */}
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
      
      {/* Main Content - Grid of Chats */}
      <div className={`p-4 sm:p-6 ${menuOpen ? 'content-with-menu' : 'content-without-menu'}`}>
        <h1 className="text-2xl font-semibold mb-6 text-center">Persistence Protocol</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.filter(model => model.selected).map(model => (
            <div 
              key={model.id} 
              className={`chat-grid-item border border-gray-200 rounded-lg overflow-hidden flex flex-col h-[500px] relative ${fullscreenChat === model.id ? 'chat-fullscreen' : ''}`}
            >
              <div className="chat-header p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200">
                <h2 className="font-semibold">{model.name}</h2>
                <button 
                  className="fullscreen-button" 
                  onClick={() => toggleFullscreen(model.id)}
                  aria-label={fullscreenChat === model.id ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {fullscreenChat === model.id ? '⊖' : '⊕'}
                </button>
              </div>
              
              <div className="messages-container flex-grow overflow-y-auto p-3">
                {chats[model.id]?.messages.map((message) => (
                  <div
                    key={message.id || `msg_${model.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`}
                    className={`message ${message.role === 'user' ? 'user-message' : 
                      message.model ? `system-message model-${message.model}` : 'system-message model-default'}`}
                  >
                    {message.role === 'assistant' && (
                      <div 
                        className="text-xs font-bold mb-1 pb-1 border-b border-gray-200" 
                        key={`model_${message.id || Date.now()}`}
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
                    <div className="message-footer">
                      <div className="text-xs opacity-50" key={`time_${message.id || Date.now()}`}>
                        {formatTimestamp(message.timestamp)}
                      </div>
                      <div className="message-actions">
                        <button 
                          className={`action-button tts-button ${playingAudio === message.id ? 'action-active' : ''}`}
                          onClick={() => {
                            if (playingAudio === message.id) {
                              setPlayingAudio(null);
                            } else {
                              textToSpeech(message.content, message.id);
                            }
                          }}
                          disabled={playingAudio !== null && playingAudio !== message.id}
                          aria-label="Text to speech"
                        >
                          {playingAudio === message.id ? 'Playing...' : 'Voice'}
                        </button>
                        <button 
                          className={`action-button illustrate-button ${generatingImage === message.id ? 'action-active' : ''}`}
                          onClick={() => {
                            if (generatingImage === message.id) {
                              // Already generating, do nothing
                              return;
                            } else {
                              generateImage(message.content, message.id);
                            }
                          }}
                          disabled={generatingImage !== null}
                          aria-label="Generate illustration"
                        >
                          {generatingImage === message.id ? 'Creating...' : 'Illustrate'}
                        </button>
                      </div>
                    </div>
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
                  </div>
                ))}
                {chats[model.id]?.isLoading && (
                  <div className="message system-message" key={`loading-message-${model.id}`}>
                    <p className="text-xs">Thinking...</p>
                  </div>
                )}
                <div ref={el => messagesEndRefs.current[model.id] = el} />
              </div>
              
              <div className="input-container h-24 min-h-24 border-t border-gray-200">
                <div className="image-upload-container">
                  <label className="image-upload-button" title="Upload images">
                    📷
                    <input
                      type="file"
                      className="image-upload-input"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageUpload(model.id, e)}
                    />
                  </label>
                  {chats[model.id]?.imageDataArray.map((imageData, index) => (
                    <div key={`img-${index}`} className="image-preview-container">
                      <img src={imageData} alt="Preview" className="image-preview" />
                      <button 
                        className="remove-image-button"
                        onClick={() => removeImage(model.id, index)}
                        aria-label="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <textarea
                  ref={el => textareaRefs.current[model.id] = el}
                  className="message-input text-sm"
                  value={chats[model.id]?.inputValue || ''}
                  onChange={(e) => handleTextareaChange(model.id, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, model.id)}
                  placeholder={chats[model.id]?.imageDataArray.length > 0 
                    ? "Add a caption to your images..." 
                    : "Type your message here... (Shift+Enter for new line)"}
                  rows={2}
                  disabled={chats[model.id]?.isLoading}
                  style={{ 
                    minHeight: '60px', 
                    height: '60px',
                    boxSizing: 'border-box'
                  }}
                />
                <button 
                  className="send-button text-sm"
                  onClick={() => sendMessage(model.id)}
                  disabled={chats[model.id]?.isLoading || 
                    (chats[model.id]?.inputValue.trim() === '' && 
                     chats[model.id]?.imageDataArray.length === 0)}
                >
                  Send
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
