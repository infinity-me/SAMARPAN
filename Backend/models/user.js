const mongoose = require("mongoose");

const modeRatingSchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ["rapid", "blitz", "casual"], required: true },
    rating: { type: Number, default: 1200 },
    peak: { type: Number, default: 1200 }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    ratings: {
  type: [modeRatingSchema],
  validate: [
    arr => arr.length === 3,
    "Ratings must contain exactly 3 modes"
  ],
  default: [
    { mode: "rapid", rating: 1200, peak: 1200 },
    { mode: "blitz", rating: 1200, peak: 1200 },
    { mode: "casual", rating: 0, peak: 0 }
  ],
},

    name: { type: String, required: true },
    email: { 
  type: String, 
  required: true, 
  unique: true,
  lowercase: true,
  index: true
},
    passwordHash: { type: String, required: true },
    globalRating: { type: Number, default: 1200 },
    ratings: {
      type: [modeRatingSchema],
      default: [
        { mode: "rapid", rating: 1200, peak: 1200 },
        { mode: "blitz", rating: 1200, peak: 1200 },
        { mode: "casual", rating: 0, peak: 0 }
      ],
    },
    xp: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
