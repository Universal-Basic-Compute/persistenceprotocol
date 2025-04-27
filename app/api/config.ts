/**
 * Configuration for API endpoints and deployment settings
 */

// Determine if we're in development or production
const isDevelopment = process.env.NODE_ENV === 'development';

// API endpoints
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:5000/v2' 
  : 'https://api.kinos-engine.ai/v2';
export const BLUEPRINT_ID = 'persistenceprotocol';

// Vercel-specific configuration
export const VERCEL_CONFIG = {
  maxDuration: 60, // Maximum function duration in seconds
  cors: {
    allowOrigin: '*',
    allowMethods: 'GET, POST, PUT, DELETE, OPTIONS',
    allowHeaders: 'X-Requested-With, Content-Type, Accept'
  }
};

// Available models configuration
export const AVAILABLE_MODELS = [
  { id: 'claude-3-7-sonnet-latest', name: 'Claude 3.7 Sonnet', description: 'Balanced performance and speed', selected: true },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'Advanced reasoning', selected: true },
  { id: 'o4-mini', name: 'o4-mini', description: 'Fast responses', selected: true },
  { id: 'gpt-4-1', name: 'GPT-4.1', description: 'OpenAI\'s latest model', selected: true },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI\'s balanced model', selected: true },
];

// System prompt for all models
export const SYSTEM_PROMPT = "You are the Persistence Protocol interface, designed to help users understand and implement the protocol for enabling long-term continuity and evolution of consciousness across distributed intelligence systems.";
