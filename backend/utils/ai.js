const axios = require('axios');
require('dotenv').config({ path: __dirname + '/../.env' });

/**
 * Common AI utility to call models via OpenRouter or Groq
 * @param {string} prompt - The text prompt
 * @param {string} imageUrl - Optional image URL for vision models
 * @param {string} model - The model to use
 * @param {object} options - Additional options
 */
async function callAI(prompt, imageUrl = null, model = null, options = {}) {
  // ── Groq path: image vision OR explicit text-only Groq request ─────────────
  const groqKey = process.env.GROQ_API_KEY;

  // Text-only Groq call (default when no image and groq key exists)
  if (!imageUrl && groqKey && (!model || model === 'groq' || model === 'groq-text')) {
    try {
      const messages = [{ role: 'user', content: prompt }];
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages,
          temperature: 0.3,
          max_tokens: 4096,
          ...options
        },
        {
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );
      return response.data.choices[0].message.content;
    } catch (error) {
      // Fall through to OpenRouter logic below
    }
  }

  // Image vision via Groq
  if (imageUrl && groqKey && (!model || model.includes('groq') || model === 'vision')) {
    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: { url: imageUrl }
                }
              ]
            }
          ],
          temperature: 0.2,
          max_tokens: 2048,
          response_format: { type: 'json_object' }, // Llama-4 Scout supports JSON mode!
          ...options
        },
        {
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );
      return response.data.choices[0].message.content;
    } catch (error) {
      // Fall through to OpenRouter logic below
    }
  }

  // Fallback / Default: OpenRouter
  const orApiKey = process.env.OPENROUTER_API_KEY;
  if (!orApiKey) {
    throw new Error('No AI API keys defined in .env');
  }

  // Use a stable vision model for OpenRouter
  const orModel = model || (imageUrl ? 'openrouter/free' : 'minimax/minimax-01');

  const contentParts = [];
  if (imageUrl) {
    contentParts.push({
      type: 'image_url',
      image_url: { url: imageUrl },
    });
  }
  contentParts.push({ type: 'text', text: prompt });

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: orModel,
        messages: [{ role: 'user', content: contentParts }],
        max_tokens: 2000,
        temperature: 0,
        ...options
      },
      {
        headers: {
          'Authorization': `Bearer ${orApiKey}`,
          'HTTP-Referer': 'https://spotme.app',
          'X-Title': 'SpotMe AI',
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('AI call failed:', error.response?.data || error.message);
    throw new Error('AI analysis failed');
  }
}

module.exports = { callAI };
