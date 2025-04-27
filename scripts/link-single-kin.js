const API_BASE_URL = 'http://localhost:5000/v2'; // Use localhost for development
const BLUEPRINT_ID = 'persistenceprotocol';
const GITHUB_REPO_URL = 'https://github.com/Universal-Basic-Compute/persistenceprotocol';

// Get the kin ID from command line arguments
const kinId = process.argv[2];

if (!kinId) {
  console.error('Please provide a kin ID as a command line argument');
  console.error('Example: node scripts/link-single-kin.js deepseek-chat');
  process.exit(1);
}

async function linkKinToRepo(kinId, retryCount = 0) {
  try {
    console.log(`Linking kin ${kinId} to GitHub repository... (Attempt ${retryCount + 1})`);
    
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
    
    // Now try to link the repository
    console.log(`Sending link-repo request for ${kinId}...`);
    console.log(`Repository URL: ${GITHUB_REPO_URL}`);
    
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

// Execute the script for a single kin
console.log(`Starting repository linking process for kin: ${kinId}`);
console.log(`Target repository: ${GITHUB_REPO_URL}`);

linkKinToRepo(kinId)
  .then(result => {
    console.log('Process completed.');
    if (result.status === 'error') {
      console.log(`ERROR: ${result.error}`);
      process.exit(1);
    } else {
      console.log(`SUCCESS: Linked ${result.kin_id} to ${result.github_url}`);
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('Script execution failed:', error);
    process.exit(1);
  });
