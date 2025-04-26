
const API_BASE_URL = 'https://api.kinos-engine.ai/v2';
const BLUEPRINT_ID = 'persistenceprotocol';

// Models to create kins for
const MODELS = [
  'claude-3-7-sonnet-latest',
  'claude-3-5-sonnet-latest',
  'claude-3-opus-latest',
  'claude-3-haiku-latest',
  'gpt-4o'
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
      return data.existing_kin;
    } else if (!response.ok) {
      throw new Error(`Failed to create kin for ${modelId}: ${JSON.stringify(data)}`);
    }
    
    console.log(`Successfully created kin for ${modelId}:`, data);
    return data;
  } catch (error) {
    console.error(`Error creating kin for ${modelId}:`, error);
    return null;
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
    console.log(`- ${kin.name}: ${kin.id}`);
  });
}

// Execute the script
createAllKins().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});
