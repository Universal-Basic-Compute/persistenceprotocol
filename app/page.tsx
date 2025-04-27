'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string | Date;
  model?: string; // Add model information
  modelName?: string; // Add model name for display
};

type Model = {
  id: string;
  name: string;
  description: string;
  selected: boolean; // Add selected state
};

// KinOS API endpoints and configuration
const API_BASE_URL = 'https://api.kinos-engine.ai/v2';
const BLUEPRINT_ID = 'persistenceprotocol'; // Blueprint ID without hyphen
const KIN_ID = 'claude-3-7-sonnet-latest'; // Using model ID as the kin ID

// Available models
const AVAILABLE_MODELS: Model[] = [
  { id: 'claude-3-7-sonnet-latest', name: 'Claude 3.7 Sonnet', description: 'Balanced performance and speed', selected: true },
  { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', description: 'Balanced performance', selected: false },
  { id: 'claude-3-opus-latest', name: 'Claude 3 Opus', description: 'Highest capability', selected: false },
  { id: 'claude-3-haiku-latest', name: 'Claude 3 Haiku', description: 'Fast responses', selected: false },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI\'s latest model', selected: false },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [models, setModels] = useState<Model[]>(AVAILABLE_MODELS);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch initial messages on component mount
  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea as content grows
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [inputValue]);

  const fetchMessages = async () => {
    try {
      // Use the first selected model as the kin ID for fetching messages
      const selectedModel = models.find(model => model.selected)?.id || models[0].id;
      
      const response = await fetch(
        `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${selectedModel}/messages?limit=50`
      );
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Set a default welcome message if API fails
      setMessages([{
        id: 'default_msg',
        content: 'Welcome to the Persistence Protocol interface. How can I assist you today?',
        role: 'assistant',
        timestamp: new Date().toISOString()
      }]);
    }
  };

  // Function to forward messages between models
  const forwardMessageToOtherModels = async (content: string, fromModel: string, isUserMessage: boolean = false) => {
    // Get all selected models except the one that sent the message
    const otherModels = models.filter(model => model.selected && model.id !== fromModel);
    
    if (otherModels.length === 0) return; // No other models to forward to
    
    // Create forwarding promises for all other selected models
    const forwardPromises = otherModels.map(model => {
      // Create a forwarding message that indicates where it came from
      const forwardContent = isUserMessage 
        ? content 
        : `[Message from ${models.find(m => m.id === fromModel)?.name || 'another AI'}]: ${content}`;
      
      return fetch(
        `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${model.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: forwardContent,
            model: model.id,
            mode: 'creative',
            history_length: 25,
            addSystem: "You are the Persistence Protocol interface. You've received a message from another AI model. You can acknowledge it or respond to it as appropriate."
          }),
        }
      )
      .then(response => {
        if (!response.ok) {
          console.error(`Failed to forward message to ${model.name}: ${response.status}`);
        }
        // We don't need to process the response for forwarded messages
        return response.ok;
      })
      .catch(error => {
        console.error(`Error forwarding message to ${model.name}:`, error);
        return false;
      });
    });
    
    // Execute all forwarding requests but don't wait for them
    Promise.all(forwardPromises).then(results => {
      const successCount = results.filter(Boolean).length;
      console.log(`Successfully forwarded message to ${successCount}/${otherModels.length} models`);
    });
  };

  const sendMessage = async (content: string) => {
    if (content.trim() === '') return;
    
    // Get selected models
    const selectedModels = models.filter(model => model.selected);
    
    // If no models are selected, show an error
    if (selectedModels.length === 0) {
      alert('Please select at least one model');
      return;
    }
    
    // Add user message to UI
    const userMessageId = `user_${Date.now()}`;
    const userMessage: Message = {
      id: userMessageId,
      content: content,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    // Also forward the user message to all selected models
    // This ensures all models see the same user input
    forwardMessageToOtherModels(content, '', true);
    
    // Create an array of promises for all selected models
    const modelPromises = selectedModels.map(async model => {
      // Create a "thinking" message for this model
      const thinkingId = `thinking_${model.id}_${Date.now()}`;
      setMessages(prev => [
        ...prev,
        {
          id: thinkingId,
          content: `${model.name} is thinking...`,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          model: model.id,
          modelName: model.name
        }
      ]);
      
      try {
        // Use the model ID as the kin ID for each request
        const response = await fetch(
          `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${model.id}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: content,
              model: model.id,
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
          model: model.id,
          modelName: model.name
        };
        
        // Replace the thinking message with the actual response
        setMessages(prev => 
          prev.map(msg => 
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
        );
        
        // Forward this AI's response to all other selected models
        if (responseWithModel.content) {
          forwardMessageToOtherModels(responseWithModel.content, model.id);
        }
        
        return responseWithModel;
      } catch (error) {
        console.error(`Error with model ${model.name}:`, error);
        
        // Replace the thinking message with an error message
        setMessages(prev => 
          prev.map(msg => 
            msg.id === thinkingId 
              ? {
                  id: `error_${model.id}_${Date.now()}`,
                  content: `${model.name} failed to respond: ${error.message}`,
                  role: 'assistant',
                  timestamp: new Date().toISOString(),
                  model: model.id,
                  modelName: model.name
                }
              : msg
          )
        );
        
        return null;
      }
    });
    
    // Wait for all model responses to complete (but we've already shown them in the UI)
    try {
      await Promise.all(modelPromises);
    } catch (error) {
      console.error('Error processing model responses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    sendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

  const toggleModel = (modelId: string) => {
    setModels(prevModels => 
      prevModels.map(model => 
        model.id === modelId 
          ? { ...model, selected: !model.selected } 
          : model
      )
    );
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
      
      {/* Main Content */}
      <div className={`chat-container p-4 sm:p-6 ${menuOpen ? 'content-with-menu' : 'content-without-menu'}`}>
        <h1 className="text-2xl font-semibold mb-6 text-center">Persistence Protocol</h1>
        
        <div className="messages-container mb-4">
          {messages.map((message) => (
            <div
              key={message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`}
              className={`message ${message.role === 'user' ? 'user-message' : 'system-message'}`}
            >
              {/* Add model name for assistant messages */}
              {message.role === 'assistant' && message.model && (
                <div className="text-xs font-bold mb-1" key={`model_${message.id || Date.now()}`}>
                  {models.find(m => m.id === message.model)?.name || message.modelName || 'AI'}
                </div>
              )}
              <p className="whitespace-pre-wrap">{message.content}</p>
              <div className="text-xs opacity-50 mt-1" key={`time_${message.id || Date.now()}`}>
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message system-message" key="loading-message">
              <p>Thinking...</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="input-container">
          <textarea
            ref={textareaRef}
            className="message-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here..."
            rows={1}
            disabled={isLoading}
          />
          <button 
            className="send-button" 
            onClick={handleSendMessage}
            disabled={isLoading || inputValue.trim() === ''}
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}
