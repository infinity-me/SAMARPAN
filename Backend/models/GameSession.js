const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: String,
    score: { type: Number, default: 0 },
    ratingBefore: Number,
    ratingAfter: Number,
    delta: Number
  },
  { _id: false }
);

const gameSessionSchema = new mongoose.Schema(
  {
    pin: { type: String, index: true },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    mode: { type: String, enum: ["rapid", "blitz", "casual"], default: "rapid" },
    rated: { type: Boolean, default: true },
    participants: [participantSchema],
    startedAt: Date,
    endedAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("GameSession", gameSessionSchema);
