const Groq = require("groq-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Mistral } = require("@mistralai/mistralai");

const providers = [];

/* -------------------- GROQ -------------------- */
if (process.env.GROQ_API_KEY) {
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  providers.push({
    name: "groq",

    call: async (messages) => {
      const response = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages,
        temperature: 0.1,
        max_tokens: 10,
      });

      return response.choices[0].message.content.trim();
    },
  });
}
/* -------------------- GEMINI -------------------- */
if (process.env.GEMINI_API_KEY) {
  const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  providers.push({
    name: "gemini",

    call: async (messages) => {
      const model = gemini.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
      });

      const prompt = messages
        .map((m) => `${m.role.toUpperCase()}:\n${m.content}`)
        .join("\n\n");

      const result = await model.generateContent(prompt);

      return result.response.text().trim();
    },
  });
}

/* -------------------- MISTRAL -------------------- */
if (process.env.MISTRAL_API_KEY) {
  const mistral = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY,
  });

  providers.push({
    name: "mistral",

    call: async (messages) => {
      const response = await mistral.chat.complete({
        model: "mistral-small-2506",
        messages,
        temperature: 0.1,
        maxTokens: 10,
      });

      return response.choices[0].message.content.trim();
    },
  });
}

/* -------------------- ROUTER -------------------- */

async function askAI(messages) {
  let lastError = null;

  for (const provider of providers) {
    try {
      console.log(`🔄 Trying ${provider.name}...`);

      const answer = await provider.call(messages);

      console.log(`✅ ${provider.name} succeeded`);

      return {
        answer,
        provider: provider.name,
      };
    } catch (err) {
      lastError = err;

      console.error(`❌ ${provider.name} failed`);
      console.error(err.message);
    }
  }

  throw lastError || new Error("No AI providers configured.");
}

module.exports = {
  askAI,
  providers,
};