// Backend/server.js  (CommonJS version)

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Models
const User = require("./models/user"); 
// agar baad me Quiz, GameSession, RatingHistory use karoge to yahan add kar lena

// ====== Initialize App ======
const app = express();
app.use(cors());
app.use(express.json());

// ====== MongoDB Connect ======
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🟢 MongoDB Connected");
  } catch (err) {
    console.error("🔴 MongoDB Error:", err);
    process.exit(1); // DB na chale to server band kar do
  }
}
connectDB();

// ====== Health Check ======
app.get("/api/health", (req, res) => {
  res.json({ server: "Samarpan Backend", status: "Running ✔" });
});

// ====== SIGNUP ======
app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash: hash,
    });

    return res.json({
  message: "Signup Successful",
  userId: user._id,
  name: user.name,
  email: user.email,
  globalRating: user.globalRating,
  ratings: user.ratings,
  xp: user.xp
});

  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Signup failed" });
  }
});

// ====== LOGIN ======
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(400).json({ error: "Invalid password" });
    }

    res.json({
  message: "Login Successful",
  userId: user._id,
  name: user.name,
  email: user.email,
  globalRating: user.globalRating,
  ratings: user.ratings,
  xp: user.xp
});

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ====== START SERVER ======
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server Live → http://localhost:${PORT}`);
});
const aiQuizRoutes = require("./routes/aiQuiz");
app.use("/api/ai", aiQuizRoutes);
