// Backend/server.js  (CommonJS version)
require("dotenv").config();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;


const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Models
const User = require("./models/user"); 
const jwt = require("jsonwebtoken");

// ====== Initialize App ======
const app = express();
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

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
// ========== GOOGLE STRATEGY ==========
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;

        if (!email) return done(new Error("No email from Google"), null);

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            name,
            email,
            password: null,      // social login -> no local password
            provider: "google",
            googleId: profile.id,
          });
        } else {
          if (!user.provider) user.provider = "google";
          if (!user.googleId) user.googleId = profile.id;
          await user.save();
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

// ========== FACEBOOK STRATEGY ==========
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ["id", "displayName", "emails"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;

        // Facebook kabhi-kabhi email nahi deta – prototype ke liye skip
        if (!email) return done(new Error("No email from Facebook"), null);

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            name,
            email,
            password: null,
            provider: "facebook",
            facebookId: profile.id,
          });
        } else {
          if (!user.provider) user.provider = "facebook";
          if (!user.facebookId) user.facebookId = profile.id;
          await user.save();
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);


// ====== START SERVER ======
// ========== SOCIAL LOGIN COMMON REDIRECT HELPER ==========
// Google / Facebook callback ke baad yahi function chalega.
function sendSocialLoginRedirect(req, res) {
  const user = req.user;

  // 1. JWT token banaao
  const token = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  // 2. Frontend URL banao with query params
  const redirectUrl =
    process.env.FRONTEND_URL +
    `?token=${encodeURIComponent(token)}` +
    `&name=${encodeURIComponent(user.name || "")}` +
    `&email=${encodeURIComponent(user.email || "")}`;

  // 3. User ko wapas frontend par bhej do
  return res.redirect(redirectUrl);
}

// ========== GOOGLE AUTH ROUTES ==========

// Step 1: Google par redirect
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Step 2: Google callback -> yahan se frontend ko redirect
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: process.env.FRONTEND_URL,
  }),
  sendSocialLoginRedirect    // 👈 yahi helper call hoga
);
// ========== FACEBOOK AUTH ROUTES ==========

// Step 1: Facebook par redirect
app.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

// Step 2: Facebook callback -> redirect to frontend
app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", {
    session: false,
    failureRedirect: process.env.FRONTEND_URL,
  }),
  sendSocialLoginRedirect    // 👈 same helper
);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server Live → http://localhost:${PORT}`);
});
const aiQuizRoutes = require("./routes/aiQuiz");
app.use("/api/ai", aiQuizRoutes);
