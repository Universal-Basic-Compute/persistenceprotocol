'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string | Date;
};

// KinOS API endpoints and configuration
const API_BASE_URL = 'https://api.kinos-engine.ai/v2';
const BLUEPRINT_ID = 'persistence-protocol'; // Replace with your actual blueprint ID
const KIN_ID = 'main'; // Replace with your actual kin ID

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
            model: 'claude-3-7-sonnet-latest', // You can adjust the model as needed
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

  return (
    <div className="chat-container p-4 sm:p-6">
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
  );
}
