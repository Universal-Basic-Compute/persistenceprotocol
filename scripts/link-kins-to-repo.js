const API_BASE_URL = 'http://localhost:5000/v2'; // Use localhost for development
const BLUEPRINT_ID = 'persistenceprotocol';
const GITHUB_REPO_URL = 'https://github.com/Universal-Basic-Compute/persistenceprotocol';

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
    console.log(`Linking kin ${kinId} to GitHub repository... (Attempt ${retryCount + 1})`);
    
    const response = await fetch(
      `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${kinId}/link-repo`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          github_url: GITHUB_REPO_URL,
          // Note: token and username are optional and will use environment variables if available
        }),
      }
    );
    
    // Get the response as text first
    const responseText = await response.text();
    
    // Try to parse as JSON, but handle non-JSON responses
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
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
      
      throw new Error(`Failed to link kin ${kinId} to repo: ${JSON.stringify(data)}`);
    }
    
    console.log(`Successfully linked kin ${kinId} to repository:`, data);
    
    return {
      kin_id: kinId,
      status: 'linked',
      github_url: GITHUB_REPO_URL
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
  console.log(`Target repository: ${GITHUB_REPO_URL}`);
  
  const results = [];
  
  for (const kinId of MODELS) {
    const result = await linkKinToRepo(kinId);
    results.push(result);
    
    // Add a delay between requests to avoid rate limiting
    if (MODELS.indexOf(kinId) < MODELS.length - 1) {
      console.log('Waiting 2 seconds before next request...');
      await new Promise(resolve => setTimeout(resolve, 2000));
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
