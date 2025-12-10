

(function () {
  // ---------------- Configuration ----------------
  const API_BASE = "https://samarpan-svm9.onrender.com"; // backend base URL

  // ---------------- Utilities ----------------
  const safeParse = (s, fallback = null) => {
    try { return s ? JSON.parse(s) : fallback; } catch { return fallback; }
  };

  function getCurrentUser() {
    return safeParse(localStorage.getItem("samarpanUser"), null);
  }

  function setCurrentUser(obj) {
    if (!obj) return;
    localStorage.setItem("samarpanUser", JSON.stringify(obj));
  }

  function clearCurrentUser() {
    localStorage.removeItem("samarpanUser");
  }

  function showStatusText(el, message, color) {
    if (!el) return;
    el.style.color = color || "";
    el.textContent = message || "";
  }

  // Small helper to run code once DOM is ready
  function onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  // ---------------- View switching ----------------
  function showView(name) {
    if (!name) return;
    const viewId = name.startsWith("view-") ? name : `view-${name}`;
    const next = document.getElementById(viewId);
    const views = Array.from(document.querySelectorAll(".view"));

    // Hide all views
    views.forEach(v => {
      v.classList.remove("view-active", "view-anim-in");
      // keep display style controlled by classes/CSS; ensure removed animation classes
    });

    // If view exists, show with animation classes (if CSS expects them)
    if (next) {
      next.classList.add("view-active");
      // trigger reflow for animations
      void next.offsetWidth;
      next.classList.add("view-anim-in");
    } else if (views[0]) {
      // fallback: if requested view missing, show first available view
      views[0].classList.add("view-active");
    }

    // optional flash effect if present
    const flash = document.getElementById("switchFlash");
    if (flash) {
      flash.classList.remove("flash-go");
      void flash.offsetWidth;
      flash.classList.add("flash-go");
    }
  }

  // ---------------- Auth modal helpers ----------------
  function openAuthModal() {
    const overlay = document.getElementById("authOverlay");
    const status = document.getElementById("authStatus");
    if (!overlay) return;
    overlay.classList.remove("hidden");
    showStatusText(status, "", "#4b5563");
  }

  function closeAuthModal() {
    const overlay = document.getElementById("authOverlay");
    if (!overlay) return;
    overlay.classList.add("hidden");
  }

  function requireLogin(message = "Please log in to use this feature.") {
    const user = getCurrentUser();
    if (!user) {
      openAuthModal();
      showStatusText(document.getElementById("authStatus"), message, "#b91c1c");
      return false;
    }
    return true;
  }

  // ---------------- UI update after login ----------------
  function updateUIOnLogin(user) {
    const sidebarName = document.querySelector(".user-name");
    const sidebarRole = document.querySelector(".user-role");
    const avatarTop   = document.getElementById("btnAvatarTop");
    const authBtnTop  = document.getElementById("btnAuthTop");
    const btnLogout   = document.getElementById("btnLogout");

    const displayName = (user && (user.name || user.email)) || "User";
    const firstLetter = displayName.charAt(0).toUpperCase();

    if (sidebarName) sidebarName.textContent = displayName;
    if (sidebarRole) sidebarRole.textContent = (user ? "Logged in" : "Host");

    if (avatarTop) {
      if (user && user.avatar) avatarTop.innerHTML = `<img src="${user.avatar}" class="profile-img" alt="avatar">`;
      else avatarTop.textContent = firstLetter;
    }

    if (authBtnTop) {
      if (user) {
        authBtnTop.textContent = "Profile";
        authBtnTop.classList.add("top-btn-loggedin");
      } else {
        authBtnTop.textContent = "Sign up / Log in";
        authBtnTop.classList.remove("top-btn-loggedin");
      }
    }

    if (btnLogout) btnLogout.style.display = user ? "inline-flex" : "none";
  }

  // ---------------- Social token handling (SSO) ----------------
  function handleTokenInURL() {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      if (!token) return;

      const user = {
        token,
        name: params.get("name") || "",
        email: params.get("email") || "",
        avatar: params.get("avatar") || ""
      };
      setCurrentUser(user);
      updateUIOnLogin(user);

      // remove query params from URL
      const url = new URL(window.location);
      url.search = "";
      window.history.replaceState({}, document.title, url.toString());
    } catch (e) {
      console.warn("handleTokenInURL:", e);
    }
  }

  // ---------------- Render last AI-generated quiz ----------------
  function renderLastAIQuizToDashboard() {
    try {
      const raw = localStorage.getItem("samarpanLastAIQuiz");
      if (!raw) return;
      const quiz = safeParse(raw, null);
      if (!quiz) return;

      const quizGrid = document.querySelector(".quiz-grid") || document.getElementById("quizGrid");
      if (!quizGrid) return;

      const card = document.createElement("div");
      card.className = "quiz-card";
      const qcount = (quiz.questions && quiz.questions.length) || 0;
      card.innerHTML = `
        <h4>${quiz.title || "AI Quiz"}</h4>
        <p>${qcount} questions • AI-generated</p>
        <div class="quiz-meta">
          <small>AI • just now</small>
          <div style="margin-top:6px">
            <button class="mini-btn view-quiz">Play</button>
            <button class="mini-btn edit-quiz">Edit</button>
          </div>
        </div>
      `;

      card.querySelector(".view-quiz")?.addEventListener("click", () => {
        localStorage.setItem("samarpanCurrentQuiz", JSON.stringify(quiz));
        if (document.getElementById("view-player")) showView("player");
      });
      card.querySelector(".edit-quiz")?.addEventListener("click", () => {
        localStorage.setItem("samarpanCurrentQuiz", JSON.stringify(quiz));
        if (document.getElementById("view-create")) showView("create");
      });

      quizGrid.prepend(card);
    } catch (e) {
      console.warn("renderLastAIQuizToDashboard error:", e);
    }
  }
function hideAuthView() {
  const authView = document.getElementById("view-auth");
  if (authView) {
    authView.style.display = "none";   // ab sach me gayab karega
  }
}
  // ---------------- Attach event handlers ----------------
  function attachHandlers() {
    // Sidebar toggle (mobile)
    (function () {
      const sidebar = document.querySelector(".sidebar");
      const sidebarToggle = document.getElementById("sidebarToggle");
      const main = document.querySelector(".main");
      if (sidebar && sidebarToggle) {
        sidebarToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
      }
      if (main && sidebar) {
        main.addEventListener("click", () => sidebar.classList.remove("open"));
      }
    })();

    // Year in footer
    (function () {
      const yearSpan = document.getElementById("year");
      if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    })();

    // Data-view links (primary navigation)
    (function () {
      document.querySelectorAll("[data-view]").forEach(el => {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          const view = el.getAttribute("data-view");
          const user = getCurrentUser();
          if ((view === "view-auth" || view === "view-login") && user) { showView("dashboard"); return; }
          showView(view);
          if (el.classList.contains("side-link")) {
            document.querySelectorAll(".side-link").forEach(b => b.classList.remove("active"));
            el.classList.add("active");
          }
        });
      });
    })();

    // ================= AUTH CORE DOM REFS =================
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

