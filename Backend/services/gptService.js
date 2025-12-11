const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function generateQuizQuestions(topic, difficulty, count = 5) {
  const prompt = `
Generate exactly ${count} multiple-choice quiz questions on the topic "${topic}".
Difficulty: ${difficulty}

Return ONLY valid JSON in this exact format:

[
  {
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Short explanation",
    "difficulty": "${difficulty}"
  }
]
`;

  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant", 
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const rawText = response.choices[0].message.content.trim();

  return JSON.parse(rawText);
}

module.exports = { generateQuizQuestions };
