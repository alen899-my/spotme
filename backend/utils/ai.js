const axios = require('axios');
require('dotenv').config({ path: __dirname + '/../.env' });

/**
 * Call AI via OpenRouter using openrouter/free (auto-routes to best free model)
 * @param {string} prompt - The text prompt
 * @param {string} imageUrl - Optional image URL for vision models
 * @param {string} model - Optional specific model override (defaults to 'openrouter/free')
 * @param {object} options - Additional options (max_tokens, temperature, etc.)
 */
async function callAI(prompt, imageUrl = null, model = null, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not defined in .env');
  }

  const content = [];
  if (imageUrl) {
    content.push({ type: 'image_url', image_url: { url: imageUrl } });
  }
  content.push({ type: 'text', text: prompt });

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: model || 'openrouter/free',
      messages: [{ role: 'user', content }],
      max_tokens: options.max_tokens || 2000,
      temperature: options.temperature ?? 0,
      ...options,
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://spotme.app',
        'X-Title': 'SpotMe AI',
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.choices[0].message.content;
}

module.exports = { callAI };