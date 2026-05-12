const axios = require('axios');
require('dotenv').config({ path: __dirname + '/../.env' });

/**
 * Common AI utility to call models via OpenRouter
 * @param {string} prompt - The text prompt
 * @param {string} imageUrl - Optional image URL for vision models
 * @param {string} model - The model to use (defaults to minimax/minimax-01)
 * @param {object} options - Additional OpenRouter options
 */
async function callAI(prompt, imageUrl = null, model = 'minimax/minimax-01', options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not defined in .env');
  }

  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt }
      ]
    }
  ];

  if (imageUrl) {
    messages[0].content.push({
      type: 'image_url',
      image_url: { url: imageUrl }
    });
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: model,
        messages: messages,
        max_tokens: 2000,
        ...options
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://spotme.app', // Optional, for OpenRouter tracking
          'X-Title': 'SpotMe AI', // Optional
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('AI call failed:', error.response?.data || error.message);
    throw new Error('AI analysis failed');
  }
}

module.exports = { callAI };
