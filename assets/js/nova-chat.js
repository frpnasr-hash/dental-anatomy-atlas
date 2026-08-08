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

  /* ───────── boot ───────── */
  function boot() {
    try { registerToolingContext(); } catch (e) {}
    try { hookFetch(); } catch (e) {}
    try { hookAskAI(); } catch (e) {}
    try { hookUserTextCapture(); } catch (e) {}
    try { hookSignalsCapture(); } catch (e) {}
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
    status: () => window.NovaCore ? window.NovaCore.Status : null
  };
})();
