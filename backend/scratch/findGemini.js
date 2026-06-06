const axios = require('axios');

async function test() {
  try {
    console.log('Fetching OpenRouter models...');
    const res = await axios.get('https://openrouter.ai/api/v1/models');
    const geminiModels = res.data.data
      .filter(m => m.id.includes('gemini') || m.id.includes('llama-3.3') || m.id.includes('llama-3.1'))
      .map(m => ({
        id: m.id,
        name: m.name,
        prompt_price: m.pricing?.prompt || '0',
        completion_price: m.pricing?.completion || '0'
      }));
    console.log('Matching Models:', geminiModels);
  } catch (err) {
    console.error('Error fetching models:', err.message);
  }
}

test();
