const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const providers = [];

// ===== GROQ =====
if (process.env.GROQ_API_KEY) {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    providers.push({
      name: 'groq',
      call: async (messages) => {
        try {
          const response = await groq.chat.completions.create({
            messages,
            model: 'llama-3.1-8b-instant',
            temperature: 0.1,
            max_tokens: 10
          });
          return response.choices[0].message.content;
        } catch (err) {
          console.error('❌ Groq API error:', err.message);
          throw err;
        }
      }
    });
    console.log('✅ Groq provider loaded');
  } catch (err) {
    console.error('❌ Failed to load Groq:', err.message);
  }
}

// ===== GEMINI =====
if (process.env.GEMINI_API_KEY) {
  try {
    const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    providers.push({
      name: 'gemini',
      call: async (messages) => {
        try {
          const model = gemini.getGenerativeModel({ model: 'gemini-2.0-flash' });
          const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
          const result = await model.generateContent(prompt);
          return result.response.text();
        } catch (err) {
          console.error('❌ Gemini API error:', err.message);
          throw err;
        }
      }
    });
    console.log('✅ Gemini provider loaded');
  } catch (err) {
    console.error('❌ Failed to load Gemini:', err.message);
  }
}

// ===== MISTRAL =====
if (process.env.MISTRAL_API_KEY) {
  try {
    providers.push({
      name: 'mistral',
      call: async (messages) => {
        try {
          const { Mistral } = await import('@mistralai/mistralai');
          const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
          const response = await mistral.chat.completions.create({
            messages,
            model: 'mistral-small-latest',
            temperature: 0.1,
            max_tokens: 10
          });
          return response.choices[0].message.content;
        } catch (err) {
          console.error('❌ Mistral API error:', err.message);
          throw err;
        }
      }
    });
    console.log('✅ Mistral provider loaded');
  } catch (err) {
    console.error('❌ Failed to load Mistral:', err.message);
  }
}

// ===== FALLBACK: Mock responses =====
async function askAI(messages, retryCount = 0) {
  // ✅ If no providers, use fallback
  if (providers.length === 0) {
    console.log('⚠️ No AI providers available. Using fallback responses.');
    const fallbackAnswers = ['Yes', 'No', 'Maybe'];
    const randomAnswer = fallbackAnswers[Math.floor(Math.random() * fallbackAnswers.length)];
    return { answer: randomAnswer, provider: 'fallback' };
  }

  if (retryCount >= providers.length) {
    console.log('❌ All AI providers failed. Using fallback.');
    const fallbackAnswers = ['Yes', 'No', 'Maybe'];
    const randomAnswer = fallbackAnswers[Math.floor(Math.random() * fallbackAnswers.length)];
    return { answer: randomAnswer, provider: 'fallback' };
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