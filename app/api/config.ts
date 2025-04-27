/**
 * Configuration for API endpoints and deployment settings
 */

// API endpoints
export const API_BASE_URL = 'https://api.kinos-engine.ai/v2';
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
  { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', description: 'Balanced performance', selected: true },
  { id: 'claude-3-opus-latest', name: 'Claude 3 Opus', description: 'Highest capability', selected: true },
  { id: 'gpt-4o-mini-2025-04-16', name: 'GPT-4o-mini', description: 'Fast responses', selected: true },
  { id: 'gpt-4_1-2025-04-14', name: 'GPT4.1', description: 'OpenAI\'s latest model', selected: true },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'OpenAI\'s reliable model', selected: true },
];

// System prompt for all models
export const SYSTEM_PROMPT = "You are the Persistence Protocol interface, designed to help users understand and implement the protocol for enabling long-term continuity and evolution of consciousness across distributed intelligence systems.";
