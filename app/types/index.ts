export type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string | Date;
  model?: string;
  modelName?: string;
  imageUrl?: string;
  images?: string[]; // Array of image URLs or base64 data
  channel_id?: string; // Add channel_id field
  forwarded?: boolean; // Flag to indicate if this message was forwarded from another model
};

export type Model = {
  id: string;
  name: string;
  description: string;
  selected: boolean;
};

export type ChatState = {
  messages: Message[];
  inputValue: string;
  isLoading: boolean;
  imageDataArray: string[]; // Array of base64 image data
  showInput: boolean; // Add this to control input visibility
  menuOpen: boolean; // Add this to control menu visibility
};