// Top triggers: Host / Login / Avatar
const authTriggers = [
  document.getElementById("btnHostTop"),
  document.getElementById("btnAuthTop"),
  document.getElementById("btnAvatarTop"),
];

// ================= OPEN / CLOSE HELPERS =================
function openAuthModal() {
  if (!authOverlay) return;
  authOverlay.classList.remove("hidden");
  if (authStatus) {
    authStatus.style.color = "#b91c1c";
    authStatus.textContent = "";
  }
}

function closeAuthModal() {
  if (!authOverlay) return;
  authOverlay.classList.add("hidden");
}

// Bind open on click (Host / Login / Avatar)
authTriggers
  .filter(Boolean)
  .forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openAuthModal();
    });
  });

// Close (X button)
if (authCloseBtn) {
  authCloseBtn.addEventListener("click", closeAuthModal);
}

// Click outside to close
if (authOverlay) {
  authOverlay.addEventListener("click", (e) => {
    if (e.target === authOverlay) {
      closeAuthModal();
    }
  });
}

// ESC key to close
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeAuthModal();
  }
});

// ================= LOGIN <-> SIGNUP TABS =================
if (tabLogin && tabSignup && loginPanel && signupPanel) {
  tabLogin.addEventListener("click", () => {
    tabLogin.classList.add("auth-tab-active");
    tabSignup.classList.remove("auth-tab-active");
    loginPanel.style.display  = "block";
    signupPanel.style.display = "none";
    if (authTitle)    authTitle.textContent    = "Log in";
    if (authSubtitle) authSubtitle.textContent = "Sign in to continue using Samarpan.";
    if (authStatus)   authStatus.textContent   = "";
  });

  tabSignup.addEventListener("click", () => {
    tabSignup.classList.add("auth-tab-active");
    tabLogin.classList.remove("auth-tab-active");
    loginPanel.style.display  = "none";
    signupPanel.style.display = "block";
    if (authTitle)    authTitle.textContent    = "Create your Samarpan account";
    if (authSubtitle) authSubtitle.textContent = "Tournaments, quizzes and rating in one place.";
    if (authStatus)   authStatus.textContent   = "";
  });
}

