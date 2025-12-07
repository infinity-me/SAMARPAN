const mongoose = require("mongoose");

const ratingHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    game: { type: mongoose.Schema.Types.ObjectId, ref: "GameSession" },
    mode: String,
    before: Number,
    after: Number,
    delta: Number
  },
  { timestamps: true }
);

module.exports = mongoose.model("RatingHistory", ratingHistorySchema);
