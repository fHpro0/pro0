export async function pro0Plugin(context) {
  console.log('=== PRO0 PLUGIN LOADING ===');
  console.log('Context:', Object.keys(context || {}));
  
  const result = {
    agents: {
      testAgent: {
        mode: 'primary',
        description: 'Test agent to verify plugin loading',
        prompt: 'You are a test agent.',
      },
    },
  };
  
  console.log('=== PRO0 RETURNING:', JSON.stringify(result, null, 2));
  return result;
}

export default pro0Plugin;
