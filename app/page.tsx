'use client';

import React, { useState, useRef, useEffect } from 'react';
import Button from './components/Button';
import SideMenu from './components/SideMenu';
import GlobalInput from './components/GlobalInput';
import ChatGrid from './components/ChatGrid';
import { useModels } from './hooks/useModels';
import { useChat } from './hooks/useChat';
import { API_BASE_URL, BLUEPRINT_ID, SYSTEM_PROMPT } from './api/config';
import { Message } from './types';

export default function Home() {
  const { models, toggleModel } = useModels();
  const { chats, setChats, messagesEndRefs, textareaRefs, sendMessage, handleTextareaChange, toggleChatMenu, toggleChatInput } = useChat(models);
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [fullscreenChat, setFullscreenChat] = useState<string | null>(null);
  const [globalInput, setGlobalInput] = useState('');
  const [globalImages, setGlobalImages] = useState<string[]>([]);
  const [isGlobalInputCollapsed, setIsGlobalInputCollapsed] = useState(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
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

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const toggleFullscreen = (modelId: string) => {
    if (fullscreenChat === modelId) {
      setFullscreenChat(null);
    } else {
      setFullscreenChat(modelId);
    }
  };

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

  const generateImage = async (text: string, messageId: string) => {
    try {
      // Set loading state for this message
      setGeneratingImage(messageId);
      
      // Extract the model ID safely
      let targetModelId;
      
      if (messageId && typeof messageId === 'string') {
        const modelIdParts = messageId.split('_');
        if (modelIdParts.length > 1) {
          targetModelId = modelIdParts[1];
        }
      }
      
      // If we couldn't extract the model ID, use the first selected model
      if (!targetModelId) {
        const firstSelectedModel = models.find(m => m.selected);
        if (firstSelectedModel) {
          targetModelId = firstSelectedModel.id;
        } else {
          throw new Error('No selected models available for image generation');
        }
      }
      
      // Check if the chat state exists for this model
      if (!chats[targetModelId]) {
        throw new Error(`Chat state not found for model ${targetModelId}`);
      }
      
      console.log(`Generating image with prompt: "${text.substring(0, 100)}..."`);
      console.log(`Using model: ${targetModelId}`);
      
      // Update the request body to match the expected format
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
        const errorText = await response.text();
        console.error(`Image generation failed with status ${response.status}: ${errorText}`);
        throw new Error(`Image generation failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Image generation response:", data);
      
      // Check if the response has the expected structure
      if (!data.data || !data.data.url) {
        console.error("Invalid image response format:", data);
        throw new Error("Invalid image response format");
      }
      
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
      
      // Show error message to the user
      alert(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      setGeneratingImage(null);
    }
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
      images: globalImages.length > 0 ? [...globalImages] : undefined,
      channel_id: 'default'
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
                modelName: model.name,
                channel_id: 'default'
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
        
        // Send the message to the API with images using the channel endpoint
        const response = await fetch(
          `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${model.id}/channels/default/messages`,
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
          console.error(`API error for ${model.id}:`, errorData);
          throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(errorData)}`);
        }
        
        const data = await response.json();
        console.log(`========== GLOBAL RESPONSE FROM ${model.id} ==========`);
        console.log(JSON.stringify(data, null, 2));
        console.log(`====================================================`);
        
        // Check if the response has content in different possible locations
        let responseContent = "No response content received";
        if (data.content) {
          responseContent = data.content;
        } else if (data.message && data.message.content) {
          responseContent = data.message.content;
        } else if (data.response && data.response.content) {
          responseContent = data.response.content;
        } else if (typeof data === 'string') {
          responseContent = data;
        } else if (data.text) {
          responseContent = data.text;
        } else if (data.status === 'completed' || data.status === 'success') {
          responseContent = "Request processed successfully, but no content was returned.";
        }
        
        // Add model information to the response
        const responseWithModel = {
          ...data,
          content: responseContent, // Use our extracted content
          model: model.id,
          modelName: model.name,
          channel_id: data.channel_id || 'default'
        };
        
        // Replace the thinking message with the actual response
        setChats(prev => {
          if (!prev[model.id]) {
            console.error(`Model ${model.id} not found in chats state`);
            return prev;
          }
          
          return {
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
                      modelName: model.name,
                      channel_id: responseWithModel.channel_id
                    }
                  : msg
              )
            }
          };
        });
        
        // Now add this model's response to all other selected models using add-message
        const otherModels = selectedModels.filter(m => m.id !== model.id);
        
        if (otherModels.length > 0) {
          // Create a message that indicates which model generated this response
          const forwardMessage = {
            message: `[Message sent by ${model.name} in the conversation at ${new Date().toLocaleString()}]: ${responseContent}`,
            role: "assistant",
            metadata: {
              source: "global_message",
              original_model: model.id,
              original_message_id: responseWithModel.id || thinkingId
            }
          };
          
          // Send this response to all other models using add-message
          const forwardPromises = otherModels.map(otherModel => 
            fetch(
              `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${otherModel.id}/add-message`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(forwardMessage),
              }
            )
            .then(response => {
              if (!response.ok) {
                console.error(`Failed to forward message to ${otherModel.name}: ${response.status}`);
              }
              return response.ok;
            })
            .catch(error => {
              console.error(`Error forwarding message to ${otherModel.name}:`, error);
              return false;
            })
          );
          
          // Execute all forwarding requests
          const forwardResults = await Promise.all(forwardPromises);
          console.log(`Forwarded response to ${forwardResults.filter(Boolean).length}/${otherModels.length} other models`);
          
          // Update the UI to show the forwarded messages in other chats
          otherModels.forEach(otherModel => {
            const forwardedMessageId = `forwarded_${model.id}_to_${otherModel.id}_${Date.now()}`;
            setChats(prev => ({
              ...prev,
              [otherModel.id]: {
                ...prev[otherModel.id],
                messages: [
                  ...prev[otherModel.id].messages,
                  {
                    id: forwardedMessageId,
                    content: `[Message sent by ${model.name} in the conversation at ${new Date().toLocaleString()}]: ${responseContent}`,
                    role: 'assistant',
                    timestamp: new Date().toISOString(),
                    model: model.id, // Keep track of the original model
                    modelName: model.name, // Keep track of the original model name
                    channel_id: 'default',
                    forwarded: true // Mark as forwarded message
                  }
                ]
              }
            }));
          });
        }
        
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
    <div className="app-container">
      {/* Menu Toggle Button */}
      <Button 
        variant="ghost"
        size="sm"
        className="menu-toggle" 
        onClick={toggleMenu}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
      >
        {menuOpen ? "×" : "≡"}
      </Button>
      
      {/* Side Menu */}
      <SideMenu 
        menuOpen={menuOpen}
        darkMode={darkMode}
        models={models}
        toggleDarkMode={toggleDarkMode}
        toggleModel={toggleModel}
      />
      
      {/* Global Input Chat */}
      <GlobalInput 
        globalInput={globalInput}
        globalImages={globalImages}
        isGlobalInputCollapsed={isGlobalInputCollapsed}
        isGlobalLoading={isGlobalLoading}
        onInputChange={handleGlobalInputChange}
        onImageUpload={handleGlobalImageUpload}
        onImageRemove={removeGlobalImage}
        onToggleCollapse={toggleGlobalInput}
        onSend={sendGlobalMessage}
        onKeyDown={handleGlobalKeyDown}
        textareaRef={globalTextareaRef}
      />
      
      {/* Main Content - Grid of Chats */}
      <div className={`p-4 sm:p-6 ${menuOpen ? 'content-with-menu' : 'content-without-menu'}`}>
        <h1 className="text-2xl font-semibold mb-6 text-center">Persistence Protocol</h1>
        
        <ChatGrid 
          models={models}
          chats={chats}
          messagesEndRefs={messagesEndRefs}
          textareaRefs={textareaRefs}
          fullscreenChat={fullscreenChat}
          playingAudio={playingAudio}
          generatingImage={generatingImage}
          handleTextareaChange={handleTextareaChange}
          toggleChatMenu={toggleChatMenu}
          toggleChatInput={toggleChatInput}
          toggleFullscreen={toggleFullscreen}
          sendMessage={sendMessage}
          handleImageUpload={handleImageUpload}
          removeImage={removeImage}
          setPlayingAudio={setPlayingAudio}
          generateImage={generateImage}
        />
      </div>
    </div>
  );
}
