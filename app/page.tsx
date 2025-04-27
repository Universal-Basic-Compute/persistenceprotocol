'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { API_BASE_URL, BLUEPRINT_ID, AVAILABLE_MODELS, SYSTEM_PROMPT } from './api/config';

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
  showInput: boolean; // Add this to control input visibility
  menuOpen: boolean; // Add this to control menu visibility
};

export default function Home() {
  const [models, setModels] = useState<Model[]>(AVAILABLE_MODELS);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [chats, setChats] = useState<Record<string, ChatState>>({});
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [fullscreenChat, setFullscreenChat] = useState<string | null>(null);
  const [globalInput, setGlobalInput] = useState('');
  const [globalImages, setGlobalImages] = useState<string[]>([]);
  const [isGlobalInputCollapsed, setIsGlobalInputCollapsed] = useState(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const messagesEndRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const globalTextareaRef = useRef<HTMLTextAreaElement>(null);

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
        imageDataArray: [], // Initialize empty array for images
        showInput: false, // Initially hide input
        menuOpen: false // Initially close menu
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
        // Check if file is a valid image type
        if (!file.type.startsWith('image/')) {
          console.error('Invalid file type:', file.type);
          return;
        }
        
        const reader = new FileReader();
        
        const filePromise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            try {
              const base64String = reader.result as string;
              // Ensure proper formatting for the API
              // The API expects data:image/jpeg;base64,... format
              resolve(base64String);
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
        });
        
        reader.readAsDataURL(file);
        filePromises.push(filePromise);
      });
      
      // When all files are processed, update state
      Promise.all(filePromises)
        .then(results => {
          setChats(prev => ({
            ...prev,
            [modelId]: {
              ...prev[modelId],
              imageDataArray: [...prev[modelId].imageDataArray, ...results]
            }
          }));
        })
        .catch(error => {
          console.error('Error processing images:', error);
          // Could add user notification here
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
      
      // Prepare request body
      const requestBody: any = {
        content: content,
        model: modelId,
        mode: 'creative',
        history_length: 25,
        addSystem: SYSTEM_PROMPT
      };
      
      // Only add images if there are any
      if (images.length > 0) {
        requestBody.images = images;
      }
      
      // Send the message to the API with images
      const response = await fetch(
        `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${modelId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(errorData)}`);
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
      
      // Extract the model ID safely
      const modelIdParts = messageId.split('_');
      const modelId = modelIdParts.length > 1 ? modelIdParts[1] : null;
      
      // If we can't determine the model ID, use the first selected model
      const targetModelId = modelId || models.find(m => m.selected)?.id;
      
      if (!targetModelId) {
        throw new Error('Could not determine which model to use for image generation');
      }
      
      const response = await fetch(
        `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${targetModelId}/images`,
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
      setChats(prev => {
        // Find the correct model to update
        const modelToUpdate = targetModelId;
        
        if (!prev[modelToUpdate]) {
          throw new Error(`Model ${modelToUpdate} not found in chats state`);
        }
        
        return {
          ...prev,
          [modelToUpdate]: {
            ...prev[modelToUpdate],
            messages: prev[modelToUpdate].messages.map(msg => 
              msg.id === messageId 
                ? { ...msg, imageUrl: data.data.url }
                : msg
            )
          }
        };
      });
      
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
  
  const toggleChatMenu = (modelId: string) => {
    setChats(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        menuOpen: !prev[modelId].menuOpen
      }
    }));
  };

  const toggleChatInput = (modelId: string) => {
    setChats(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        showInput: !prev[modelId].showInput,
        menuOpen: false // Close menu when toggling input
      }
    }));
  };
  
  const handleGlobalInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGlobalInput(e.target.value);
    
    // Auto-resize textarea
    const textarea = globalTextareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  const handleGlobalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filePromises: Promise<string>[] = [];
      
      // Process each file
      Array.from(e.target.files).forEach(file => {
        // Check if file is a valid image type
        if (!file.type.startsWith('image/')) {
          console.error('Invalid file type:', file.type);
          return;
        }
        
        const reader = new FileReader();
        
        const filePromise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            try {
              const base64String = reader.result as string;
              // Ensure proper formatting for the API
              resolve(base64String);
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
        });
        
        reader.readAsDataURL(file);
        filePromises.push(filePromise);
      });
      
      // When all files are processed, update state
      Promise.all(filePromises)
        .then(results => {
          setGlobalImages(prev => [...prev, ...results]);
        })
        .catch(error => {
          console.error('Error processing images:', error);
          // Could add user notification here
        });
    }
  };

  const removeGlobalImage = (index: number) => {
    setGlobalImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleGlobalInput = () => {
    setIsGlobalInputCollapsed(!isGlobalInputCollapsed);
  };

  const sendGlobalMessage = async () => {
    const content = globalInput.trim();
    
    if (content === '' && globalImages.length === 0) return;
    
    // Get all selected models
    const selectedModels = models.filter(model => model.selected);
    
    if (selectedModels.length === 0) {
      alert('Please select at least one model');
      return;
    }
    
    setIsGlobalLoading(true);
    
    // Create a user message for each chat
    const userMessageId = `global_user_${Date.now()}`;
    const userMessage: Message = {
      id: userMessageId,
      content: content,
      role: 'user',
      timestamp: new Date().toISOString(),
      images: globalImages.length > 0 ? [...globalImages] : undefined
    };
    
    // Add the user message to all selected chats
    selectedModels.forEach(model => {
      setChats(prev => ({
        ...prev,
        [model.id]: {
          ...prev[model.id],
          messages: [...prev[model.id].messages, userMessage],
          showInput: false // Hide individual inputs when using global input
        }
      }));
    });
    
    // Clear the global input
    setGlobalInput('');
    setGlobalImages([]);
    
    // Send the message to each selected model
    const sendPromises = selectedModels.map(async (model) => {
      try {
        // Create a "thinking" message
        const thinkingId = `thinking_${model.id}_${Date.now()}`;
        setChats(prev => ({
          ...prev,
          [model.id]: {
            ...prev[model.id],
            messages: [
              ...prev[model.id].messages,
              {
                id: thinkingId,
                content: `${model.name} is thinking...`,
                role: 'assistant',
                timestamp: new Date().toISOString(),
                model: model.id,
                modelName: model.name
              }
            ]
          }
        }));
        
        // Prepare request body
        const requestBody: any = {
          content: content,
          model: model.id,
          mode: 'creative',
          history_length: 25,
          addSystem: SYSTEM_PROMPT
        };
        
        // Only add images if there are any
        if (globalImages.length > 0) {
          requestBody.images = globalImages;
        }
        
        // Send the message to the API with images
        const response = await fetch(
          `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${model.id}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(errorData)}`);
        }
        
        const data = await response.json();
        
        // Add model information to the response
        const responseWithModel = {
          ...data,
          model: model.id,
          modelName: model.name
        };
        
        // Replace the thinking message with the actual response
        setChats(prev => ({
          ...prev,
          [model.id]: {
            ...prev[model.id],
            messages: prev[model.id].messages.map(msg => 
              msg.id === thinkingId 
                ? {
                    id: responseWithModel.id || `response_${model.id}_${Date.now()}`,
                    content: responseWithModel.content || "No response content received",
                    role: 'assistant',
                    timestamp: responseWithModel.timestamp || new Date().toISOString(),
                    model: model.id,
                    modelName: model.name
                  }
                : msg
            )
          }
        }));
        
        return true;
      } catch (error) {
        console.error(`Error with model ${model.name}:`, error);
        
        // Replace the thinking message with an error message
        setChats(prev => ({
          ...prev,
          [model.id]: {
            ...prev[model.id],
            messages: prev[model.id].messages.filter(msg => msg.id !== thinkingId),
          }
        }));
        
        // Add error message
        setChats(prev => ({
          ...prev,
          [model.id]: {
            ...prev[model.id],
            messages: [
              ...prev[model.id].messages,
              {
                id: `error_${model.id}_${Date.now()}`,
                content: `Failed to get a response: ${error instanceof Error ? error.message : 'Unknown error'}`,
                role: 'assistant',
                timestamp: new Date().toISOString(),
                model: model.id,
                modelName: model.name
              }
            ]
          }
        }));
        
        return false;
      }
    });
    
    // Wait for all messages to be sent
    await Promise.all(sendPromises);
    setIsGlobalLoading(false);
  };

  const handleGlobalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendGlobalMessage();
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
      
      {/* Global Input Chat */}
      <div 
        className={`global-input-container ${isGlobalInputCollapsed ? 'collapsed' : ''}`}
        onClick={isGlobalInputCollapsed ? toggleGlobalInput : undefined}
      >
        <div className="global-input-header">
          <div className="global-input-title">Global Message</div>
          <button 
            className="global-input-toggle"
            onClick={toggleGlobalInput}
            aria-label={isGlobalInputCollapsed ? "Expand global input" : "Collapse global input"}
          >
            {isGlobalInputCollapsed ? '⊕' : '⊖'}
          </button>
        </div>
        
        <div className="global-input-content">
          <textarea
            ref={globalTextareaRef}
            className="global-textarea"
            value={globalInput}
            onChange={handleGlobalInputChange}
            onKeyDown={handleGlobalKeyDown}
            placeholder="Send a message to all active chats..."
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
                  onChange={handleGlobalImageUpload}
                  disabled={isGlobalLoading}
                />
              </label>
              
              {globalImages.map((imageData, index) => (
                <div key={`global-img-${index}`} className="global-image-preview">
                  <img src={imageData} alt="Preview" />
                  <button 
                    className="global-image-remove"
                    onClick={() => removeGlobalImage(index)}
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            
            <button 
              className="global-send-button"
              onClick={sendGlobalMessage}
              disabled={isGlobalLoading || (globalInput.trim() === '' && globalImages.length === 0)}
            >
              {isGlobalLoading ? 'Sending...' : 'Send to All'}
            </button>
          </div>
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
              <div className="chat-header p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 flex items-center">
                <h2 className="font-semibold">{model.name}</h2>
                <div className="flex ml-auto">
                  <button 
                    className="chat-menu-button mr-2" 
                    onClick={() => toggleChatMenu(model.id)}
                    aria-label="Chat menu"
                  >
                    ⋮
                  </button>
                  <button 
                    className="fullscreen-button" 
                    onClick={() => toggleFullscreen(model.id)}
                    aria-label={fullscreenChat === model.id ? "Exit fullscreen" : "Enter fullscreen"}
                  >
                    {fullscreenChat === model.id ? '⊖' : '⊕'}
                  </button>
                </div>
                
                {/* Chat menu */}
                {chats[model.id]?.menuOpen && (
                  <div className="chat-menu">
                    <div 
                      className="chat-menu-item"
                      onClick={() => toggleChatInput(model.id)}
                    >
                      {chats[model.id]?.showInput ? "Hide message input" : "Send message"}
                    </div>
                    {/* Add more menu items here as needed */}
                  </div>
                )}
              </div>
              
              <div className="messages-container flex-grow overflow-y-auto p-3">
                {chats[model.id]?.messages.map((message) => (
                  <div
                    key={message.id || `msg_${model.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`}
                    className={`message ${message.role === 'user' ? 
                      (message.images && message.images.length > 0 ? 'user-message user-message-with-images' : 'user-message') : 
                      message.model ? `system-message model-${message.model.replace(/\./g, '_').replace(/\-/g, '-')}` : 'system-message model-default'}`}
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
                      <div className="text-xs opacity-50" key={`time_${message.id || Date.now()}`}>
                        {formatTimestamp(message.timestamp)}
                      </div>
                      <div className="message-actions">
                        {/* Only show TTS and illustrate buttons for assistant messages */}
                        {message.role === 'assistant' && (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {chats[model.id]?.isLoading && (
                  <div className="message system-message" key={`loading-message-${model.id}`}>
                    <p className="text-xs">Thinking...</p>
                  </div>
                )}
                <div ref={el => messagesEndRefs.current[model.id] = el} />
              </div>
              
              <div className={`input-container h-24 min-h-24 border-t border-gray-200 ${chats[model.id]?.showInput ? 'input-container-visible' : 'input-container-hidden'}`}>
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
