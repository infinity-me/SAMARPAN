document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (token) {
    const user = {
      token,
      name: params.get("name"),
      email: params.get("email"),
      provider: "social"
    };

    localStorage.setItem("samarpanUser", JSON.stringify(user));
    updateUIOnLogin(user);

    // URL clean karo
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // agar already logged in hai to UI update
  const existing = getCurrentUser();
  if (existing) updateUIOnLogin(existing);
});


// ================== BASIC TAB SWITCH + ANIMATION ==================
const views        = document.querySelectorAll(".view");
const viewTriggers = document.querySelectorAll("[data-view]");
const sideLinks    = document.querySelectorAll(".side-link");
const flashBar     = document.getElementById("switchFlash");

// helper: programmatically view change karne ke liye
function showView(viewName) {
  const targetId = `view-${viewName}`;
  const nextView = document.getElementById(targetId);
  if (!nextView) return;

  views.forEach((v) => v.classList.remove("view-active", "view-anim-in"));
  nextView.classList.add("view-active");
  void nextView.offsetWidth;          // reflow for animation
  nextView.classList.add("view-anim-in");

  if (flashBar) {
    flashBar.classList.remove("flash-go");
    void flashBar.offsetWidth;
    flashBar.classList.add("flash-go");
  }
}

// click se view change
viewTriggers.forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();

    const target = trigger.getAttribute("data-view");
    if (!target) return; // kuch buttons sirf modal ke liye ho sakte hain

    showView(target);

    // sidebar active state
    if (trigger.classList.contains("side-link")) {
      sideLinks.forEach((b) => b.classList.remove("active"));
      trigger.classList.add("active");
    }
  });
});

// ================== SIDEBAR TOGGLE (MOBILE) ==================
const sidebar       = document.querySelector(".sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const main          = document.querySelector(".main");

if (sidebar && sidebarToggle) {
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
}

if (main && sidebar) {
  main.addEventListener("click", () => {
    sidebar.classList.remove("open");
  });
}

// ================== YEAR IN FOOTER (optional) ==================
const yearSpan = document.getElementById("year");
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

// ================== AUTH + MODAL LOGIC ==================

// ---- UI update after login ----
function updateUIOnLogin(user) {
  const sidebarName = document.querySelector(".user-name");
  const sidebarRole = document.querySelector(".user-role");
  const avatarTop   = document.getElementById("btnAvatarTop");
  const authBtnTop  = document.getElementById("btnAuthTop");

  const displayName = user.name || user.email || "User";
  const firstLetter = displayName.charAt(0).toUpperCase();

  // Sidebar info
  if (sidebarName) sidebarName.textContent = displayName;
  if (sidebarRole) sidebarRole.textContent = "Logged in";

  // Top avatar
  if (avatarTop) avatarTop.textContent = firstLetter;

  // Top "Sign up / Log in" -> "Profile"
  if (authBtnTop) {
    authBtnTop.textContent = "Profile";
    authBtnTop.classList.add("top-btn-loggedin");
  }
}

// ---- modal elements (Kahoot style auth card) ----
const authOverlay  = document.getElementById("authOverlay");
const authCloseBtn = document.getElementById("authCloseBtn");
const tabLogin     = document.getElementById("tabLogin");
const tabSignup    = document.getElementById("tabSignup");
const loginPanel   = document.getElementById("loginPanel");
const signupPanel  = document.getElementById("signupPanel");
const authTitle    = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authStatus   = document.getElementById("authStatus");
const authGoSignup = document.getElementById("authGoSignup");

const btnHostTop   = document.getElementById("btnHostTop");
const btnAuthTop   = document.getElementById("btnAuthTop");
const btnAvatarTop = document.getElementById("btnAvatarTop");
const btnLogout = document.getElementById("btnLogout");

// ---- open / close helpers ----
function openAuthModal() {
  if (!authOverlay) return;
  authOverlay.classList.remove("hidden");
  if (authStatus) {
    authStatus.style.color = "#b91c1c"; // default red for future errors
    authStatus.textContent = "";
  }
}

function closeAuthModal() {
  if (!authOverlay) return;
  authOverlay.classList.add("hidden");
}

// ---- current user helper ----
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("samarpanUser") || "null");
  } catch {
    return null;
  }
}

