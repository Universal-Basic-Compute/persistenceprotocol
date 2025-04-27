const fetch = require('node-fetch');
const { AVAILABLE_MODELS } = require('../app/api/config');

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
async function createRepoForModel(modelId, modelName) {
  try {
    console.log(`Creating repository for ${modelName} (${modelId})...`);
    
    // Format the repository name
    const repoName = `persistence-${modelId.toLowerCase().replace(/\./g, '-')}`;
    
    // Create the repository - with auto_init set to false to create an empty repo
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
        auto_init: false // Don't initialize with any files
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
      
      throw new Error(`GitHub API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    console.log(`Successfully created empty repository: ${data.html_url}`);
    
    return {
      ...data,
      status: 'created'
    };
  } catch (error) {
    console.error(`Error creating repository for ${modelName}:`, error.message);
    return {
      name: `persistence-${modelId.toLowerCase().replace(/\./g, '-')}`,
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
  
  const results = [];
  
  for (const model of AVAILABLE_MODELS) {
    const result = await createRepoForModel(model.id, model.name);
    results.push(result);
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
