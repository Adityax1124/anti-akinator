const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const providers = [];

// Groq
if (process.env.GROQ_API_KEY) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  providers.push({
    name: 'groq',
    call: async (messages) => {
      const response = await groq.chat.completions.create({
        messages,
        model: 'llama-3.1-8b-instant',
        temperature: 0.1,
        max_tokens: 10
      });
      return response.choices[0].message.content;
    }
  });
}

// Gemini
if (process.env.GEMINI_API_KEY) {
  const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  providers.push({
    name: 'gemini',
    call: async (messages) => {
      const model = gemini.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const result = await model.generateContent(prompt);
      return result.response.text();
    }
  });
}

// Mistral – Using Dynamic Import (ESM Fix)
if (process.env.MISTRAL_API_KEY) {
  providers.push({
    name: 'mistral',
    call: async (messages) => {
      // Dynamic import for ESM module
      const { Mistral } = await import('@mistralai/mistralai');
      const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
      const response = await mistral.chat.completions.create({
        messages,
        model: 'mistral-small-latest',
        temperature: 0.1,
        max_tokens: 10
      });
      return response.choices[0].message.content;
    }
  });
}

// Main router function with failover
async function askAI(messages, retryCount = 0) {
  if (retryCount >= providers.length) {
    throw new Error('All AI providers failed');
  }

  const provider = providers[retryCount];
  try {
    console.log(`🔄 Trying ${provider.name}...`);
    const answer = await provider.call(messages);
    console.log(`✅ ${provider.name} succeeded`);
    return { answer, provider: provider.name };
  } catch (error) {
    console.log(`❌ ${provider.name} failed:`, error.message);
    return askAI(messages, retryCount + 1);
  }
}

module.exports = { askAI, providers };