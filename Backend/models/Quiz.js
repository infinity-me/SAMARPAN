const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    question: String,
    options: [String],
    correctIndex: Number,
    explanation: String,
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" }
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    topic: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    questions: [questionSchema],
    aiGenerated: { type: Boolean, default: false },
    tags: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);
