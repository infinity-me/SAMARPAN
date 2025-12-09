// Backend/server.js
require("dotenv").config();

console.log("ENV CHECK → FRONTEND_URL:", process.env.FRONTEND_URL);
console.log("ENV CHECK → GOOGLE_CALLBACK_URL:", process.env.GOOGLE_CALLBACK_URL);
console.log("ENV CHECK → FACEBOOK_CALLBACK_URL:", process.env.FACEBOOK_CALLBACK_URL);
console.log("ENV CHECK → GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? 'OK' : 'MISSING');
console.log("ENV CHECK → FACEBOOK_CLIENT_ID:", process.env.FACEBOOK_CLIENT_ID ? 'OK' : 'MISSING');

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;

// Models
const User = require("./models/user");          // file ka naam user.js hai to ye sahi hai
const aiQuizRoutes = require("./routes/aiQuiz"); // AI quiz routes

// ====== APP INIT ======
const app = express();

// CORS – abhi sab allowed (dev ke liye ok)
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());
app.use(passport.initialize());

// ====== MONGO CONNECT ======
console.log("Mongo URI:", process.env.MONGODB_URI);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🟢 MongoDB Connected");
  } catch (err) {
    console.error("🔴 MongoDB Error:", err.message);
    process.exit(1);
  }
}
connectDB();

// ====== SMALL HELPERS ======
function createJwtForUser(user) {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "http://127.0.0.1:5500/Frontend/index.html";

// ====== HEALTH CHECK ======
app.get("/api/health", (req, res) => {
  res.json({ server: "Samarpan Backend", status: "Running ✔" });
});

// =====================================================
// =============== LOCAL EMAIL/PASSWORD AUTH ===========
// =====================================================

// SIGNUP
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
      provider: "local",
    });

    const token = createJwtForUser(user);

    return res.json({
      message: "Signup Successful",
      userId: user._id,
      name: user.name,
      email: user.email,
      globalRating: user.globalRating,
      ratings: user.ratings,
      xp: user.xp,
      token,
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Signup failed" });
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) {
      return res.status(400).json({ error: "User not found" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const token = createJwtForUser(user);

    res.json({
      message: "Login Successful",
      userId: user._id,
      name: user.name,
      email: user.email,
      globalRating: user.globalRating,
      ratings: user.ratings,
      xp: user.xp,
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// =====================================================
// =============== PASSPORT SOCIAL STRATEGIES ==========
// =====================================================

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
        const avatar = profile.photos?.[0]?.value; // ⭐ DP URL

        if (!email) return done(new Error("No email from Google"), null);

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            name,
            email,
            avatar,
            provider: "google",
            googleId: profile.id,
          });
        } else {
          // update missing info
          if (!user.provider) user.provider = "google";
          if (!user.googleId) user.googleId = profile.id;
          if (!user.avatar && avatar) user.avatar = avatar;
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
      profileFields: ["id", "displayName", "emails", "picture.type(large)"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const avatar =
          profile.photos && profile.photos[0] && profile.photos[0].value
            ? profile.photos[0].value
            : null;

        if (!email) return done(new Error("No email from Facebook"), null);

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            name,
            email,
            avatar,
            provider: "facebook",
            facebookId: profile.id,
          });
        } else {
          if (!user.provider) user.provider = "facebook";
          if (!user.facebookId) user.facebookId = profile.id;
          if (!user.avatar && avatar) user.avatar = avatar;
          await user.save();
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);



// ========== SOCIAL LOGIN COMMON REDIRECT HELPER ==========
function sendSocialLoginRedirect(req, res) {
  const user = req.user;

  const token = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  const redirectUrl =
    process.env.FRONTEND_URL +
    `?token=${encodeURIComponent(token)}` +
    `&name=${encodeURIComponent(user.name || "")}` +
    `&email=${encodeURIComponent(user.email || "")}` +
    `&avatar=${encodeURIComponent(user.avatar || "")}`; // ⭐ yahan se DP jaa rahi

  return res.redirect(redirectUrl);
}


// =====================================================
// =============== SOCIAL AUTH ROUTES ===================
// =====================================================

// GOOGLE
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", { session:false, failureRedirect: process.env.FRONTEND_URL }),
  (req,res) => {
     console.log("callback req.query:", req.query);
     sendSocialLoginRedirect(req,res);
  });


// FACEBOOK
app.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", {
    session: false,
    failureRedirect: FRONTEND_URL,
  }),
  sendSocialLoginRedirect
);

// =====================================================
// =============== OTHER ROUTES (AI QUIZ) ==============
// =====================================================

app.use("/api/ai", aiQuizRoutes);

// ====== START SERVER ======
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server Live → http://localhost:${PORT}`);
});