// ---- feature lock helper (Host, Create, etc.) ----
function requireLogin(message = "Please log in to use this feature.") {
  const user = getCurrentUser();
  if (!user) {
    openAuthModal();
    if (authStatus) {
      authStatus.style.color = "#b91c1c";
      authStatus.textContent = message;
    }
    return false;
  }
  return true;
}

// ---- close modal events ----
if (authCloseBtn) {
  authCloseBtn.addEventListener("click", closeAuthModal);
}
if (authOverlay) {
  authOverlay.addEventListener("click", (e) => {
    if (e.target === authOverlay) closeAuthModal();
  });
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAuthModal();
});

// ================== LOGIN <-> SIGNUP TABS ==================
if (tabLogin && tabSignup && loginPanel && signupPanel) {
  tabLogin.addEventListener("click", () => {
    tabLogin.classList.add("auth-tab-active");
    tabSignup.classList.remove("auth-tab-active");
    loginPanel.style.display = "block";
    signupPanel.style.display = "none";
    if (authTitle)    authTitle.textContent    = "Log in";
    if (authSubtitle) authSubtitle.textContent = "Sign in to continue using Samarpan.";
    if (authStatus)   authStatus.textContent   = "";
  });

  tabSignup.addEventListener("click", () => {
    tabSignup.classList.add("auth-tab-active");
    tabLogin.classList.remove("auth-tab-active");
    loginPanel.style.display = "none";
    signupPanel.style.display = "block";
    if (authTitle)    authTitle.textContent    = "Create your Samarpan account";
    if (authSubtitle) authSubtitle.textContent = "Tournaments, quizzes and rating in one place.";
    if (authStatus)   authStatus.textContent   = "";
  });
}

// bottom text link: "Don’t have an account? Sign up"
if (authGoSignup && tabSignup) {
  authGoSignup.addEventListener("click", (e) => {
    e.preventDefault();
    tabSignup.click();
  });
}

// ================== API BASE URL ==================
const API_BASE = "https://samarpan-svm9.onrender.com";

