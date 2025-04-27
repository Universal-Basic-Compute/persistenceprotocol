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

async function linkKinToRepo(kinId) {
  try {
    console.log(`Linking kin ${kinId} to GitHub repository...`);
    
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
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
      throw new Error(`Failed to link kin ${kinId} to repo: ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    console.log(`Successfully linked kin ${kinId} to repository:`, data);
    
    return {
      kin_id: kinId,
      status: 'linked',
      github_url: GITHUB_REPO_URL
    };
  } catch (error) {
    console.error(`Error linking kin ${kinId} to repository:`, error);
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
