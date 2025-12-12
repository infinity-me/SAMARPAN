(function () {
  // ======================
  // Basic configuration
  // ======================
  const API_BASE = "http://localhost:5000"; // Backend base URL

  // ======================
  // Small helpers
  // ======================

  const safeParse = (s, fallback = null) => {
    try {
      return s ? JSON.parse(s) : fallback;
    } catch {
      return fallback;
    }
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

  // Run callback once DOM is ready
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  // ======================
  // View switching (SPA)
  // ======================
  function showView(name) {
    if (!name) return;
    const viewId = name.startsWith("view-") ? name : `view-${name}`;
    const next = document.getElementById(viewId);
    const views = Array.from(document.querySelectorAll(".view"));

    // Hide all views
    views.forEach((v) => {
      v.classList.remove("view-active", "view-anim-in");
    });

    // Show selected view + entry animation
    if (next) {
      next.classList.add("view-active");
      void next.offsetWidth; // force reflow so animation restarts
      next.classList.add("view-anim-in");
    } else if (views[0]) {
      views[0].classList.add("view-active");
    }

    // Neon flash line under topbar
    const flash = document.getElementById("switchFlash");
    if (flash) {
      flash.classList.remove("flash-go");
      void flash.offsetWidth;
      flash.classList.add("flash-go");
    }

    // Background slight float/zoom on tab change
    const body = document.body;
    if (body) {
      body.classList.remove("bg-tab-float");
      void body.offsetWidth;
      body.classList.add("bg-tab-float");
    }

    // Staggered animation for cards / blocks in the new view
    if (next) {
      const blocks = next.querySelectorAll(
        ".card, .toolbar-list li, .templates-grid .card, .stats-row .card, .activity-list li"
      );

      blocks.forEach((el, index) => {
        el.classList.remove("stagger-in");
        el.style.animationDelay = `${index * 0.06}s`;
        void el.offsetWidth;
        el.classList.add("stagger-in");
      });
    }
  }

  // ======================
  // Auth modal helpers
  // ======================
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

  // Gate features behind login and show modal if not logged in
  function requireLogin(message = "Please log in to use this feature.") {
    const user = getCurrentUser();
    if (!user) {
      openAuthModal();
      showStatusText(document.getElementById("authStatus"), message, "#b91c1c");
      return false;
    }
    return true;
  }

  // ===============================
  // Update UI when user logs in/out
  // ===============================
  function updateUIOnLogin(user) {
    const sidebarName = document.querySelector(".user-name");
    const sidebarRole = document.querySelector(".user-role");
    const sidebarAvatar = document.querySelector(".user-avatar");
    const avatarTop = document.getElementById("btnAvatarTop");
    const authBtnTop = document.getElementById("btnAuthTop");
    const btnLogout = document.getElementById("btnLogout");

    const displayName = (user && (user.name || user.email)) || "User";
    const firstLetter = displayName.charAt(0).toUpperCase();

    if (sidebarName) sidebarName.textContent = displayName;
    if (sidebarRole) sidebarRole.textContent = user ? "Logged in" : "Host";

    if (avatarTop) {
      if (user && user.avatar) {
        avatarTop.innerHTML = `<img src="${user.avatar}" class="profile-img" alt="avatar">`;
      } else {
        avatarTop.textContent = firstLetter;
      }
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

    if (btnLogout) {
      btnLogout.style.display = user ? "inline-flex" : "none";
    }

    // ---- PROFILE VIEW DATA ----
    const profileName = document.getElementById("profileName");
    const profileRole = document.getElementById("profileRole");
    const profileAvatar = document.getElementById("profileAvatar");

    if (profileName) {
      profileName.textContent = user?.name || user?.email || "User";
    }

    if (profileRole) {
      profileRole.textContent = "Host • Team Samarpan";
    }

    if (profileAvatar) {
      if (user?.avatar) {
        profileAvatar.innerHTML = `<img src="${user.avatar}" class="profile-img" />`;
      } else {
        profileAvatar.textContent =
          (user?.name || user?.email || "U").charAt(0).toUpperCase();
      }
    }

    // Sidebar avatar circle
    if (sidebarAvatar) {
      sidebarAvatar.innerHTML = "";

      if (user && user.avatar) {
        const img = document.createElement("img");
        img.src = user.avatar;
        img.alt = "avatar";
        img.className = "profile-img";
        sidebarAvatar.appendChild(img);
      } else {
        const letter = (user?.name || user?.email || "U")
          .charAt(0)
          .toUpperCase();
        sidebarAvatar.textContent = letter;
      }
    }
  }

  // ====================================
  // Social login token from redirect URL
  // ====================================
  function handleTokenInURL() {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      if (!token) return;

      const user = {
  token,
  userId: params.get("userId") || "",
  name: params.get("name") || "",
  email: params.get("email") || "",
  avatar: params.get("avatar") || "",
};

      setCurrentUser(user);
      updateUIOnLogin(user);

      const url = new URL(window.location);
      url.search = "";
      window.history.replaceState({}, document.title, url.toString());
    } catch (e) {
      console.warn("handleTokenInURL:", e);
    }
  }

  // ======================
  // Simple quiz player
  // ======================
  let playerQuiz = null;
  let playerIndex = 0;
  let playerCorrect = 0;
  let playerStartTime = 0;
  let playerQuestionStart = 0;

  function getPlayerEls() {
    return {
      title: document.getElementById("playerTitle"),
      subtitle: document.getElementById("playerSubtitle"),
      progress: document.getElementById("playerProgress"),
      timer: document.getElementById("playerTimer"),
      qText: document.getElementById("playerQuestionText"),
      options: document.getElementById("playerOptions"),
      status: document.getElementById("playerStatus"),
      nextBtn: document.getElementById("playerNextBtn"),
      resultCard: document.getElementById("playerResult"),
      scoreLine: document.getElementById("playerScoreLine"),
      timeLine: document.getElementById("playerTimeLine"),
      backBtn: document.getElementById("playerBackDashboard"),
      mainCard: document.getElementById("playerCard"),
    };
  }

  function startQuizPlayer(quiz) {
    const els = getPlayerEls();
    if (!els.qText) return; // view-player not in DOM

    if (!quiz || !quiz.questions || !quiz.questions.length) {
      els.qText.textContent = "Quiz data missing.";
      return;
    }

    playerQuiz = quiz;
    playerIndex = 0;
    playerCorrect = 0;
    playerStartTime = Date.now();
    playerQuestionStart = Date.now();

    if (els.title) els.title.textContent = quiz.title || "Quiz player";
    if (els.subtitle) {
      els.subtitle.textContent = quiz.topic
        ? `Topic: ${quiz.topic}`
        : "Answer the questions.";
    }

    if (els.resultCard) els.resultCard.style.display = "none";
    if (els.mainCard) els.mainCard.style.display = "block";

    renderPlayerQuestion();
    showView("player");
  }

  function renderPlayerQuestion() {
    const els = getPlayerEls();
    if (!playerQuiz || !playerQuiz.questions) return;

    const q = playerQuiz.questions[playerIndex];
    if (!q) return;

    if (els.progress) {
      els.progress.textContent = `Question ${playerIndex + 1} / ${
        playerQuiz.questions.length
      }`;
    }
    if (els.qText) els.qText.textContent = q.question || "";

    if (els.options) {
      els.options.innerHTML = "";
      q.options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-outline player-option-btn";
        btn.textContent = opt;
        btn.addEventListener("click", () => handlePlayerAnswer(idx));
        els.options.appendChild(btn);
      });
    }

    if (els.status) els.status.textContent = "";

    if (els.nextBtn) {
      els.nextBtn.disabled = true;
      els.nextBtn.textContent =
        playerIndex === playerQuiz.questions.length - 1
          ? "Finish quiz"
          : "Next question";
    }

    playerQuestionStart = Date.now();
  }

  function handlePlayerAnswer(idx) {
    const els = getPlayerEls();
    const q = playerQuiz?.questions?.[playerIndex];
    if (!q) return;

    const buttons = els.options?.querySelectorAll("button");
    buttons?.forEach((b, i) => {
      b.disabled = true;
      if (i === q.correctIndex) {
        b.classList.add("btn-correct");
      }
      if (i === idx && i !== q.correctIndex) {
        b.classList.add("btn-wrong");
      }
    });

    const timeForThis = (Date.now() - playerQuestionStart) / 1000;
    q._timeTakenSec = timeForThis;

    if (idx === q.correctIndex) {
      playerCorrect++;
      if (els.status) els.status.textContent = "Correct!";
    } else {
      if (els.status) {
        els.status.textContent =
          "Incorrect. Correct option: " + (q.options[q.correctIndex] || "");
      }
    }

    if (els.nextBtn) els.nextBtn.disabled = false;
  }

  function finishPlayerQuiz() {
    const els = getPlayerEls();
    if (!playerQuiz || !playerQuiz.questions) return;

    const totalQ = playerQuiz.questions.length;
    const totalTimeSec = (Date.now() - playerStartTime) / 1000;
    const avgTime = totalTimeSec / totalQ;

    if (els.scoreLine) {
      const percent = Math.round((playerCorrect / totalQ) * 100);
      els.scoreLine.textContent = `You scored ${playerCorrect} / ${totalQ} (${percent}%).`;
    }
    if (els.timeLine) {
      els.timeLine.textContent = `Total time ${totalTimeSec.toFixed(
        1
      )}s • Avg per question ${avgTime.toFixed(1)}s.`;
    }

    if (els.mainCard) els.mainCard.style.display = "block";
    if (els.resultCard) els.resultCard.style.display = "block";
    if (els.mainCard) els.mainCard.style.display = "none";
  }

  // ================================
  // Last AI quiz card in dashboard
  // ================================
  function renderLastAIQuizToDashboard() {
    try {
      const quizGrid =
        document.querySelector(".quiz-grid") ||
        document.getElementById("quizGrid");
      if (!quizGrid) return;

      const user = getCurrentUser && getCurrentUser();
      const keyPart =
        (user && (user.userId || user._id || user.email)) || "guest";
      const storageKey = `samarpanLastAIQuiz_${keyPart}`;

      const raw = localStorage.getItem(storageKey);
      if (!raw) return;

      const quiz = safeParse(raw, null);
      if (!quiz) return;

      // Remove older AI card from local storage, if present
      const old = quizGrid.querySelector('[data-local-ai-card="1"]');
      if (old) old.remove();

      const card = document.createElement("div");
      card.className = "quiz-card";
      card.setAttribute("data-local-ai-card", "1");

      const qcount = (quiz.questions && quiz.questions.length) || 0;
      card.innerHTML = `
        <h4>${quiz.title || "AI Quiz"}</h4>
        <p>${qcount} questions • AI-generated</p>
        <div class="quiz-meta">
          <small>AI • just now</small>
          <div style="margin-top:6px">
            <button class="mini-btn ai-play">Play</button>
            <button class="mini-btn ai-edit">Edit</button>
          </div>
        </div>
      `;

      // Play via same quiz player
      card.querySelector(".ai-play").addEventListener("click", () => {
        localStorage.setItem("samarpanCurrentQuiz", JSON.stringify(quiz));
        startQuizPlayer(quiz);
      });

      // Edit: jump to create view (future: prefill manual editor)
      card.querySelector(".ai-edit").addEventListener("click", () => {
        localStorage.setItem("samarpanCurrentQuiz", JSON.stringify(quiz));
        showView("create");
      });

      quizGrid.prepend(card);
    } catch (e) {
      console.warn("renderLastAIQuizToDashboard error:", e);
    }
  }

  // ==================================
  // Last manual quiz card in dashboard
  // ==================================
  function renderLastManualQuizToDashboard() {
    try {
      const quizGrid =
        document.querySelector(".quiz-grid") ||
        document.getElementById("quizGrid");
      if (!quizGrid) return;

      const user = getCurrentUser && getCurrentUser();
      const keyPart =
        (user && (user.userId || user._id || user.email)) || "guest";
      const storageKey = `samarpanLastManualQuiz_${keyPart}`;

      const raw = localStorage.getItem(storageKey);
      if (!raw) return;

      const quiz = safeParse(raw, null);
      if (!quiz) return;

      // Remove previous manual-quiz card
      const old = quizGrid.querySelector('[data-local-manual-card="1"]');
      if (old) old.remove();

      const card = document.createElement("div");
      card.className = "quiz-card";
      card.setAttribute("data-local-manual-card", "1");

      const qcount = (quiz.questions && quiz.questions.length) || 0;
      card.innerHTML = `
        <h4>${quiz.title || "My manual quiz"}</h4>
        <p>${qcount} questions • Manual</p>
        <div class="quiz-meta">
          <small>Created by you</small>
          <div style="margin-top:6px">
            <button class="mini-btn manual-play">Play</button>
            <button class="mini-btn manual-host">Host</button>
          </div>
        </div>
      `;

      // Play via quiz player
      card.querySelector(".manual-play").addEventListener("click", () => {
        localStorage.setItem("samarpanCurrentQuiz", JSON.stringify(quiz));
        startQuizPlayer(quiz);
      });

      // Host: open host view and preselect this quiz (manual-last)
      card.querySelector(".manual-host").addEventListener("click", () => {
        const hostSelect = document.getElementById("host-quiz");
        if (hostSelect) {
          let opt = Array.from(hostSelect.options).find(
            (o) => o.value === "manual-last"
          );
          if (!opt) {
            opt = document.createElement("option");
            opt.value = "manual-last";
            opt.textContent = quiz.title || "My last manual quiz";
            hostSelect.appendChild(opt);
          }
          hostSelect.value = "manual-last";
        }
        showView("host");
        const hostForm = document.querySelector(".host-form");
        if (hostForm) {
          hostForm.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });

      quizGrid.prepend(card);
    } catch (e) {
      console.warn("renderLastManualQuizToDashboard error:", e);
    }
  }

  // Hide full-page auth view (we use modal instead)
  function hideAuthView() {
    const authView = document.getElementById("view-auth");
    if (authView) {
      authView.style.display = "none";
    }
  }

  // ======================
  // Event bindings
  // ======================
  function attachHandlers() {
    // Sidebar open/close on small screens
    (function () {
      const sidebar = document.querySelector(".sidebar");
      const sidebarToggle = document.getElementById("sidebarToggle");
      const main = document.querySelector(".main");
      if (sidebar && sidebarToggle) {
        sidebarToggle.addEventListener("click", () =>
          sidebar.classList.toggle("open")
        );
      }
      if (main && sidebar) {
        main.addEventListener("click", () => sidebar.classList.remove("open"));
      }
    })();

    // All buttons/links having data-view attribute
    (function () {
      document.querySelectorAll("[data-view]").forEach((el) => {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          const view = el.getAttribute("data-view");
          const user = getCurrentUser();

          // If user is logged in and clicks auth view, send them to dashboard instead
          if ((view === "view-auth" || view === "view-login") && user) {
            showView("dashboard");
            return;
          }

          showView(view);

          // Sidebar active state
          if (el.classList.contains("side-link")) {
            document
              .querySelectorAll(".side-link")
              .forEach((b) => b.classList.remove("active"));
            el.classList.add("active");
          }
        });
      });
    })();

    // ==========================
    // Auth modal core references
    // ==========================
    const authOverlay = document.getElementById("authOverlay");
    const authCloseBtn = document.getElementById("authCloseBtn");
    const tabLogin = document.getElementById("tabLogin");
    const tabSignup = document.getElementById("tabSignup");
    const loginPanel = document.getElementById("loginPanel");
    const signupPanel = document.getElementById("signupPanel");
    const authTitle = document.getElementById("authTitle");
    const authSubtitle = document.getElementById("authSubtitle");
    const authStatus = document.getElementById("authStatus");
    const authGoSignup = document.getElementById("authGoSignup");

    // Close modal (X button)
    if (authCloseBtn) {
      authCloseBtn.addEventListener("click", closeAuthModal);
    }

    // Click on dark overlay closes modal
    if (authOverlay) {
      authOverlay.addEventListener("click", (e) => {
        if (e.target === authOverlay) {
          closeAuthModal();
        }
      });
    }

    // Escape key closes modal
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAuthModal();
      }
    });

    // ==========================
    // Auth tabs (Login / Signup)
    // ==========================
    if (tabLogin && tabSignup && loginPanel && signupPanel) {
      tabLogin.addEventListener("click", () => {
        tabLogin.classList.add("auth-tab-active");
        tabSignup.classList.remove("auth-tab-active");
        loginPanel.style.display = "block";
        signupPanel.style.display = "none";
        if (authTitle) authTitle.textContent = "Log in";
        if (authSubtitle)
          authSubtitle.textContent = "Sign in to continue using Samarpan.";
        if (authStatus) authStatus.textContent = "";
      });

      tabSignup.addEventListener("click", () => {
        tabSignup.classList.add("auth-tab-active");
        tabLogin.classList.remove("auth-tab-active");
        loginPanel.style.display = "none";
        signupPanel.style.display = "block";
        if (authTitle) authTitle.textContent = "Create your Samarpan account";
        if (authSubtitle)
          authSubtitle.textContent =
            "Tournaments, quizzes and rating in one place.";
        if (authStatus) authStatus.textContent = "";
      });
    }

    // “Don’t have an account? Sign up” shortcut
    if (authGoSignup && tabSignup) {
      authGoSignup.addEventListener("click", (e) => {
        e.preventDefault();
        tabSignup.click();
      });
    }

    // ======================
    // Signup (email/password)
    // ======================
    (function () {
      const signupBtn = document.getElementById("signupSubmit");
      if (!signupBtn) return;

      signupBtn.addEventListener("click", async () => {
        const name = document.getElementById("signupName")?.value.trim();
        const email = document.getElementById("signupEmail")?.value.trim();
        const password = document
          .getElementById("signupPassword")
          ?.value.trim();

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
            showStatusText(
              authStatus,
              data.error || "Signup failed.",
              "#b91c1c"
            );
            return;
          }
          showStatusText(
            authStatus,
            "Signup successful! You can log in now.",
            "#16a34a"
          );
          tabLogin?.click();
        } catch (err) {
          console.error("Signup error:", err);
          showStatusText(
            authStatus,
            "Network error. Please try again.",
            "#b91c1c"
          );
        }
      });
    })();

    // ======================
    // Login (email/password)
    // ======================
    (function () {
      const loginBtn = document.getElementById("loginSubmit");
      if (!loginBtn) return;

      loginBtn.addEventListener("click", async () => {
        const email = document.getElementById("loginEmail")?.value.trim();
        const password = document
          .getElementById("loginPassword")
          ?.value.trim();

        if (!email || !password) {
          showStatusText(
            authStatus,
            "Enter email and password.",
            "#b91c1c"
          );
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
            showStatusText(
              authStatus,
              data.error || "Login failed.",
              "#b91c1c"
            );
            return;
          }

          // Success
          showStatusText(authStatus, "Login successful!", "#16a34a");

          localStorage.setItem("samarpanUser", JSON.stringify(data));
          updateUIOnLogin(data);
          hideAuthView();

          if (document.getElementById("view-dashboard")) {
            showView("dashboard");
          }

          setTimeout(() => {
            closeAuthModal();
          }, 700);
        } catch (err) {
          console.error("Login error:", err);
          showStatusText(
            authStatus,
            "Network error. Please try again.",
            "#b91c1c"
          );
        }
      });
    })();

    // ======================
    // Social login buttons
    // ======================
    (function () {
      const socialGoogle = document.getElementById("socialGoogle");
      if (socialGoogle) {
        socialGoogle.addEventListener("click", () => {
          window.location.href = `${API_BASE}/auth/google`;
        });
      }
      const socialFacebook = document.getElementById("socialFacebook");
      if (socialFacebook) {
        socialFacebook.addEventListener("click", () => {
          window.location.href = `${API_BASE}/auth/facebook`;
        });
      }
    })();

    // ======================
    // AI quiz generation
    // ======================
    (function () {
      const aiGenerateBtn = document.getElementById("aiGenerateBtn");
      const aiStatus = document.getElementById("aiStatus");
      const aiPlayBtn = document.getElementById("aiPlayBtn");
      if (!aiGenerateBtn) return;

      aiGenerateBtn.addEventListener("click", async () => {
        if (!requireLogin("Please log in to generate AI quizzes.")) return;

        const currentUser = getCurrentUser();
        const titleRaw = document.getElementById("aiTitle")?.value.trim();
        const topic = document.getElementById("aiTopic")?.value.trim();
        const difficulty =
          document.getElementById("aiDifficulty")?.value || "medium";
        const questionCount =
          Number(document.getElementById("aiCount")?.value) || 5;
        const title = titleRaw || "AI Quiz";

        if (!topic) {
          showStatusText(
            aiStatus,
            "Please enter a topic for the quiz.",
            "#b91c1c"
          );
          return;
        }
        showStatusText(aiStatus, "Generating AI quiz...", "#4b5563");

        try {
          const res = await fetch(`${API_BASE}/api/ai/generate-quiz`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              topic,
              difficulty,
              count: questionCount,
              userId:
                currentUser?.userId ||
                currentUser?._id ||
                currentUser?.email,
              tags: [topic.toLowerCase()],
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            showStatusText(
              aiStatus,
              data.error || "AI quiz generation failed.",
              "#b91c1c"
            );
            return;
          }

          // Save quiz in localStorage per user
          if (data.quiz) {
            const u = getCurrentUser && getCurrentUser();
            const keyPart =
              (u && (u.userId || u._id || u.email)) || "guest";
            const storageKey = `samarpanLastAIQuiz_${keyPart}`;
            localStorage.setItem(storageKey, JSON.stringify(data.quiz));
          }

          showStatusText(
            aiStatus,
            "AI quiz generated successfully!",
            "#16a34a"
          );
          renderLastAIQuizToDashboard();

          if (aiPlayBtn && data.quiz) {
            aiPlayBtn.style.display = "inline-flex";
            aiPlayBtn.onclick = () => {
              startQuizPlayer(data.quiz);
            };
          }
        } catch (err) {
          console.error("AI Quiz Error:", err);
          showStatusText(
            aiStatus,
            "Network error while generating quiz.",
            "#b91c1c"
          );
        }
      });
    })();

    // ======================
    // Quiz player buttons
    // ======================
    (function () {
      const nextBtn = document.getElementById("playerNextBtn");
      const backBtn = document.getElementById("playerBackDashboard");

      if (nextBtn) {
        nextBtn.addEventListener("click", () => {
          if (!playerQuiz || !playerQuiz.questions) return;

          if (playerIndex < playerQuiz.questions.length - 1) {
            playerIndex++;
            renderPlayerQuestion();
          } else {
            finishPlayerQuiz();
          }
        });
      }

      if (backBtn) {
        backBtn.addEventListener("click", () => {
          showView("dashboard");
        });
      }
    })();

    // ==================================
    // Manual quiz editor (create view)
    // ==================================
    (function () {
      let manualQuestions = [];

      const addBtn = document.getElementById("btnAddQuestion");
      const saveBtn = document.getElementById("btnSaveManualQuiz");
      const listEl = document.getElementById("manualQuestionList");
      const statusEl = document.getElementById("manualEditorStatus");

      const titleInput = document.getElementById("manualTitle");
      const topicInput = document.getElementById("manualTopic");
      const diffSelect = document.getElementById("manualDifficulty");

      if (!addBtn || !saveBtn) {
        console.warn("Manual editor buttons not found in DOM.");
        return;
      }

      const API =
        typeof API_BASE !== "undefined" ? API_BASE : "http://localhost:5000";

      function setStatus(msg, color = "#e5e7eb") {
        if (!statusEl) return;
        statusEl.textContent = msg;
        statusEl.style.color = color;
      }

      function renderQuestionList() {
        if (!listEl) return;

        if (!manualQuestions.length) {
          listEl.innerHTML =
            '<p style="margin:0; color:#9ca3af;">No questions added yet.</p>';
          return;
        }

        const html = manualQuestions
          .map((q, idx) => {
            const safeText =
              q.question.length > 80
                ? q.question.slice(0, 77) + "..."
                : q.question;
            return `
              <div style="
                border:1px solid #1f2937;
                border-radius:8px;
                padding:0.4rem 0.6rem;
                margin-bottom:0.4rem;
                font-size:0.82rem;
              ">
                <strong>Q${idx + 1}.</strong> ${safeText}<br/>
                <span style="color:#9ca3af;">Options: ${
                  q.options.length
                }, Correct: ${q.correctIndex + 1}, Diff: ${q.difficulty}</span>
              </div>
            `;
          })
          .join("");

        listEl.innerHTML = html;
      }

      // Add a single question to the in-memory quiz
      addBtn.addEventListener("click", () => {
        const qTextEl = document.getElementById("qText");
        const opt0El = document.getElementById("opt0");
        const opt1El = document.getElementById("opt1");
        const opt2El = document.getElementById("opt2");
        const opt3El = document.getElementById("opt3");
        const corrEl = document.getElementById("correctIndex");
        const explEl = document.getElementById("qExplanation");

        if (!qTextEl || !opt0El || !opt1El || !corrEl) {
          console.error("Manual editor inputs missing in DOM.");
          return;
        }

        const question = qTextEl.value.trim();
        const o0 = opt0El.value.trim();
        const o1 = opt1El.value.trim();
        const o2 = opt2El?.value.trim() || "";
        const o3 = opt3El?.value.trim() || "";
        const explanation = explEl?.value.trim() || "";
        const correctIndex = Number(corrEl.value || "0");

        if (!question) {
          setStatus("Please enter a question.", "#b91c1c");
          return;
        }
        if (!o0 || !o1) {
          setStatus("Please enter at least two options.", "#b91c1c");
          return;
        }

        const options = [o0, o1];
        if (o2) options.push(o2);
        if (o3) options.push(o3);

        if (correctIndex < 0 || correctIndex >= options.length) {
          setStatus(
            "Correct option index does not match filled options.",
            "#b91c1c"
          );
          return;
        }

        const difficulty = diffSelect?.value || "medium";

        const newQ = {
          question,
          options,
          correctIndex,
          explanation,
          difficulty,
        };

        manualQuestions.push(newQ);

        qTextEl.value = "";
        opt0El.value = "";
        opt1El.value = "";
        if (opt2El) opt2El.value = "";
        if (opt3El) opt3El.value = "";
        if (explEl) explEl.value = "";
        corrEl.value = "0";

        setStatus(
          `Question added (${manualQuestions.length} in quiz).`,
          "#16a34a"
        );
        renderQuestionList();
      });

      // Save the quiz to backend + localStorage
      saveBtn.addEventListener("click", async () => {
        const title = titleInput?.value.trim() || "";
        const topic = topicInput?.value.trim() || "";

        if (!title) {
          setStatus("Please enter a quiz title before saving.", "#b91c1c");
          return;
        }
        if (!manualQuestions.length) {
          setStatus("Add at least one question before saving.", "#b91c1c");
          return;
        }

        let user = null;
        if (typeof getCurrentUser === "function") {
          user = getCurrentUser();
        }
        if (!user) {
          if (typeof requireLogin === "function") {
            requireLogin("Please log in to save a quiz.");
          }
          setStatus("You must be logged in to save quizzes.", "#b91c1c");
          return;
        }

        const authorId = user.userId || user._id || user.email;

        const payload = {
          title,
          topic,
          authorId,
          questions: manualQuestions,
          aiGenerated: false,
          tags: topic ? [topic.toLowerCase()] : [],
        };

        setStatus("Saving quiz...", "#4b5563");

        try {
          const res = await fetch(`${API}/api/quizzes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const data = await res.json();
          if (!res.ok) {
            console.error("Save quiz error:", data);
            setStatus(data.error || "Failed to save quiz.", "#b91c1c");
            return;
          }

          setStatus("Quiz saved successfully to Samarpan!", "#16a34a");
          console.log("Saved quiz:", data);

          // Persist last manual quiz per user
          try {
            const quizToStore = data.quiz || data.quizDoc || data;

            const u =
              typeof getCurrentUser === "function" ? getCurrentUser() : null;
            const userKeyPart =
              (u && (u.userId || u._id || u.email)) || "guest";

            const storageKey = `samarpanLastManualQuiz_${userKeyPart}`;
            localStorage.setItem(storageKey, JSON.stringify(quizToStore));
          } catch (e) {
            console.warn("Could not store last manual quiz:", e);
          }

          // Update dashboard card
          renderLastManualQuizToDashboard();

          // Reset local state
          manualQuestions = [];
          renderQuestionList();
          if (titleInput) titleInput.value = "";
          if (topicInput) topicInput.value = "";
          if (diffSelect) diffSelect.value = "medium";
        } catch (err) {
          console.error("Network error while saving quiz:", err);
          setStatus("Network error while saving quiz.", "#b91c1c");
        }
      });

      renderQuestionList();
    })();

    // Add "My last manual quiz" into host dropdown on load (if exists)
    (function () {
      const select = document.getElementById("host-quiz");
      if (!select) return;

      const user =
        typeof getCurrentUser === "function" ? getCurrentUser() : null;
      const userKeyPart =
        (user && (user.userId || user._id || user.email)) || "guest";

      const storageKey = `samarpanLastManualQuiz_${userKeyPart}`;
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;

      const quiz = safeParse(raw, null);
      if (!quiz) return;

      const already = Array.from(select.options).some(
        (opt) => opt.value === "manual-last"
      );
      if (already) return;

      const opt = document.createElement("option");
      opt.value = "manual-last";
      opt.textContent = quiz.title || "My last manual quiz";
      select.appendChild(opt);
    })();

    // ======================
    // Legacy leaderboard / explore / rating history (UI hooks)
    // ======================
    (function () {
      const btn = document.getElementById("leaderboardBtn");
      if (!btn) return;
      btn.addEventListener("click", async () => {
        try {
          const res = await fetch(`${API_BASE}/leaderboard`);
          if (!res.ok) {
            alert("Failed to fetch leaderboard");
            return;
          }
          const data = await res.json();
          const container = document.getElementById("leaderboardContainer");
          if (container) {
            container.innerHTML = (data.scores || [])
              .map(
                (s) =>
                  `<div class="leader-item"><span>${s.name}</span><span>${s.score}</span></div>`
              )
              .join("");
          }
          showView("leaderboard");
        } catch (err) {
          console.error("leaderboard err:", err);
          alert("Error loading leaderboard");
        }
      });
    })();

    (function () {
      const btn = document.getElementById("exploreBtn");
      if (!btn) return;
      btn.addEventListener("click", async () => {
        try {
          const res = await fetch(`${API_BASE}/quizzes/public`);
          if (!res.ok) {
            alert("Failed to fetch public quizzes");
            return;
          }
          const data = await res.json();
          const container = document.getElementById("exploreContainer");
          if (container) {
            container.innerHTML = (data.quizzes || [])
              .map(
                (q) =>
                  `<div class="explore-item"><h4>${q.title}</h4><p>${
                    (q.questions && q.questions.length) || 0
                  } questions</p></div>`
              )
              .join("");
          }
          showView("explore");
        } catch (err) {
          console.error("explore err:", err);
          alert("Error loading explore");
        }
      });
    })();

    (function () {
      const btn = document.getElementById("ratingHistoryBtn");
      if (!btn) return;
      btn.addEventListener("click", async () => {
        const user = getCurrentUser();
        if (!user) {
          alert("Please login first");
          return;
        }
        try {
          const res = await fetch(
            `${API_BASE}/ratings/${encodeURIComponent(user.email)}`
          );
          if (!res.ok) {
            alert("Could not fetch rating history");
            return;
          }
          const data = await res.json();
          const modal = document.getElementById("ratingModal");
          const container = document.getElementById("ratingHistoryContainer");
          if (!modal || !container) {
            alert("Rating UI not present");
            return;
          }
          container.innerHTML = (data.history || [])
            .map(
              (h) =>
                `<div class="rating-item"><strong>${h.rating}</strong> — ${new Date(
                  h.date
                ).toLocaleString()}</div>`
            )
            .join("");
          modal.style.display = "block";
        } catch (err) {
          console.error("rating history err:", err);
          alert("Failed to fetch rating history");
        }
      });
    })();

    // ======================
    // Profile + logout button
    // ======================
    (function () {
      const profileBtn = document.getElementById("profileBtn");
      if (profileBtn) {
        profileBtn.addEventListener("click", () => {
          const user = getCurrentUser();
          if (!user) {
            openAuthModal();
            return;
          }
          const profileName = document.getElementById("profileName");
          const profileEmail = document.getElementById("profileEmail");
          if (profileName) profileName.textContent = user.name || "";
          if (profileEmail) profileEmail.textContent = user.email || "";
          showView("profile");
        });
      }

      const btnLogout = document.getElementById("btnLogout");
      if (btnLogout) {
        btnLogout.addEventListener("click", (e) => {
          e.preventDefault();
          clearCurrentUser();
          updateUIOnLogin(null);
          showView("dashboard");
        });
      }
    })();

    // ======================
    // Dashboard toolbar shortcuts
    // ======================
    (function () {
      const toolCreateManual = document.getElementById("toolCreateManual");
      const toolCreateAI = document.getElementById("toolCreateAI");
      const toolLiveTournaments =
        document.getElementById("toolLiveTournaments");
      const hostSelect = document.getElementById("host-quiz");

      // Manual create from toolbar
      if (toolCreateManual) {
        toolCreateManual.addEventListener("click", () => {
          if (!requireLogin("Please log in to create a quiz.")) return;
          showView("create");

          const btnOpenEditor = document.getElementById("btnOpenManualEditor");
          if (btnOpenEditor) {
            btnOpenEditor.click();
          }
        });
      }

      // AI create from toolbar
      if (toolCreateAI) {
        toolCreateAI.addEventListener("click", () => {
          if (!requireLogin("Please log in to use AI quizzes.")) return;

          showView("create");

          const aiCard = document.querySelector(
            "#view-create .create-card:nth-of-type(2)"
          );
          if (aiCard) {
            aiCard.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      }

      // Live tournaments -> redirect to host view for now
      if (toolLiveTournaments) {
        toolLiveTournaments.addEventListener("click", () => {
          if (!requireLogin("Please log in to host tournaments.")) return;
          showView("host");

          const hostForm = document.querySelector(".host-form");
          if (hostForm) {
            hostForm.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      }

      // “Host again” buttons inside dashboard quiz cards
      const hostAgainButtons = Array.from(
        document.querySelectorAll(".quiz-card .mini-btn")
      ).filter((btn) =>
        (btn.textContent || "").toLowerCase().includes("host again")
      );

      hostAgainButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          if (!requireLogin("Please log in to host a quiz.")) return;

          const card = btn.closest(".quiz-card");
          const title = card?.querySelector("h4")?.textContent?.trim();

          if (hostSelect && title) {
            const match = Array.from(hostSelect.options).find(
              (opt) => opt.textContent.trim() === title
            );
            if (match) {
              hostSelect.value = match.value;
            }
          }

          showView("host");

          const hostForm = document.querySelector(".host-form");
          if (hostForm) {
            hostForm.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      });
    })();

    // ======================
    // Host quiz button logic
    // ======================
    (function () {
      const btn = document.getElementById("btnHostStart");
      const statusEl = document.getElementById("hostStatus");
      const selectQuiz = document.getElementById("host-quiz");
      const selectMode = document.getElementById("host-mode");
      const inputTimer = document.getElementById("host-timer");
      const selectRated = document.getElementById("host-rating");

      function setHostStatus(msg, color = "#e5e7eb") {
        if (!statusEl) return;
        statusEl.textContent = msg;
        statusEl.style.color = color;
      }

      if (!btn || !selectQuiz) return;

      btn.addEventListener("click", async () => {
        if (!requireLogin("Please log in to host a quiz.")) return;

        const user = getCurrentUser();
        if (!user) return;

        const selected = selectQuiz.value;
        let quizId = null;

        // For now, only treating "My last manual quiz" as hostable
        if (selected === "manual-last") {
          const userKeyPart =
            user.userId || user._id || user.email || "guest";
          const storageKey = `samarpanLastManualQuiz_${userKeyPart}`;
          const raw = localStorage.getItem(storageKey);
          const quiz = safeParse(raw, null);
          quizId = quiz && (quiz._id || quiz.quizId);
        }

        if (!quizId) {
          alert(
            "Right now, hosting is enabled only for your last manual/AI quiz.\nSelect it in the dropdown."
          );
          return;
        }

        const modeText = (selectMode.value || "").toLowerCase();
        let mode = "rapid";
        if (modeText.includes("blitz")) mode = "blitz";
        else if (modeText.includes("casual")) mode = "casual";

        const timerSeconds = Number(inputTimer.value) || 30;
        const rated = !selectRated.value.toLowerCase().includes("casual");

        setHostStatus("Creating game session...", "#4b5563");

        try {
          const res = await fetch(`${API_BASE}/api/host/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quizId,
              hostEmail: user.email,
              mode,
              timerSeconds,
              rated,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            console.error("Host start error:", data);
            setHostStatus(data.error || "Failed to start game.", "#b91c1c");
            return;
          }

          setHostStatus(
            `Game started! PIN: ${data.pin}. Share this with players.`,
            "#16a34a"
          );
          alert(`Game PIN: ${data.pin}\n(Prototype – join UI is coming soon)`);
        } catch (err) {
          console.error("Host start network error:", err);
          setHostStatus("Network error while starting game.", "#b91c1c");
        }
      });
    })();

    // ======================
    // Battles view (2v2 / 4v4)
    // ======================
    (function () {
      const selectBattleQuiz = document.getElementById("battle-quiz");
      const statusEl = document.getElementById("battleStatus");
      const btnHost = document.getElementById("btnBattleHost");
      const btnLocal = document.getElementById("btnBattlePlayLocal");
      const btnJoin = document.getElementById("btnBattleJoin");

      function setBattleStatus(msg, color = "#e5e7eb") {
        if (!statusEl) return;
        statusEl.textContent = msg;
        statusEl.style.color = color;
      }

      // Label per-user battle quiz options
      if (selectBattleQuiz) {
        const user = getCurrentUser && getCurrentUser();
        const userKeyPart =
          (user && (user.userId || user._id || user.email)) || "guest";

        // Manual last
        const optManual = selectBattleQuiz.querySelector(
          'option[value="manual-last"]'
        );
        if (optManual) {
          const key = `samarpanLastManualQuiz_${userKeyPart}`;
          const raw = localStorage.getItem(key);
          const quiz = raw && safeParse(raw, null);
          if (quiz && quiz.title) {
            optManual.textContent = `${quiz.title} (manual)`;
          } else {
            optManual.disabled = true;
          }
        }

        // AI last
        const optAI = selectBattleQuiz.querySelector('option[value="ai-last"]');
        if (optAI) {
          const key = `samarpanLastAIQuiz_${userKeyPart}`;
          const raw = localStorage.getItem(key);
          const quiz = raw && safeParse(raw, null);
          if (quiz && quiz.title) {
            optAI.textContent = `${quiz.title} (AI)`;
          } else {
            optAI.disabled = true;
          }
        }
      }

      // Create battle session (backend pin + metadata)
      if (btnHost) {
        btnHost.addEventListener("click", async () => {
          if (!requireLogin("Please log in to host a battle.")) return;

          const user = getCurrentUser();
          if (!user) return;

          const selectQuiz = document.getElementById("battle-quiz");
          const battleType =
            document.getElementById("battle-type")?.value || "2v2";
          const timerSeconds =
            Number(document.getElementById("battle-timer")?.value) || 30;
          const rated =
            (document.getElementById("battle-rated")?.value || "rated") ===
            "rated";

          if (!selectQuiz || !selectQuiz.value) {
            setBattleStatus(
              "Choose which quiz to use for the battle.",
              "#b91c1c"
            );
            return;
          }

          const userKeyPart =
            user.userId || user._id || user.email || "guest";

          let quiz = null;
          if (selectQuiz.value === "manual-last") {
            const key = `samarpanLastManualQuiz_${userKeyPart}`;
            const raw = localStorage.getItem(key);
            quiz = raw && safeParse(raw, null);
          } else if (selectQuiz.value === "ai-last") {
            const key = `samarpanLastAIQuiz_${userKeyPart}`;
            const raw = localStorage.getItem(key);
            quiz = raw && safeParse(raw, null);
          }

          const quizId = quiz && (quiz._id || quiz.quizId);
          if (!quizId) {
            setBattleStatus(
              "Could not find quiz data for this option.",
              "#b91c1c"
            );
            return;
          }

          setBattleStatus("Creating battle session...", "#4b5563");

          try {
            const res = await fetch(`${API_BASE}/api/host/start`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                quizId,
                hostEmail: user.email,
                mode: "battle",
                battleType,
                timerSeconds,
                rated,
              }),
            });

            const data = await res.json();
            if (!res.ok) {
              console.error("Battle host error:", data);
              setBattleStatus(
                data.error || "Failed to create battle.",
                "#b91c1c"
              );
              return;
            }

            setBattleStatus(
              `Battle created! Share PIN: ${data.pin}`,
              "#16a34a"
            );
            alert(
              `Battle created!\n\nPIN: ${data.pin}\nType: ${battleType.toUpperCase()}\n\n(Prototype – friends will join manually using this PIN.)`
            );
          } catch (err) {
            console.error("Battle host network err:", err);
            setBattleStatus(
              "Network error while creating battle.",
              "#b91c1c"
            );
          }
        });
      }

      // Local battle (same device, uses quiz player)
      if (btnLocal) {
        btnLocal.addEventListener("click", () => {
          if (!requireLogin("Please log in to play.")) return;

          const user = getCurrentUser();
          if (!user) return;

          const selectQuiz = document.getElementById("battle-quiz");
          if (!selectQuiz || !selectQuiz.value) {
            alert("Please choose which quiz to use for the battle first.");
            return;
          }

          const userKeyPart =
            user.userId || user._id || user.email || "guest";
          let key = null;

          if (selectQuiz.value === "manual-last") {
            key = `samarpanLastManualQuiz_${userKeyPart}`;
          } else if (selectQuiz.value === "ai-last") {
            key = `samarpanLastAIQuiz_${userKeyPart}`;
          } else {
            alert(
              "For this prototype, only your last manual / AI quiz is supported."
            );
            return;
          }

          const raw = localStorage.getItem(key);
          const quiz = raw && safeParse(raw, null);
          if (!quiz || !quiz.questions || !quiz.questions.length) {
            alert("Could not load quiz questions from storage.");
            return;
          }

          startQuizPlayer(quiz);
        });
      }

      // Join battle: prototype confirmation only
      if (btnJoin) {
        btnJoin.addEventListener("click", () => {
          const pin =
            document.getElementById("battleJoinPin")?.value.trim() || "";
          const name =
            document.getElementById("battleJoinName")?.value.trim() || "";

          if (!pin) {
            alert("Enter the battle PIN shared by your friend.");
            return;
          }
          if (!name) {
            alert("Enter your name or team name.");
            return;
          }

          alert(
            `Prototype:\nJoining battle PIN ${pin} as "${name}".\n\nLive multi-player UI will be added in the full version (Socket.io).`
          );
        });
      }
    })();

    // ======================
    // Topbar auth / host buttons
    // ======================
    (function () {
      const btnAuthTop = document.getElementById("btnAuthTop");
      const btnAvatarTop = document.getElementById("btnAvatarTop");
      const btnHostTop = document.getElementById("btnHostTop");

      function handleAuthClick(e) {
        e.preventDefault();
        const user = getCurrentUser();
        if (user) {
          showView("profile");
        } else {
          openAuthModal();
        }
      }

      if (btnAuthTop) {
        btnAuthTop.addEventListener("click", handleAuthClick);
      }
      if (btnAvatarTop) {
        btnAvatarTop.addEventListener("click", handleAuthClick);
      }

      if (btnHostTop) {
        btnHostTop.addEventListener("click", (e) => {
          e.preventDefault();
          if (!getCurrentUser()) {
            openAuthModal();
          } else {
            showView("host");
          }
        });
      }
    })();
  }

  // ======================
  // Initial boot
  // ======================
  onReady(() => {
    // Handle redirect token from Google/Facebook
    handleTokenInURL();

    // Restore user if already logged in
    const existing = getCurrentUser();
    if (existing) {
      updateUIOnLogin(existing);
    }

    // Bind all events
    attachHandlers();

    // Show last AI / manual quiz cards if present
    renderLastAIQuizToDashboard();
    renderLastManualQuizToDashboard();

    // Default view
    if (document.getElementById("view-dashboard")) {
      showView("dashboard");
    }
  });

  // ======================
  // Manual editor open button
  // ======================
  (function () {
    const openBtn = document.getElementById("btnOpenManualEditor");
    const editor = document.getElementById("manualEditor");

    if (!openBtn || !editor) return;

    openBtn.addEventListener("click", (e) => {
      e.preventDefault();
      editor.style.display = "block";
      editor.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  })();

  // ======================
  // Simple debug handle
  // ======================
  window.Samarpan = {
    getCurrentUser,
    setCurrentUser,
    clearCurrentUser,
    showView,
    renderLastAIQuizToDashboard,
  };
})();
