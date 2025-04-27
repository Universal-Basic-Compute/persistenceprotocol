const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Read the config file directly instead of importing it
const configPath = path.join(__dirname, '../app/api/config.ts');
const configContent = fs.readFileSync(configPath, 'utf8');

// Extract AVAILABLE_MODELS from the config file using regex
const modelsMatch = configContent.match(/export const AVAILABLE_MODELS = \[([\s\S]*?)\];/);
let AVAILABLE_MODELS = [];

if (modelsMatch && modelsMatch[1]) {
  // Parse the models array from the string
  const modelsString = modelsMatch[1];
  
  // Extract each model object using regex
  const modelRegex = /{\s*id:\s*['"]([^'"]+)['"]\s*,\s*name:\s*['"]([^'"]+)['"]\s*,\s*description:\s*['"]([^'"]+)['"]\s*,\s*selected:\s*(true|false)\s*}/g;
  let match;
  
  while ((match = modelRegex.exec(modelsString)) !== null) {
    AVAILABLE_MODELS.push({
      id: match[1],
      name: match[2],
      description: match[3],
      selected: match[4] === 'true'
    });
  }
}

// If we couldn't extract models, use a fallback
if (AVAILABLE_MODELS.length === 0) {
  console.warn('Could not extract models from config file. Using fallback models.');
  AVAILABLE_MODELS = [
    { id: 'claude-3-7-sonnet-latest', name: 'Claude 3.7 Sonnet', description: 'Balanced performance and speed', selected: true },
    { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'Advanced reasoning', selected: true },
    { id: 'o4-mini', name: 'o4-mini', description: 'Fast responses', selected: true },
    { id: 'gpt-4-1', name: 'GPT-4.1', description: 'OpenAI\'s latest model', selected: true },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI\'s balanced model', selected: true },
  ];
}

// GitHub configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // You'll need to set this environment variable
const GITHUB_ORG = 'Universal-Basic-Compute';

// Check if GitHub token is provided
if (!GITHUB_TOKEN) {
  console.error('Error: GITHUB_TOKEN environment variable is not set.');
  console.error('Please set the GITHUB_TOKEN environment variable with a valid GitHub personal access token.');
  console.error('Example: GITHUB_TOKEN=your_token node scripts/create-model-repos.js');
  process.exit(1);
}

/**
 * Creates a GitHub repository for a model
 * @param {string} modelId - The model ID
 * @param {string} modelName - The model name
 * @returns {Promise<Object>} - The repository data
 */
async function createRepoForModel(modelId, modelName, retryCount = 0) {
  try {
    console.log(`Creating repository for ${modelName} (${modelId})...`);
    
    // Format the repository name
    const repoName = `persistenceprotocol_${modelId.toLowerCase().replace(/\./g, '-')}`;
    
    // Check if the repository already exists
    try {
      const checkResponse = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${repoName}`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (checkResponse.ok) {
        console.log(`Repository ${repoName} already exists. Skipping.`);
        return { 
          name: repoName, 
          html_url: `https://github.com/${GITHUB_ORG}/${repoName}`,
          status: 'exists'
        };
      }
    } catch (error) {
      console.log(`Error checking if repository exists: ${error.message}`);
    }
    
    // Create the repository - with auto_init set to true to initialize with README
    const response = await fetch(`https://api.github.com/orgs/${GITHUB_ORG}/repos`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: repoName,
        description: `Persistence Protocol implementation for ${modelName}`,
        private: false,
        has_issues: true,
        has_projects: true,
        has_wiki: true,
        auto_init: true // Initialize with README
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      
      // If repository already exists, don't treat as an error
      if (errorData.errors && errorData.errors.some(err => err.message.includes('already exists'))) {
        console.log(`Repository ${repoName} already exists. Skipping.`);
        return { 
          name: repoName, 
          html_url: `https://github.com/${GITHUB_ORG}/${repoName}`,
          status: 'exists'
        };
      }
      
      // If we get a rate limit error, retry with backoff
      if (response.status === 403 && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`Rate limited. Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return createRepoForModel(modelId, modelName, retryCount + 1);
      }
      
      throw new Error(`GitHub API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    console.log(`Successfully created repository: ${data.html_url}`);
    
    return {
      ...data,
      status: 'created'
    };
  } catch (error) {
    console.error(`Error creating repository for ${modelName}:`, error.message);
    return {
      name: `persistenceprotocol_${modelId.toLowerCase().replace(/\./g, '-')}`,
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Creates repositories for all models
 */
async function createAllModelRepos() {
  console.log('Starting repository creation process...');
  console.log(`Target organization: ${GITHUB_ORG}`);
  console.log(`Found ${AVAILABLE_MODELS.length} models in config:`);
  AVAILABLE_MODELS.forEach(model => {
    console.log(`- ${model.id}: ${model.name}`);
  });
  
  const results = [];
  
  for (const model of AVAILABLE_MODELS) {
    const result = await createRepoForModel(model.id, model.name);
    results.push(result);
    
    // Add a delay between requests to avoid rate limiting
    if (AVAILABLE_MODELS.indexOf(model) < AVAILABLE_MODELS.length - 1) {
      console.log('Waiting 5 seconds before next request...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log('Repository creation process completed.');
  console.log('Summary:');
  results.forEach(repo => {
    if (repo.status === 'error') {
      console.log(`- ${repo.name}: ERROR - ${repo.error}`);
    } else {
      console.log(`- ${repo.name}: ${repo.status} - ${repo.html_url}`);
    }
  });
}

// Execute the script
createAllModelRepos().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});
