const axios = require('axios');

async function test() {
  try {
    console.log('Fetching OpenRouter models...');
    const res = await axios.get('https://openrouter.ai/api/v1/models');
    const freeModels = res.data.data
      .filter(m => m.id.includes(':free') || (m.pricing && parseFloat(m.pricing.prompt) === 0))
      .map(m => m.id);
    console.log('Free OpenRouter Models:', freeModels);
  } catch (err) {
    console.error('Error fetching models:', err.message);
  }
}

test();
