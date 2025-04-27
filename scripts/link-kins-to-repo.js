const API_BASE_URL = 'http://localhost:5000/v2'; // Use localhost for development
const BLUEPRINT_ID = 'persistenceprotocol';

// Function to generate model-specific repository URLs
function getRepoUrlForModel(modelId) {
  return `https://github.com/Universal-Basic-Compute/persistenceprotocol_${modelId}.git`;
}

// Models to link kins for - match with app/api/config.ts
const MODELS = [
  'claude-3-7-sonnet-latest',
  'deepseek-chat',
  'o4-mini',
  'gpt-4-1',
  'gpt-4o'
];

async function linkKinToRepo(kinId, retryCount = 0) {
  try {
    const repoUrl = getRepoUrlForModel(kinId);
    console.log(`Linking kin ${kinId} to GitHub repository: ${repoUrl}... (Attempt ${retryCount + 1})`);
    
    // First, check if the kin exists
    console.log(`Checking if kin ${kinId} exists...`);
    const checkResponse = await fetch(
      `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${kinId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    
    if (!checkResponse.ok) {
      console.log(`Kin ${kinId} does not exist or cannot be accessed. Status: ${checkResponse.status}`);
      // Try to create the kin first
      console.log(`Attempting to create kin ${kinId} before linking...`);
      const createResponse = await fetch(
        `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: kinId,
            id: kinId,
          }),
        }
      );
      
      const createResponseText = await createResponse.text();
      console.log(`Create kin response for ${kinId}: ${createResponseText}`);
      
      if (!createResponse.ok) {
        console.error(`Failed to create kin ${kinId}: ${createResponseText}`);
        throw new Error(`Cannot link repository: Kin ${kinId} does not exist and could not be created`);
      }
      
      console.log(`Successfully created kin ${kinId}, proceeding with linking...`);
    } else {
      console.log(`Kin ${kinId} exists, proceeding with linking...`);
    }
    
    // Skip repository creation since repositories already exist
    console.log(`Using existing repository for ${kinId}: ${repoUrl}`);
    
    // Now try to link the repository
    console.log(`Sending link-repo request for ${kinId}...`);
    console.log(`Repository URL: ${repoUrl}`);
    
    const response = await fetch(
      `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${kinId}/link-repo`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          github_url: repoUrl,
          use_local_git: true, // Use local git credentials instead of explicit token
        }),
      }
    );
    
    // Get the response as text first
    const responseText = await response.text();
    console.log(`Raw response for ${kinId}: ${responseText}`);
    
    // Try to parse as JSON, but handle non-JSON responses
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.log(`Response is not valid JSON: ${e.message}`);
      data = { text: responseText };
    }
    
    if (!response.ok) {
      // If we get a 429 (Too Many Requests) or 503 (Service Unavailable), retry
      if ((response.status === 429 || response.status === 503) && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`Rate limited or service unavailable. Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return linkKinToRepo(kinId, retryCount + 1);
      }
      
      console.error(`Failed to link repository for ${kinId}. Status: ${response.status}`);
      throw new Error(`Failed to link kin ${kinId} to repo: ${JSON.stringify(data)}`);
    }
    
    console.log(`Successfully linked kin ${kinId} to repository:`, data);
    
    return {
      kin_id: kinId,
      status: 'linked',
      github_url: repoUrl
    };
  } catch (error) {
    console.error(`Error linking kin ${kinId} to repository:`, error);
    
    // If we haven't reached max retries, try again
    if (retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      console.log(`Error occurred. Retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return linkKinToRepo(kinId, retryCount + 1);
    }
    
    return {
      kin_id: kinId,
      status: 'error',
      error: error.message
    };
  }
}

async function linkAllKins() {
  console.log('Starting kin-repository linking process...');
  console.log('Each model will be linked to its own repository:');
  MODELS.forEach(modelId => {
    console.log(`- ${modelId}: ${getRepoUrlForModel(modelId)}`);
  });
  
  const results = [];
  
  for (const kinId of MODELS) {
    const result = await linkKinToRepo(kinId);
    results.push(result);
    
    // Add a longer delay between requests to avoid rate limiting
    if (MODELS.indexOf(kinId) < MODELS.length - 1) {
      console.log('Waiting 5 seconds before next request...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log('Kin-repository linking process completed.');
  console.log('Summary:');
  results.forEach(result => {
    if (result.status === 'error') {
      console.log(`- ${result.kin_id}: ERROR - ${result.error}`);
    } else {
      console.log(`- ${result.kin_id}: Successfully linked to ${result.github_url}`);
    }
  });
}

// Execute the script
linkAllKins().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});
