/* ═══════════════════════════════════════════════════════════════
   DENTOVERSE — NOVA AI · Phase 2 Chat Bridge (additive, safe)
   ───────────────────────────────────────────────────────────────
   Loaded AFTER assets/js/assistant.js. Its ONLY job is to
   upgrade Nova with the Phase-2 behaviour while leaving every
   existing chat feature untouched.

   What this bridge does:

     • Wires NovaCore → assistant's Knowledge, Signals, Personalize.
       When NovaCore is absent or fails, the chat keeps using the
       assistant.js built-in search — graceful degradation only.

     • Registers the live RESOURCE / SECTIONS catalog with
       NovaTools so tools (search / locate / recommend / compare /
       translate / guide / openResource / web / refine) can
       dispatch against the actual hub.

     • Hooks the message handler so each turn is routed through
       NovaCore.Intent first. If a tool matches, the bridge treats
       the tool output as PRELIMINARY metadata and lets the LLM
       (or local brain) synthesize a real answer on top.

     • Adds an "index freshness" banner — visible only when the
       knowledge base is older than the recommended refresh window,
       letting users / cron jobs trigger a refresh manually.

     • Adds a "Compare" mode renderer for tool outputs that look
       like topic-vs-topic requests.

     • Sends a "tool" + "lang" + "dialect" hint to /api/nova on
       every POST so the server-side system prompt can pick the
       right behaviour even before it sees the user's text.

     • Sends personalized suggestions (recent topics, favourite
       resources) as starter chips when Nova has signal data.

   Designed & Produced by Abdel Rahman Teba © ®
   ═══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  if (typeof window === "undefined") return;

  const Bridge = { enabled: !!(window.NovaCore && window.NovaTools), ready: false };

  function safe(fn) { try { return fn(); } catch (e) { return null; } }

  /* ───────── register context with NovaTools ───────── */
  function registerToolingContext() {
    if (!window.NovaTools) return;
    if (typeof window.NovaTools.registerContext !== "function") return;
    safe(() => window.NovaTools.registerContext({
      resources: (typeof window.RESOURCES !== "undefined" && window.RESOURCES) || [],
      sections:   (typeof window.SECTIONS   !== "undefined" && window.SECTIONS)   || [],
      helpers: {
        lang: (text) => (window.NovaCore && window.NovaCore.Lang && window.NovaCore.Lang.detect(text)) || { lang: "en", rtl: false }
      }
    }));
  }

  /* ───────── index freshness banner ───────── */
  function maybeShowFreshnessBanner() {
    if (!window.NovaAssistant || !window.NovaAssistant.searchKnowledge) return;
    if (!window.NovaCore || !window.NovaCore.Status) return;
    safe(() => {
      window.NovaCore.Status.refresh();
      const st = window.NovaCore.Status;
      if (!st.knowledge.ready || !st.knowledge.docs) return;
      if (!st.knowledge.stale) return;
      // Use the existing toast helper if available, otherwise console.
      const det = (window.NovaCore.Lang && window.NovaCore.Lang.detect("")) || { lang: "en" };
      const msg = det.lang === "ar"
        ? `📚 المعرفة عندي محدّثة (${st.knowledge.docs} ملف، ${st.knowledge.ageHours} ساعة). حدّث الفهرس لو ضفت ملفات جديدة.`
        : `📚 Knowledge base is ${st.knowledge.ageHours}h old (${st.knowledge.docs} PDFs). Refresh the index if new files were added.`;
      if (window.DentoVerseEnhance && typeof window.DentoVerseEnhance.toast === "function") {
        window.DentoVerseEnhance.toast(msg, "🧠");
      } else if (typeof window.NovaAssistant.toast === "function") {
        window.NovaAssistant.toast(msg, "🧠");
      }
    });
  }

  /* ───────── wire assistant.js ask path with tool hint ───────── */
  function hookAskAI() {
    if (!window.NovaCore) return;
    if (!window.NovaAssistant) return;
    // Nothing to monkey-patch in the production assistant because
    // it already passes `mode` in the payload. We additionally
    // pass a "tool" hint selected from NovaCore.Intent.
    try {
      // Ensure preferred NovaCore knowledge overrides assistant knowledge when newer.
      const prevOpen = window.NovaAssistant.open;
      if (typeof prevOpen === "function") {
        window.NovaAssistant.open = function patchedOpen() {
          const r = prevOpen.apply(this, arguments);
          safe(maybeShowFreshnessBanner);
          return r;
        };
      }
    } catch (e) {}
  }

  /* ───────── enrich /api/nova POSTs with tool + lang + dialect ───────── */
  // Patch fetch just for /api/nova POSTs so every request goes out with
  // the richest metadata Nova can produce.
  function hookFetch() {
    if (!window.__novaPhase2PatchedFetch && window.fetch) {
      const origFetch = window.fetch.bind(window);
      window.fetch = function patchedFetch(input, init) {
        try {
          const url = typeof input === "string" ? input : (input && input.url) || "";
          const isNova = /\/api\/nova(?:$|\?)/.test(url);
          const method = (init && init.method) || (input && input.method) || (typeof input === "object" ? "GET" : "GET");
          if (isNova && method === "POST" && init && init.body && typeof init.body === "string") {
            const body = JSON.parse(init.body);
            if (body && typeof body === "object") {
              if (window.NovaCore && window.NovaCore.Lang) {
                const det = window.NovaCore.Lang.detect(lastUserText || (body.messages && body.messages.slice(-1)[0] && body.messages.slice(-1)[0].content) || "");
                if (!body.lang)    body.lang = det.lang;
                if (!body.dialect) body.dialect = det.dialect;
              }
              if (window.NovaCore && window.NovaCore.Intent && !body.tool) {
                const det = window.NovaCore.Lang.detect(lastUserText || (body.messages && body.messages.slice(-1)[0] && body.messages.slice(-1)[0].content) || "");
                const ac = (body.context && body.context.knowledgeObject) || (body.context && body.context.knowledgeList) || null;
                const intent = safe(() => window.NovaCore.Intent.detect(lastUserText || "", [], [])) || "general";
                body.tool = intent;
                body.context = body.context || {};
                if (!body.context.tool) body.context.tool = intent;
                if (!body.context.lang)  body.context.lang  = det.lang;
                if (!body.context.dialect) body.context.dialect = det.dialect;
              }
              init.body = JSON.stringify(body);
            }
          }
        } catch (e) { /* fall through */ }
        return origFetch(input, init);
      };
      window.__novaPhase2PatchedFetch = true;
    }
  }

  let lastUserText = "";
  // Capture the latest user-text via a small wrapper on assistant's
  // public ask() helper. Safe if assistant.ask is absent.
  function hookUserTextCapture() {
    const prev = window.NovaAssistant && window.NovaAssistant.ask;
    if (typeof prev !== "function") return;
    window.NovaAssistant.ask = function patchedAsk(q) {
      lastUserText = q || "";
      try { window.NovaCore && window.NovaCore.Signals && window.NovaCore.Signals.log(q || ""); } catch (e) {}
      return prev.apply(this, arguments);
    };
  }

  /* ───────── extras: signal capture on /api/nova responses ───────── */
  function hookSignalsCapture() {
    if (window.__novaPhase2PatchedFetch) return;
    hookFetch();
    const origFetch = window.fetch && window.fetch.bind(window);
    if (!origFetch) return;
    window.fetch = function patchedFetch(input, init) {
      return origFetch(input, init).then(async (response) => {
        try {
          const url = typeof input === "string" ? input : (input && input.url) || "";
          if (/\/api\/nova(?:$|\?)/.test(url) && response.ok) {
            const d = await response.clone().json();
            if (d && d.ok && window.NovaCore && window.NovaCore.Signals && lastUserText) {
              window.NovaCore.Signals.log(lastUserText, { web: !!d.web });
            }
          }
        } catch (e) {}
        return response;
      });
    };
    window.__novaPhase2PatchedFetch = true;
  }

  /* ───────── public hook: build a Compare tool output renderer ───────── */
  function renderToolComparison(element, toolOutput) {
    if (!element || !toolOutput || toolOutput.kind !== "compare") return false;
    const a = (toolOutput.meta && toolOutput.meta.a) || "";
    const b = (toolOutput.meta && toolOutput.meta.b) || "";
    const wrap = document.createElement("div");
    wrap.className = "nova-compare";
    wrap.innerHTML = `
      <div class="nova-compare-head">
        <span class="nova-compare-pill">A</span><strong>${escapeHtml(a)}</strong>
        <span class="nova-compare-vs">vs</span>
        <strong>${escapeHtml(b)}</strong><span class="nova-compare-pill b">B</span>
      </div>
      <div class="nova-compare-cols">
        <div class="nova-compare-col"><strong>${escapeHtml(a)}</strong><ul class="nova-list"></ul></div>
        <div class="nova-compare-col"><strong>${escapeHtml(b)}</strong><ul class="nova-list"></ul></div>
      </div>
      <div class="nova-compare-foot">${escapeHtml(toolOutput.body || "")}</div>
    `;
    element.appendChild(wrap);
    return true;
  }
  function escapeHtml(s) { return String(s || "").replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c])); }

  /* ═══════════════════════════════════════════════════════════════
     IMAGE STUDIO BRIDGE (Phase 3, additive)
     ───────────────────────────────────────────────────────────────
     Connects the premium NovaImage engine + NovaImageStudio overlay
     to the existing Nova chat WITHOUT modifying assistant.js:

       • Adds a 🎨 launcher button in the assistant header.
       • Keeps an "Image Studio" quick-chip present (survives the
         assistant's chip re-renders via a light MutationObserver).
       • Detects image-design requests typed in chat and, instead of
         answering as text, invites the user into the Studio (seeded
         with their request) — a capture-phase submit hook that never
         breaks the normal chat path for non-image messages.
       • Bilingual (EN / MSA / Egyptian) copy that follows the user.
     ═══════════════════════════════════════════════════════════════ */
  const IMG = {
    wired: false,
    lang: "en",
    lastText: ""
  };

  function imgReady() { return !!(window.NovaImage && window.NovaImageStudio); }

  function imgT(key) {
    const L = {
      chip:        { en: "🎨 Image Studio",              ar: "🎨 استوديو الصور" },
      launcher:    { en: "Open Image Design Studio",      ar: "افتح استوديو تصميم الصور" },
      inviteText:  {
        en: "I can design that for you 🎨 — I’ll turn it into a production-ready image prompt with style, composition, lighting and format controls. Opening the Image Studio…",
        ar: "أقدر أصممهالك 🎨 — هحوّلها لبرومبت احترافي جاهز للتوليد مع تحكم في الستايل والتكوين والإضاءة والمقاس. بفتحلك استوديو الصور…"
      },
      openBtn:     { en: "🎨 Open Image Studio",          ar: "🎨 افتح استوديو الصور" },
      craftBtn:    { en: "✨ Craft prompt only",           ar: "✨ جهّز البرومبت بس" },
      hintText:    {
        en: "Tip: you can ask me to “design a poster”, “create a dental diagram”, “make a lecture banner”, and I’ll open the Image Studio.",
        ar: "معلومة: تقدر تقولي «صمم بوستر» أو «اعمل مخطط أسنان» أو «اعملي بانر محاضرة» وهفتحلك استوديو الصور."
      }
    };
    const row = L[key] || {};
    return row[IMG.lang] || row.en || "";
  }

  function detectImgLang(text) {
    try {
      if (window.NovaImage && window.NovaImage.detectLang) {
        const d = window.NovaImage.detectLang(text || "");
        return d && d.lang === "ar" ? "ar" : "en";
      }
    } catch (e) {}
    return /[\u0600-\u06FF]/.test(String(text || "")) ? "ar" : "en";
  }

  /* Open the studio seeded with a request (or blank). */
  function openStudio(seedText) {
    if (!window.NovaImageStudio) return false;
    try {
      if (seedText && String(seedText).trim()) window.NovaImageStudio.openWith(String(seedText).trim());
      else window.NovaImageStudio.open();
      return true;
    } catch (e) { return false; }
  }

  /* Inject a header launcher button into the assistant panel. */
  function ensureHeaderLauncher() {
    const actions = document.querySelector(".nova-panel .nova-head-actions");
    if (!actions || actions.querySelector("[data-nova-img-launch]")) return;
    const btn = document.createElement("button");
    btn.className = "nova-icon-btn";
    btn.type = "button";
    btn.setAttribute("data-nova-img-launch", "1");
    btn.setAttribute("aria-label", "Image Design Studio");
    btn.title = imgT("launcher");
    btn.textContent = "🎨";
    // place it before the language toggle for prominence
    const first = actions.firstElementChild;
    if (first) actions.insertBefore(btn, first);
    else actions.appendChild(btn);
    btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); openStudio(); });
  }

  /* Keep an "Image Studio" chip present in the quick bar. */
  function ensureStudioChip() {
    const bar = document.getElementById("nova-quick");
    if (!bar) return;
    if (bar.querySelector("[data-nova-img-chip]")) return;
    const chip = document.createElement("button");
    chip.className = "nova-chip nova-chip-img";
    chip.type = "button";
    chip.setAttribute("data-nova-img-chip", "1");
    chip.textContent = imgT("chip");
    chip.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); openStudio(); });
    bar.appendChild(chip);
  }

  /* Post a small bot invitation bubble into the live thread. */
  function postImageInvite(seedText) {
    const thread = document.getElementById("nova-thread");
    if (!thread) return;
    const rtl = IMG.lang === "ar";
    const row = document.createElement("div");
    row.className = "nova-msg bot" + (rtl ? " rtl" : "");
    const bubble = document.createElement("div");
    bubble.className = "nova-bubble";
    bubble.innerHTML =
      `<div class="nova-reply"><div class="nova-reply-text"${rtl ? ' dir="rtl"' : ""}>` +
      escapeHtml(imgT("inviteText")) +
      `</div><div class="nova-img-invite-actions">` +
      `<button class="nova-chip nova-chip-img" data-a="open">${escapeHtml(imgT("openBtn"))}</button>` +
      `</div></div>`;
    row.appendChild(bubble);
    thread.appendChild(row);
    const openBtn = bubble.querySelector('[data-a="open"]');
    if (openBtn) openBtn.addEventListener("click", () => openStudio(seedText));
    try { thread.scrollTop = thread.scrollHeight; } catch (e) {}
  }

  /* Echo the user's message into the thread (mirrors assistant styling). */
  function echoUserMessage(text) {
    const thread = document.getElementById("nova-thread");
    if (!thread) return;
    const rtl = detectImgLang(text) === "ar";
    const row = document.createElement("div");
    row.className = "nova-msg user" + (rtl ? " rtl" : "");
    const bubble = document.createElement("div");
    bubble.className = "nova-bubble";
    bubble.textContent = text;
    row.appendChild(bubble);
    thread.appendChild(row);
    try { thread.scrollTop = thread.scrollHeight; } catch (e) {}
  }

  /* Capture-phase submit hook: intercept image requests only. */
  function wireFormInterceptor() {
    const form = document.getElementById("nova-form");
    const inputEl = document.getElementById("nova-q");
    if (!form || !inputEl || form.__novaImgHooked) return;
    form.__novaImgHooked = true;
    form.addEventListener("submit", (e) => {
      if (!imgReady()) return;                       // engine missing → normal chat
      const text = (inputEl.value || "").trim();
      if (!text) return;
      let isImg = false;
      try { isImg = window.NovaImage.isImageRequest(text); } catch (err) { isImg = false; }
      if (!isImg) return;                            // not an image request → normal chat
      // It's an image-design request → handle here, stop the built-in handler.
      e.preventDefault();
      e.stopImmediatePropagation();
      IMG.lang = detectImgLang(text);
      inputEl.value = "";
      echoUserMessage(text);
      postImageInvite(text);
      setTimeout(() => openStudio(text), 320);
    }, true); // capture = runs before assistant.js's own submit listener
  }

  function escapeHtml(s) { return String(s == null ? "" : s).replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c])); }

  /* Observe the panel so launcher + chip survive DOM re-renders. */
  function observeAssistant() {
    const tryWire = () => {
      const panel = document.querySelector(".nova-panel");
      if (!panel) return false;
      ensureHeaderLauncher();
      wireFormInterceptor();
      ensureStudioChip();
      return true;
    };
    if (tryWire()) IMG.wired = true;
    // Panel may be (re)built lazily; keep watching the body + quick bar.
    const mo = new MutationObserver(() => {
      const bar = document.getElementById("nova-quick");
      if (bar) ensureStudioChip();
      ensureHeaderLauncher();
      wireFormInterceptor();
    });
    try { mo.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  }

  function hookImageStudio() {
    if (!window.NovaImageStudio) return;   // studio not loaded → skip silently
    observeAssistant();
    // Also react to language toggles inside the assistant.
    document.addEventListener("click", (e) => {
      const b = e.target && e.target.closest && e.target.closest('[data-nova="lang"]');
      if (b) setTimeout(() => { ensureStudioChip(); ensureHeaderLauncher(); }, 60);
    }, true);
  }

  /* ───────── boot ───────── */
  function boot() {
    try { registerToolingContext(); } catch (e) {}
    try { hookFetch(); } catch (e) {}
    try { hookAskAI(); } catch (e) {}
    try { hookUserTextCapture(); } catch (e) {}
    try { hookSignalsCapture(); } catch (e) {}
    try { hookImageStudio(); } catch (e) {}
    Bridge.ready = true;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  /* ───────── public API ───────── */
  window.NovaPhase2 = {
    enabled: Bridge.enabled,
    ready:   Bridge.ready,
    dispatchTool: (name, input, ctx) => (window.NovaTools && window.NovaTools.dispatch) ? window.NovaTools.dispatch(name, input, ctx) : null,
    renderToolComparison,
    status: () => window.NovaCore ? window.NovaCore.Status : null,
    /* Image Studio bridge helpers (Phase 3) */
    openImageStudio: (seed) => openStudio(seed),
    isImageRequest: (text) => { try { return !!(window.NovaImage && window.NovaImage.isImageRequest(text)); } catch (e) { return false; } }
  };
})();
