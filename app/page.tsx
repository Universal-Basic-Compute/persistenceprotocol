'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
  id: string;
  content: string;
  sender: 'user' | 'system';
  timestamp: Date;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Welcome to the Persistence Protocol interface. How can I assist you today?',
      sender: 'system',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  const handleSendMessage = () => {
    if (inputValue.trim() === '') return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Simulate system response (replace with actual API call later)
    setTimeout(() => {
      const systemMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I'm processing your request about the Persistence Protocol. This system is designed to enable long-term continuity and evolution of consciousness across distributed intelligence systems.`,
        sender: 'system',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chat-container p-4 sm:p-6">
      <h1 className="text-2xl font-semibold mb-6 text-center">Persistence Protocol</h1>
      
      <div className="messages-container mb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.sender === 'user' ? 'user-message' : 'system-message'}`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
            <div className="text-xs opacity-50 mt-1">
              {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
          </div>
        ))}
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
        />
        <button className="send-button" onClick={handleSendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}