// ================== SIGNUP REQUEST ==================
const signupBtn = document.getElementById("signupSubmit");
if (signupBtn) {
  signupBtn.addEventListener("click", async () => {
    const name     = document.getElementById("signupName")?.value.trim();
    const email    = document.getElementById("signupEmail")?.value.trim();
    const password = document.getElementById("signupPassword")?.value.trim();

    if (!name || !email || !password) {
      if (authStatus) {
        authStatus.style.color = "#b91c1c";
        authStatus.textContent = "Please fill all fields.";
      }
      return;
    }

    if (authStatus) {
      authStatus.style.color = "#4b5563";
      authStatus.textContent = "Creating account...";
    }

    try {
      const res = await fetch(`${API_BASE}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (authStatus) {
          authStatus.style.color = "#b91c1c";
          authStatus.textContent = data.error || "Signup failed.";
        }
        return;
      }

      if (authStatus) {
        authStatus.style.color = "#16a34a";
        authStatus.textContent = "Signup successful! You can log in now.";
      }

      if (tabLogin) tabLogin.click(); // switch to login tab
    } catch (err) {
      console.error("Signup error:", err);
      if (authStatus) {
        authStatus.style.color = "#b91c1c";
        authStatus.textContent = "Network error. Please try again.";
      }
    }
  });
}

// ================== LOGIN REQUEST ==================
const loginBtn = document.getElementById("loginSubmit");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email    = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value.trim();

    if (!email || !password) {
      if (authStatus) {
        authStatus.style.color = "#b91c1c";
        authStatus.textContent = "Enter email and password.";
      }
      return;
    }

    if (authStatus) {
      authStatus.style.color = "#4b5563";
      authStatus.textContent = "Logging in...";
    }

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (authStatus) {
          authStatus.style.color = "#b91c1c";
          authStatus.textContent = data.error || "Login failed.";
        }
        return;
      }

      // Success UI
      if (authStatus) {
        authStatus.style.color = "#16a34a";
        authStatus.textContent = "Login successful!";
      }

      // user ko localStorage me save karo
      localStorage.setItem("samarpanUser", JSON.stringify(data));

      // UI ko login state me shift karo
      updateUIOnLogin(data);

      // optional: profile details fill (agar tumne IDs use kiye ho)
      const profileName  = document.getElementById("profileName");
      const profileEmail = document.getElementById("profileEmail");
      if (profileName && data.name)  profileName.textContent  = data.name;
      if (profileEmail && data.email) profileEmail.textContent = data.email;

      setTimeout(() => {
        closeAuthModal();
      }, 700);
    } catch (err) {
      console.error("Login error:", err);
      if (authStatus) {
        authStatus.style.color = "#b91c1c";
        authStatus.textContent = "Network error. Please try again.";
      }
    }
  });
}

// ================== AI QUIZ (GPT) REQUEST ==================
const aiGenerateBtn = document.getElementById("aiGenerateBtn");
const aiStatus      = document.getElementById("aiStatus");

if (aiGenerateBtn) {
  aiGenerateBtn.addEventListener("click", async () => {
    // login required for AI quiz
    if (!requireLogin("Please log in to generate AI quizzes.")) return;

    const currentUser = getCurrentUser();

    const titleRaw      = document.getElementById("aiTitle")?.value.trim();
    const topic         = document.getElementById("aiTopic")?.value.trim();
    const difficulty    = document.getElementById("aiDifficulty")?.value || "medium";
    const countRaw      = document.getElementById("aiCount")?.value;
    const questionCount = Number(countRaw) || 5;

    const title = titleRaw || "AI Quiz";

    if (!topic) {
      if (aiStatus) {
        aiStatus.style.color = "#b91c1c";
        aiStatus.textContent = "Please enter a topic for the quiz.";
      }
      return;
    }

    if (aiStatus) {
      aiStatus.style.color = "#4b5563";
      aiStatus.textContent = "Generating AI quiz...";
    }

    try {
      const res = await fetch(`${API_BASE}/api/ai/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          topic,
          difficulty,
          count: questionCount,
          userId: currentUser?.userId || currentUser?._id || currentUser?.email,
          tags: [topic.toLowerCase()],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (aiStatus) {
          aiStatus.style.color = "#b91c1c";
          aiStatus.textContent = data.error || "AI quiz generation failed.";
        }
        return;
      }

      // AI quiz ko localStorage me store kar lo (future use ke liye)
      if (data.quiz) {
        localStorage.setItem("samarpanLastAIQuiz", JSON.stringify(data.quiz));
      }

      if (aiStatus) {
        aiStatus.style.color = "#16a34a";
        aiStatus.textContent = "AI quiz generated successfully!";
      }

      console.log("AI Quiz:", data.quiz);
      // TODO: yahan se tum quiz ko UI me render kar sakte ho (question list etc.)
    } catch (err) {
      console.error("AI Quiz Error (frontend):", err);
      if (aiStatus) {
        aiStatus.style.color = "#b91c1c";
        aiStatus.textContent = "Network error while generating quiz.";
      }
    }
  });
}

// ================= SOCIAL LOGIN =================

// Google sign-in
const socialGoogle = document.getElementById("socialGoogle");
if (socialGoogle) {
  socialGoogle.addEventListener("click", () => {
    window.location.href = `${API_BASE}/auth/google`;
  });
}

