const Groq = require('groq-sdk');

const providers = [];

console.log('========================================');
console.log('🔧 Initializing AI Providers...');

// ============================================================
// 🔥 GROQ - FIRST PRIORITY (With timeout)
// ============================================================
if (process.env.GROQ_API_KEY) {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    providers.push({
      name: 'groq',
      call: async (messages) => {
        try {
          console.log(`🔄 Groq processing...`);
          
          // ✅ 10 second timeout for Groq
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Groq timeout after 10s')), 10000)
          );
          
          const response = await Promise.race([
            groq.chat.completions.create({
              messages,
              model: 'llama-3.1-8b-instant',
              temperature: 0.1,
              max_tokens: 10
            }),
            timeoutPromise
          ]);
          
          console.log(`✅ Groq succeeded`);
          return response.choices[0].message.content;
        } catch (err) {
          console.error(`❌ Groq error:`, err.message);
          throw err;
        }
      }
    });
    console.log('✅ Groq provider loaded');
  } catch (err) {
    console.error('❌ Failed to load Groq:', err.message);
  }
}

// ============================================================
// 🔥 DEEPINFRA - SECOND PRIORITY (With timeout)
// ============================================================
if (process.env.DEEPINFRA_API_KEY) {
  try {
    providers.push({
      name: 'deepinfra',
      call: async (messages) => {
        try {
          console.log(`🔄 DeepInfra processing...`);
          
          // ✅ 20 second timeout for DeepInfra
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('DeepInfra timeout after 20s')), 20000)
          );
          
          const response = await Promise.race([
            fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DEEPINFRA_API_KEY}`
              },
              body: JSON.stringify({
                model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
                messages: messages,
                temperature: 0.1,
                max_tokens: 10,
                stream: false
              })
            }),
            timeoutPromise
          ]);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ DeepInfra API error: ${response.status} - ${errorText}`);
            throw new Error(`DeepInfra API error: ${response.status}`);
          }

          const data = await response.json();
          const answer = data.choices[0]?.message?.content || 'Maybe';
          console.log(`✅ DeepInfra succeeded`);
          return answer;
        } catch (err) {
          console.error('❌ DeepInfra API error:', err.message);
          throw err;
        }
      }
    });
    console.log('✅ DeepInfra provider loaded');
  } catch (err) {
    console.error('❌ Failed to load DeepInfra:', err.message);
  }
}

// ============================================================
// 📊 PROVIDER SUMMARY
// ============================================================
console.log(`📊 Total AI providers loaded: ${providers.length}`);
providers.forEach(p => console.log(`   - ${p.name}`));
console.log('========================================');

// ============================================================
// 🔥 FALLBACK: Mock responses if all providers fail
// ============================================================
const fallbackAnswers = ['Yes', 'No', 'Maybe', 'IDK'];

function getFallbackAnswer() {
  return fallbackAnswers[Math.floor(Math.random() * fallbackAnswers.length)];
}

// ============================================================
// 🚀 MAIN askAI FUNCTION with failover
// ============================================================
async function askAI(messages, retryCount = 0) {
  if (providers.length === 0) {
    console.log('⚠️ No AI providers available. Using fallback responses.');
    return { answer: getFallbackAnswer(), provider: 'fallback' };
  }

  if (retryCount >= providers.length) {
    console.log('❌ All AI providers failed. Using fallback.');
    return { answer: getFallbackAnswer(), provider: 'fallback' };
  }

  const provider = providers[retryCount];
  try {
    console.log(`🔄 Trying ${provider.name}...`);
    const answer = await provider.call(messages);
    const cleanAnswer = answer.trim().replace(/[^a-zA-Z\s]/g, '').trim();
    console.log(`✅ ${provider.name} succeeded`);
    return { answer: cleanAnswer || getFallbackAnswer(), provider: provider.name };
  } catch (error) {
    console.log(`❌ ${provider.name} failed:`, error.message);
    // ✅ Always move to next provider
    return askAI(messages, retryCount + 1);
  }
}

module.exports = { askAI, providers };