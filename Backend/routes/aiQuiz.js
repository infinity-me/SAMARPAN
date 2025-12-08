const express = require("express");
const router = express.Router();

const { generateQuizQuestions } = require("../services/gptService");
const Quiz = require("../models/Quiz");
const User = require("../models/User"); // ✅ IMPORTANT

// ✅ Generate AI Quiz (Schema Compatible)
router.post("/generate-quiz", async (req, res) => {
  try {
    const { title, topic, difficulty, count, userId, tags } = req.body;

    if (!title || !topic || !difficulty) {
      return res.status(400).json({ error: "title, topic & difficulty required" });
    }

    // ✅ Convert Email OR ID → ObjectId
    let authorId = null;

    if (userId) {
      if (userId.includes("@")) {
        // CASE 1: Email sent
        const user = await User.findOne({ email: userId });
        if (!user) {
          return res.status(400).json({ error: "User not found" });
        }
        authorId = user._id;
      } else {
        // CASE 2: MongoDB ID sent
        authorId = userId;
      }
    }

    const questions = await generateQuizQuestions(
      topic,
      difficulty,
      count || 5
    );

    const quiz = await Quiz.create({
      title,
      topic,
      author: authorId, // ✅ ALWAYS correct type now
      questions,
      aiGenerated: true,
      tags: tags || [],
    });

    res.json({
      message: "✅ AI Quiz Generated Successfully",
      quizId: quiz._id,
      quiz,
    });
  } catch (err) {
    console.error("AI Quiz Error:", err);
    res.status(500).json({ error: "AI Quiz generation failed" });
  }
});

module.exports = router;
