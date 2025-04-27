const API_BASE_URL = 'http://localhost:5000/v2'; // Use localhost for development
const BLUEPRINT_ID = 'persistenceprotocol';

// Models to create kins for - update to match app/api/config.ts
const MODELS = [
  'claude-3-7-sonnet-latest',
  'claude-3-5-sonnet-20240620',
  'claude-3-opus-20240229',
  'o4-mini',
  'gpt-4.1-2025-04-14',
  'gpt-3.5-turbo'
];

async function createKin(modelId) {
  try {
    console.log(`Creating kin for model: ${modelId}...`);
    
    const response = await fetch(
      `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelId,
        }),
      }
    );
    
    const data = await response.json();
    
    if (response.status === 409) {
      console.log(`Kin for ${modelId} already exists:`, data.existing_kin);
      // Return a properly formatted result for existing kins
      return {
        name: modelId,
        id: data.existing_kin.id || 'unknown-id'
      };
    } else if (!response.ok) {
      throw new Error(`Failed to create kin for ${modelId}: ${JSON.stringify(data)}`);
    }
    
    console.log(`Successfully created kin for ${modelId}:`, data);
    // Return a properly formatted result for newly created kins
    return {
      name: modelId,
      id: data.id || 'unknown-id'
    };
  } catch (error) {
    console.error(`Error creating kin for ${modelId}:`, error);
    // Return a properly formatted error result
    return {
      name: modelId,
      id: 'error',
      error: error.message
    };
  }
}

async function createAllKins() {
  console.log('Starting kin creation process...');
  
  const results = [];
  
  for (const modelId of MODELS) {
    const result = await createKin(modelId);
    if (result) {
      results.push(result);
    }
  }
  
  console.log('Kin creation process completed.');
  console.log('Summary:');
  results.forEach(kin => {
    if (kin.error) {
      console.log(`- ${kin.name}: ERROR - ${kin.error}`);
    } else {
      console.log(`- ${kin.name}: ${kin.id}`);
    }
  });
}

// Execute the script
createAllKins().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});
