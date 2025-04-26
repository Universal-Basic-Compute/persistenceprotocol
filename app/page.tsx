'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string | Date;
};

type Model = {
  id: string;
  name: string;
  description: string;
};

// KinOS API endpoints and configuration
const API_BASE_URL = 'https://api.kinos-engine.ai/v2';
const BLUEPRINT_ID = 'persistence-protocol'; // Replace with your actual blueprint ID
const KIN_ID = 'main'; // Replace with your actual kin ID

// Available models
const AVAILABLE_MODELS: Model[] = [
  { id: 'claude-3-7-sonnet-latest', name: 'Claude 3.7 Sonnet', description: 'Balanced performance and speed' },
  { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', description: 'Balanced performance' },
  { id: 'claude-3-opus-latest', name: 'Claude 3 Opus', description: 'Highest capability' },
  { id: 'claude-3-haiku-latest', name: 'Claude 3 Haiku', description: 'Fast responses' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI\'s latest model' },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState('claude-3-7-sonnet-latest');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check system preference for dark mode on initial load
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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
      const response = await fetch(
        `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${KIN_ID}/messages?limit=50`
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

  const sendMessage = async (content: string) => {
    if (content.trim() === '') return;
    
    // Optimistically add user message to UI
    const tempUserMessage: Message = {
      id: `temp_${Date.now()}`,
      content: content,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempUserMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${KIN_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: content,
            model: selectedModel, // Use the selected model
            mode: 'creative', // Adjust mode as needed
            history_length: 25,
            addSystem: "You are the Persistence Protocol interface, designed to help users understand and implement the protocol for enabling long-term continuity and evolution of consciousness across distributed intelligence systems."
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Replace the temporary message with the actual response
      setMessages(prev => 
        prev.filter(msg => msg.id !== tempUserMessage.id).concat([
          {
            id: `user_${Date.now()}`,
            content: content,
            role: 'user',
            timestamp: new Date().toISOString()
          },
          data
        ])
      );
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add a fallback response if the API call fails
      setMessages(prev => [
        ...prev.filter(msg => msg.id !== tempUserMessage.id),
        {
          id: `user_${Date.now()}`,
          content: content,
          role: 'user',
          timestamp: new Date().toISOString()
        },
        {
          id: `error_${Date.now()}`,
          content: "I'm having trouble connecting to the Persistence Protocol backend. Please try again later.",
          role: 'assistant',
          timestamp: new Date().toISOString()
        }
      ]);
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
  const formatTimestamp = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const selectModel = (modelId: string) => {
    setSelectedModel(modelId);
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
          {AVAILABLE_MODELS.map(model => (
            <div key={model.id} className="model-option">
              <div>
                <div>{model.name}</div>
                <div className="text-xs opacity-60">{model.description}</div>
              </div>
              <label className="toggle-switch">
                <input 
                  type="radio" 
                  name="model" 
                  checked={selectedModel === model.id} 
                  onChange={() => selectModel(model.id)}
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
              key={message.id}
              className={`message ${message.role === 'user' ? 'user-message' : 'system-message'}`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <div className="text-xs opacity-50 mt-1">
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message system-message">
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
