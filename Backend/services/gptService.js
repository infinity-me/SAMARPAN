const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const text = response.choices[0].message.content;
  return JSON.parse(text);
}

module.exports = { generateQuizQuestions };