// Bottom text: "Don’t have an account? Sign up"
if (authGoSignup && tabSignup) {
  authGoSignup.addEventListener("click", (e) => {
    e.preventDefault();
    tabSignup.click();
  });
}

// Small helper for status text
function showStatusText(el, text, color) {
  if (!el) return;
  el.style.color = color || "#e5e7eb";
  el.textContent = text || "";
}

// ================= SIGNUP REQUEST =================
(function () {
  const signupBtn = document.getElementById("signupSubmit");
  if (!signupBtn) return;

  signupBtn.addEventListener("click", async () => {
    const name     = document.getElementById("signupName")?.value.trim();
    const email    = document.getElementById("signupEmail")?.value.trim();
    const password = document.getElementById("signupPassword")?.value.trim();

    if (!name || !email || !password) {
      showStatusText(authStatus, "Please fill all fields.", "#b91c1c");
      return;
    }
    showStatusText(authStatus, "Creating account...", "#4b5563");

    try {
      const res = await fetch(`${API_BASE}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        showStatusText(authStatus, data.error || "Signup failed.", "#b91c1c");
        return;
      }
      showStatusText(authStatus, "Signup successful! You can log in now.", "#16a34a");
      tabLogin?.click();
    } catch (err) {
      console.error("Signup error:", err);
      showStatusText(authStatus, "Network error. Please try again.", "#b91c1c");
    }
  });
})();

// ================= LOGIN REQUEST =================
(function () {
  const loginBtn = document.getElementById("loginSubmit");
  if (!loginBtn) return;

  loginBtn.addEventListener("click", async () => {
    const email    = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value.trim();

    if (!email || !password) {
      showStatusText(authStatus, "Enter email and password.", "#b91c1c");
      return;
    }
    showStatusText(authStatus, "Logging in...", "#4b5563");

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        showStatusText(authStatus, data.error || "Login failed.", "#b91c1c");
        return;
      }

      // SUCCESS
      showStatusText(authStatus, "Login successful!", "#16a34a");

      // Save + UI update
      localStorage.setItem("samarpanUser", JSON.stringify(data));
      updateUIOnLogin(data);
      hideAuthView();   // agar view-auth page hai to usko bhi hide kar do

      if (document.getElementById("view-dashboard")) {
        showView("dashboard");
      } 
      
      setTimeout(() => {
        closeAuthModal();
      }, 700);
    } catch (err) {
      console.error("Login error:", err);
      showStatusText(authStatus, "Network error. Please try again.", "#b91c1c");
    }
  });
})();

    // Social login buttons
    (function () {
      const socialGoogle = document.getElementById("socialGoogle");
      if (socialGoogle) socialGoogle.addEventListener("click", () => { window.location.href = `${API_BASE}/auth/google`; });
      const socialFacebook = document.getElementById("socialFacebook");
      if (socialFacebook) socialFacebook.addEventListener("click", () => { window.location.href = `${API_BASE}/auth/facebook`; });
    })();

    // AI generate
    (function () {
      const aiGenerateBtn = document.getElementById("aiGenerateBtn");
      const aiStatus = document.getElementById("aiStatus");
      if (!aiGenerateBtn) return;
      aiGenerateBtn.addEventListener("click", async () => {
        if (!requireLogin("Please log in to generate AI quizzes.")) return;

        const currentUser = getCurrentUser();
        const titleRaw = document.getElementById("aiTitle")?.value.trim();
        const topic = document.getElementById("aiTopic")?.value.trim();
        const difficulty = document.getElementById("aiDifficulty")?.value || "medium";
        const questionCount = Number(document.getElementById("aiCount")?.value) || 5;
        const title = titleRaw || "AI Quiz";

        if (!topic) {
          showStatusText(aiStatus, "Please enter a topic for the quiz.", "#b91c1c");
          return;
        }
        showStatusText(aiStatus, "Generating AI quiz...", "#4b5563");

        try {
          const res = await fetch(`${API_BASE}/api/ai/generate-quiz`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title, topic, difficulty, count: questionCount,
              userId: currentUser?.userId || currentUser?._id || currentUser?.email,
              tags: [topic.toLowerCase()],
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            showStatusText(aiStatus, data.error || "AI quiz generation failed.", "#b91c1c");
            return;
          }
          if (data.quiz) localStorage.setItem("samarpanLastAIQuiz", JSON.stringify(data.quiz));
          showStatusText(aiStatus, "AI quiz generated successfully!", "#16a34a");
          renderLastAIQuizToDashboard();
        } catch (err) {
          console.error("AI Quiz Error:", err);
          showStatusText(aiStatus, "Network error while generating quiz.", "#b91c1c");
        }
      });
    })();

    // Create quiz (manual)
    (function () {
      const createForm = document.getElementById("createQuizForm");
      if (!createForm) return;
      createForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = document.getElementById("createTitle")?.value.trim() || "Untitled";
        const questionsRaw = document.getElementById("createQuestions")?.value || "[]";
        let questions;
        try { questions = JSON.parse(questionsRaw); } catch {
          questions = questionsRaw.split("\n").filter(Boolean).map(t => ({ text: t, options: [], answer: null }));
        }
        const payload = { title, questions, author: getCurrentUser()?.email || null };

        try {
          const res = await fetch(`${API_BASE}/quizzes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const err = await res.json();
            alert(err.message || "Failed to create quiz on server. Saving locally.");
            const key = "samarpanUserQuizzes";
            const arr = safeParse(localStorage.getItem(key), []);
            arr.push(payload);
            localStorage.setItem(key, JSON.stringify(arr));
            renderLocalCreatedQuiz(payload);
            showView("dashboard");
            return;
          }
          const data = await res.json();
          renderNewlyCreatedQuiz(data.quiz || payload);
          showView("dashboard");
        } catch (err) {
          console.error("create quiz err:", err);
          const key = "samarpanUserQuizzes";
          const arr = safeParse(localStorage.getItem(key), []);
          arr.push(payload);
          localStorage.setItem(key, JSON.stringify(arr));
          renderLocalCreatedQuiz(payload);
          showView("dashboard");
        }
      });
    })();

    // Leaderboard
    (function () {
      const btn = document.getElementById("leaderboardBtn");
      if (!btn) return;
      btn.addEventListener("click", async () => {
        try {
          const res = await fetch(`${API_BASE}/leaderboard`);
          if (!res.ok) { alert("Failed to fetch leaderboard"); return; }
          const data = await res.json();
          const container = document.getElementById("leaderboardContainer");
          if (container) container.innerHTML = (data.scores || []).map(s => `<div class="leader-item"><span>${s.name}</span><span>${s.score}</span></div>`).join("");
          showView("leaderboard");
        } catch (err) {
          console.error("leaderboard err:", err);
          alert("Error loading leaderboard");
        }
      });
    })();

    // Explore (public quizzes)
    (function () {
      const btn = document.getElementById("exploreBtn");
      if (!btn) return;
      btn.addEventListener("click", async () => {
        try {
          const res = await fetch(`${API_BASE}/quizzes/public`);
          if (!res.ok) { alert("Failed to fetch public quizzes"); return; }
          const data = await res.json();
          const container = document.getElementById("exploreContainer");
          if (container) container.innerHTML = (data.quizzes || []).map(q => `<div class="explore-item"><h4>${q.title}</h4><p>${(q.questions && q.questions.length) || 0} questions</p></div>`).join("");
          showView("explore");
        } catch (err) {
          console.error("explore err:", err);
          alert("Error loading explore");
        }
      });
    })();

    // Rating history
    (function () {
      const btn = document.getElementById("ratingHistoryBtn");
      if (!btn) return;
      btn.addEventListener("click", async () => {
        const user = getCurrentUser();
        if (!user) { alert("Please login first"); return; }
        try {
          const res = await fetch(`${API_BASE}/ratings/${encodeURIComponent(user.email)}`);
          if (!res.ok) { alert("Could not fetch rating history"); return; }
          const data = await res.json();
          const modal = document.getElementById("ratingModal");
          const container = document.getElementById("ratingHistoryContainer");
          if (!modal || !container) { alert("Rating UI not present"); return; }
          container.innerHTML = (data.history || []).map(h => `<div class="rating-item"><strong>${h.rating}</strong> — ${new Date(h.date).toLocaleString()}</div>`).join("");
          modal.style.display = "block";
        } catch (err) {
          console.error("rating history err:", err);
          alert("Failed to fetch rating history");
        }
      });
    })();

    // Profile / logout / host / avatar handlers
    (function () {
      const profileBtn = document.getElementById("profileBtn");
      if (profileBtn) profileBtn.addEventListener("click", () => {
        const user = getCurrentUser();
        if (!user) { showView("auth"); return; }
        const profileName = document.getElementById("profileName");
        const profileEmail = document.getElementById("profileEmail");
        if (profileName) profileName.textContent = user.name || "";
        if (profileEmail) profileEmail.textContent = user.email || "";
        showView("profile");
      });

      const btnLogout = document.getElementById("btnLogout");
      if (btnLogout) btnLogout.addEventListener("click", (e) => {
        e.preventDefault();
        clearCurrentUser();
        updateUIOnLogin(null);
        showView("dashboard");
      });

      const btnHostTop = document.getElementById("btnHostTop");
      if (btnHostTop) btnHostTop.addEventListener("click", (e) => {
        e.preventDefault();
        if (!requireLogin()) return;
        showView("host");
      });

      const btnAuthTop = document.getElementById("btnAuthTop");
      if (btnAuthTop) btnAuthTop.addEventListener("click", (e) => {
        e.preventDefault();
        const user = getCurrentUser();
        if (user) showView("profile");
        else openAuthModal();
      });

      const btnAvatarTop = document.getElementById("btnAvatarTop");
      if (btnAvatarTop) btnAvatarTop.addEventListener("click", (e) => {
        e.preventDefault();
        const user = getCurrentUser();
        if (user) showView("profile");
        else openAuthModal();
      });
    })();

    // Protect important feature buttons (prevent use when not logged in)
    (function () {
      const protectedActions = ["toolCreateManual","toolCreateAI","toolLiveTournaments"];
      protectedActions.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("click", (e) => {
          if (!requireLogin()) { e.preventDefault(); e.stopPropagation(); }
        });
      });
    })();

    // Data-copy (clipboard) convenience
    (function () {
      document.querySelectorAll("[data-copy]").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const key = btn.getAttribute("data-copy");
          const v = document.getElementById(key)?.textContent || "";
          if (v) navigator.clipboard.writeText(v).then(() => alert("Copied")).catch(() => alert("Copy failed"));
        });
      });
    })();
  } // end attachHandlers


  // ---------------- Initialization ----------------
  onReady(() => {
    // Apply token if present in URL (SSO redirects)
    handleTokenInURL();

    // Hydrate UI if user already logged in
    document.addEventListener("DOMContentLoaded", () => {
  const existing = getCurrentUser();
  if (existing) {
    updateUIOnLogin(existing);
  }
});



    // Attach all event handlers
    attachHandlers();

    // Render last AI quiz if available
    renderLastAIQuizToDashboard();

    // Default view: dashboard if available, else leave as is
    if (document.getElementById("view-dashboard")) showView("dashboard");
  });

  // ---------------- Expose a small API for debugging ----------------
  window.Samarpan = {
    getCurrentUser,
    setCurrentUser,
    clearCurrentUser,
    showView,
    renderLastAIQuizToDashboard
  };
})();