// Facebook sign-in
const socialFacebook = document.getElementById("socialFacebook");
if (socialFacebook) {
  socialFacebook.addEventListener("click", () => {
    window.location.href = `${API_BASE}/auth/facebook`;
  });
}


// ================== PROTECT IMPORTANT FEATURES ==================
const protectedActions = [
  "toolCreateManual",    // dashboard -> Create quiz (manual)
  "toolCreateAI",        // dashboard -> Create quiz (AI)
  "toolLiveTournaments", // dashboard -> Live tournaments
];

protectedActions.forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;

  el.addEventListener("click", (e) => {
    if (!requireLogin()) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
});

// Host button: login required, then host view
if (btnHostTop) {
  btnHostTop.addEventListener("click", (e) => {
    e.preventDefault();
    if (!requireLogin()) return;
    showView("host");
  });
}

// Auth button: if not logged in -> modal, else -> profile view
if (btnAuthTop) {
  btnAuthTop.addEventListener("click", (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (user) {
      showView("profile");
    } else {
      openAuthModal();
    }
  });
}

// Avatar: same behaviour as profile
if (btnAvatarTop) {
  btnAvatarTop.addEventListener("click", (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (user) {
      showView("profile");
    } else {
      openAuthModal();
    }
  });
}

// ================== AUTO-LOGIN ON PAGE LOAD ==================
document.addEventListener("DOMContentLoaded", () => {
  const existing = getCurrentUser();
  if (existing) {
    updateUIOnLogin(existing);
  }
});
// ===== LOGOUT LOGIC =====


function logoutUser() {
  // local storage se user hatao
  localStorage.removeItem("samarpanUser");

  // basic UI reset
  const sidebarName = document.querySelector(".user-name");
  const sidebarRole = document.querySelector(".user-role");
  const avatarTop   = document.getElementById("btnAvatarTop");
  const authBtnTop  = document.getElementById("btnAuthTop");

  if (sidebarName) sidebarName.textContent = "Aman";
  if (sidebarRole) sidebarRole.textContent = "Host";
  if (avatarTop)   avatarTop.textContent   = "A";

  if (authBtnTop) {
    authBtnTop.textContent = "Sign up / Log in";
    authBtnTop.classList.remove("top-btn-loggedin");
  }

  if (btnLogout) {
    btnLogout.style.display = "none";
  }

  // optional: dashboard pe wapas le jao
  showView("dashboard");
}
if (btnLogout) {
  btnLogout.addEventListener("click", (e) => {
    e.preventDefault();
    logoutUser();
  });
}

// login hone ke baad logout button dikhao
function updateUIOnLogin(user) {
  const sidebarName = document.querySelector(".user-name");
  const sidebarRole = document.querySelector(".user-role");
  const avatarTop   = document.getElementById("btnAvatarTop");
  const authBtnTop  = document.getElementById("btnAuthTop");

  const displayName = user.name || user.email || "User";
  const firstLetter = displayName.charAt(0).toUpperCase();

  if (sidebarName) sidebarName.textContent = displayName;
  if (sidebarRole) sidebarRole.textContent = "Logged in";

  if (avatarTop) avatarTop.textContent = firstLetter;

  if (authBtnTop) {
    authBtnTop.textContent = "Profile";
    authBtnTop.classList.add("top-btn-loggedin");
  }

  if (btnLogout) {
    btnLogout.style.display = "inline-flex";
  }
}

// logout button click
if (btnLogout) {
  btnLogout.addEventListener("click", (e) => {
    e.preventDefault();
    logoutUser();
  });
}

// page load par agar user hai to logout button bhi dikhao
document.addEventListener("DOMContentLoaded", () => {
  const existing = getCurrentUser();
  if (existing) {
    updateUIOnLogin(existing);
  } else if (btnLogout) {
    btnLogout.style.display = "none";
  }
});

