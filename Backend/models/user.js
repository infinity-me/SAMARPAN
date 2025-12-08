const mongoose = require("mongoose");

const modeRatingSchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ["rapid", "blitz", "casual"], required: true },
    rating: { type: Number, default: 1200 },
    peak: { type: Number, default: 1200 }
  },
  { _id: false }
);

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },

    // normal signup / login ke liye
    passwordHash: { type: String },

    // ⭐ social login ke liye extra fields
    avatar: { type: String },           // Google / Facebook profile photo URL
    provider: { type: String },         // "google" / "facebook" / "local"
    googleId: { type: String },
    facebookId: { type: String },

    // tumhara rating system
    globalRating: { type: Number, default: 1200 },
    ratings: {
      rapid: { type: Number, default: 1200 },
      blitz: { type: Number, default: 1200 },
      casual: { type: Number, default: 1200 },
    },
    xp: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

