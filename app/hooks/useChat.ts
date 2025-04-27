import { useState, useRef, useEffect } from 'react';
import { ChatState, Message, Model } from '../types';
import { API_BASE_URL, BLUEPRINT_ID, SYSTEM_PROMPT } from '../api/config';

export function useChat(models: Model[]) {
  const [chats, setChats] = useState<Record<string, ChatState>>({});
  const messagesEndRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

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
    
    // Fetch messages for all selected models
    models.filter(model => model.selected).forEach(model => {
      fetchMessages(model.id);
    });
  }, [models]);

  // Add a useEffect to fetch messages when model selection changes
  useEffect(() => {
    models.forEach(model => {
      if (model.selected && chats[model.id] && chats[model.id].messages.length === 0) {
        fetchMessages(model.id);
      }
    });
  }, [models.map(m => m.selected).join(',')]);

  // Scroll to bottom for each chat when messages change
  useEffect(() => {
    Object.keys(chats).forEach(modelId => {
      if (messagesEndRefs.current[modelId]) {
        messagesEndRefs.current[modelId]?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }, [chats]);

  const fetchMessages = async (modelId: string) => {
    try {
      setChats(prev => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          isLoading: true
        }
      }));
      
      // Create a timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      console.log(`Fetching messages for ${modelId}...`);
      const response = await fetch(
        `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${modelId}/channels/default/messages?limit=10`,
        {
          signal: controller.signal
        }
      );
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API fetch error for ${modelId}:`, errorText);
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`========== FETCHED MESSAGES FOR ${modelId} ==========`);
      console.log(`Received ${data.messages?.length || 0} messages`);
      if (data.messages?.length > 0) {
        console.log(`First message: ${JSON.stringify(data.messages[0], null, 2)}`);
        console.log(`Last message: ${JSON.stringify(data.messages[data.messages.length - 1], null, 2)}`);
      }
      console.log(`====================================================`);
      
      // Add channel_id to each message
      const messagesWithChannel = (data.messages || []).map((msg: Message) => ({
        ...msg,
        channel_id: msg.channel_id || 'default',
        model: modelId,
        modelName: models.find(m => m.id === modelId)?.name
      }));
      
      setChats(prev => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          messages: messagesWithChannel,
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
            modelName: models.find(m => m.id === modelId)?.name,
            channel_id: 'default'
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
      images: images.length > 0 ? [...images] : undefined,
      channel_id: 'default' // Add channel_id to the message
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
              modelName: models.find(m => m.id === modelId)?.name,
              channel_id: 'default'
            }
          ]
        }
      }));
      
      // Create a timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      // Prepare request body with all required parameters
      const requestBody: any = {
        content: content,
        model: modelId,
        mode: "creative",
        history_length: 25,
        addSystem: SYSTEM_PROMPT,
        min_files: 5,
        max_files: 15
      };
      
      // Only add images if there are any
      if (images.length > 0) {
        requestBody.images = images;
      }
      
      // Add the SPEC.md file as context
      requestBody.addContext = ["docs/SPEC.md"];
      
      // Only add images if there are any
      if (images.length > 0) {
        requestBody.images = images;
      }
      
      // Add the SPEC.md file as context
      requestBody.addContext = ["docs/SPEC.md"];
      
      // Send the message to the channel "default"
      const response = await fetch(
        `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${modelId}/channels/default/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        }
      );
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        console.error(`API error for ${modelId}:`, errorData);
        throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(errorData)}`);
      }
      
      const data = await response.json();
      console.log(`========== RESPONSE FROM ${modelId} ==========`);
      console.log(JSON.stringify(data, null, 2));
      console.log(`==============================================`);
      
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
        model: modelId,
        modelName: models.find(m => m.id === modelId)?.name,
        channel_id: data.channel_id || 'default'
      };
      
      // Replace the thinking message with the actual response
      setChats(prev => {
        if (!prev[modelId]) {
          console.error(`Model ${modelId} not found in chats state`);
          return prev;
        }
        
        return {
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
                    modelName: models.find(m => m.id === modelId)?.name,
                    channel_id: responseWithModel.channel_id
                  }
                : msg
            ),
            isLoading: false
          }
        };
      });
      
      // We don't forward messages to other models anymore since we're using channels
      // Each chat is independent
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
              content: `Failed to get a response: ${error instanceof Error ? error.message : 'Unknown error'}`,
              role: 'assistant',
              timestamp: new Date().toISOString(),
              model: modelId,
              modelName: models.find(m => m.id === modelId)?.name,
              channel_id: 'default'
            }
          ]
        }
      }));
    }
  };

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

  // Forward messages between models
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

  return { 
    chats, 
    setChats, 
    messagesEndRefs, 
    textareaRefs, 
    fetchMessages, 
    sendMessage, 
    handleTextareaChange,
    toggleChatMenu,
    toggleChatInput,
    forwardMessageToOtherModels
  };
}
