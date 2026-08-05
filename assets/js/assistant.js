/* ═══════════════════════════════════════════════════════════════
   DENTOVERSE — NOVA AI ASSISTANT  ·  v2.0
   A premium, futuristic, MULTILINGUAL, general-purpose AI companion.
   ───────────────────────────────────────────────────────────────
   Additive & non-destructive: reads the existing data layer
   (RESOURCES / SECTIONS / DataAPI …) and drives the existing router
   (window.DentoVerse.navigate) + favorites store. It never modifies
   hub.js / enhance.js / data.js. If any hook is missing it degrades
   gracefully and the base site keeps working exactly as before.

   WHAT'S NEW IN v2
     • Real AI brain via /api/nova (OpenAI/OpenRouter/Groq/DeepSeek/
       Gemini) for general + dentistry Q&A — with graceful offline
       fallback to the built-in local smart search.
     • Full multilingual understanding & replies: English, Modern
       Standard Arabic (الفصحى) and Egyptian colloquial (العامية).
       Auto language + RTL detection, mixed AR/EN handled.
     • Conversation memory (session + persisted), preferences.
     • Answer modes (short / detailed / steps / simple / compare /
       summarize / dentistry / language).
     • Smart intent detection (site search vs. general vs. web).
     • Optional live web search grounding with source cards.
     • Feedback (👍/👎) stored to sharpen future retrieval ordering.
     • Premium glassmorphic UI, suggestion chips (AR + EN), quick
       actions, source cards, loading & empty states, animations.

   Designed & Produced by Abdel Rahman Teba © ®
   ═══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  if (!window.RESOURCES || !window.SECTIONS) return;

  const ASSISTANT = { name: "Nova", role: "DentoVerse AI", version: "2.0" };
  const API_URL = "/api/nova";

  const LS_HISTORY = "dentoverse_assistant_history_v2";
  const LS_SEEN    = "dentoverse_assistant_seen_v1";
  const LS_MEM     = "dentoverse_nova_memory_v1";   // conversation turns for the LLM
  const LS_PREFS   = "dentoverse_nova_prefs_v1";    // language, mode, web
  const LS_FEED    = "dentoverse_nova_feedback_v1"; // {resourceId/topic: score}

  /* ═══════════ i18n ═══════════ */
  const I18N = {
    en: {
      dir: "ltr",
      guideTag: "AI Companion",
      status: "Online · multilingual · knows this hub",
      placeholder: "Ask me anything — find, open, explain, translate…",
      clear: "Clear chat",
      close: "Close",
      send: "Send",
      foot: "Nova AI · multilingual · answers general & dentistry questions",
      greetNew: `Hi! I'm <strong>Nova</strong> — your DentoVerse AI companion. I speak <strong>English & Arabic</strong> (فصحى + مصري), answer general and dentistry questions, explain concepts, and find anything in this hub. Ask me anything, or tap a suggestion below.`,
      greetBack: "Welcome back! What can I help you with today? Ask me anything — in English or Arabic.",
      cleared: "Conversation cleared",
      thinking: "Thinking…",
      searching: "Searching the web…",
      sources: "Sources",
      copyLink: "Copy link",
      saved: "Saved to favourites",
      unsaved: "Removed from favourites",
      linkCopied: "Link copied to clipboard",
      open: "Open",
      goto: "Go to",
      save: "Save",
      savedBtn: "Saved",
      gotoSection: "Go to section",
      modeLabel: "Style",
      webLabel: "Web",
      helpful: "Was this helpful?",
      thanksFeedback: "Thanks for the feedback!",
      offlineNote: "AI brain is offline right now — using built-in smart search.",
      errNote: "Something went wrong — but the hub is fine. Try rephrasing.",
      modes: { auto: "Auto", short: "Short", detailed: "Detailed", steps: "Steps", simple: "Simple", compare: "Compare", summarize: "Summarize", dentistry: "Dentistry" }
    },
    ar: {
      dir: "rtl",
      guideTag: "مساعد ذكي",
      status: "متصل · متعدد اللغات · يعرف كل المنصة",
      placeholder: "اسألني أي حاجة — دور، افتح، اشرح، ترجم…",
      clear: "مسح المحادثة",
      close: "إغلاق",
      send: "إرسال",
      foot: "نوفا · مساعد ذكي متعدد اللغات · أسئلة عامة وأسنان",
      greetNew: `أهلاً! أنا <strong>Nova</strong> — مساعدك الذكي في DentoVerse. بتكلم <strong>عربي وإنجليزي</strong> (فصحى + مصري)، بجاوب على الأسئلة العامة وأسئلة طب الأسنان، بشرح المفاهيم، وبلاقيلك أي حاجة في المنصة. اسألني أي حاجة أو اختار اقتراح تحت.`,
      greetBack: "نورت تاني! أقدر أساعدك في إيه النهاردة؟ اسألني أي حاجة — بالعربي أو الإنجليزي.",
      cleared: "تم مسح المحادثة",
      thinking: "بفكر…",
      searching: "ببحث على الإنترنت…",
      sources: "المصادر",
      copyLink: "نسخ الرابط",
      saved: "تمت الإضافة للمفضلة",
      unsaved: "تمت الإزالة من المفضلة",
      linkCopied: "تم نسخ الرابط",
      open: "افتح",
      goto: "اذهب",
      save: "حفظ",
      savedBtn: "محفوظ",
      gotoSection: "افتح القسم",
      modeLabel: "الأسلوب",
      webLabel: "الويب",
      helpful: "هل كانت الإجابة مفيدة؟",
      thanksFeedback: "شكراً على تقييمك!",
      offlineNote: "الذكاء الاصطناعي غير متاح حالياً — بستخدم البحث الذكي المدمج.",
      errNote: "حصل خطأ بسيط — بس المنصة تمام. جرّب تعيد صياغة السؤال.",
      modes: { auto: "تلقائي", short: "مختصر", detailed: "مفصّل", steps: "خطوات", simple: "مبسّط", compare: "مقارنة", summarize: "تلخيص", dentistry: "أسنان" }
    }
  };
  let UILANG = "en"; // UI chrome language (auto-switches to the user's language)
  const t = (k) => (I18N[UILANG] && I18N[UILANG][k] != null) ? I18N[UILANG][k] : I18N.en[k];

  /* ═══════════ DOM + text helpers ═══════════ */
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const norm = (s) => String(s || "")
    .toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9\u0600-\u06FF\s]/g, " ")
    .replace(/\s+/g, " ").trim();
  const words = (s) => norm(s).split(" ").filter(w => w.length > 1);

  const TYPE_ICON = { pdf: "📄", video: "🎬", telegram: "✈️", link: "🔗", note: "📝", flashcard: "🃏", quiz: "🧠", download: "⬇️", playlist: "▶️", drive: "📂" };
  const TYPE_LABEL = { pdf: "PDF", video: "Video", telegram: "Telegram", link: "Link", note: "Note", flashcard: "Flashcards", quiz: "Quiz", download: "Download", playlist: "Playlist", drive: "Drive" };

  /* ═══════════ language detection ═══════════ */
  const AR_RX = /[\u0600-\u06FF]/;
  // Egyptian colloquial markers (boundary-free — \b is unreliable for Arabic).
  const EGY_RX = /(ازاي|إزاي|عايز|عاوز|عاوزة|محتاج|مش |مفيش|كده|كدا|دلوقتي|فين|منين|ليه|اومال|يعني|خلاص|بتاع|بتاعة|بتاعه|عشان|علشان| قوي|اهو|ياعم|بص |جامد|تمام|ازيك|إزيك|عامل ايه|النهارده|النهاردة|طب |طيب |حاجة|حاجه|ايه ده|إيه ده)/;
  function detectLang(text) {
    const s = String(text || "");
    const arChars = (s.match(/[\u0600-\u06FF]/g) || []).length;
    const latin = (s.match(/[a-zA-Z]/g) || []).length;
    const isAr = arChars > 0 && arChars >= latin * 0.5;
    if (!isAr) return { lang: "en", dialect: "en", rtl: false };
    const dialect = EGY_RX.test(s) ? "egy" : "msa";
    return { lang: "ar", dialect, rtl: true };
  }

  /* ═══════════ preferences + memory + feedback ═══════════ */
  const Prefs = {
    data: { mode: "auto", web: false, lang: "auto" },
    load() { try { this.data = Object.assign(this.data, JSON.parse(localStorage.getItem(LS_PREFS)) || {}); } catch (e) {} return this.data; },
    save() { try { localStorage.setItem(LS_PREFS, JSON.stringify(this.data)); } catch (e) {} }
  };
  const Memory = {
    turns: [],
    load() { try { this.turns = JSON.parse(localStorage.getItem(LS_MEM)) || []; } catch (e) { this.turns = []; } },
    push(role, content) {
      this.turns.push({ role, content });
      if (this.turns.length > 24) this.turns = this.turns.slice(-24);
      this.save();
    },
    save() { try { localStorage.setItem(LS_MEM, JSON.stringify(this.turns)); } catch (e) {} },
    clear() { this.turns = []; this.save(); }
  };
  const Feedback = {
    data: {},
    load() { try { this.data = JSON.parse(localStorage.getItem(LS_FEED)) || {}; } catch (e) { this.data = {}; } },
    bump(key, delta) { if (!key) return; this.data[key] = (this.data[key] || 0) + delta; this.save(); },
    score(key) { return this.data[key] || 0; },
    save() { try { localStorage.setItem(LS_FEED, JSON.stringify(this.data)); } catch (e) {} }
  };

  /* ═══════════ AI backend capability probe ═══════════ */
  const AI = { available: false, provider: null, webSearch: false, checked: false };
  async function probeAI() {
    try {
      const r = await fetch(API_URL, { method: "GET" });
      if (r.ok) {
        const d = await r.json();
        AI.available = !!d.ai; AI.provider = d.provider || null; AI.webSearch = !!d.webSearch;
      }
    } catch (e) { AI.available = false; }
    AI.checked = true;
  }

  async function askAI(userText, opts) {
    opts = opts || {};
    const context = {
      site: { name: (window.SITE && SITE.name) || "DentoVerse", tagline: (window.SITE && SITE.tagline) || "", author: (window.SITE && SITE.author) || "Abdel Rahman Teba" },
      sections: SECTIONS.filter(s => !["search"].includes(s.id)).map(s => ({ id: s.id, label: s.label, tagline: s.tagline })),
      topResources: relevantResourcesForContext(userText)
    };
    const messages = Memory.turns.slice(-20).concat([{ role: "user", content: userText }]);
    const payload = { messages, context, mode: opts.mode && opts.mode !== "auto" ? opts.mode : "", web: !!opts.web };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 50000);
    try {
      const r = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      const d = await r.json();
      if (d && d.ok && d.reply) return { ok: true, reply: d.reply, sources: d.sources || [], web: !!d.web };
      return { ok: false, fallback: true };
    } catch (e) {
      clearTimeout(timer);
      return { ok: false, fallback: true };
    }
  }

  /* Pick the most relevant resources to hand the LLM as grounding context. */
  function relevantResourcesForContext(text) {
    const { results } = search(text, { limit: 12 });
    const base = results.map(x => x.r);
    if (base.length >= 6) return base.map(slimResource);
    // pad with featured / pinned so the model always has hub awareness
    const extra = RESOURCES.filter(r => r.featured || (window.PINNED_IDS || []).includes(r.id));
    const seen = new Set(base.map(r => r.id));
    extra.forEach(r => { if (!seen.has(r.id)) { seen.add(r.id); base.push(r); } });
    return base.slice(0, 24).map(slimResource);
  }
  const slimResource = (r) => ({ title: r.title, type: r.type, section: r.section, category: r.category || "", status: r.status });

  /* ═══════════ synonyms / concepts (local engine) ═══════════ */
  const SYNONYMS = {
    pdf: ["pdf", "pdfs", "document", "documents", "sheet", "sheets", "notes", "lecture", "lectures", "book", "reading", "مذكرة", "ملف", "ملفات", "محاضرة", "محاضرات", "كتاب"],
    video: ["video", "videos", "clip", "clips", "watch", "recording", "demonstration", "demo", "film", "فيديو", "فيديوهات", "مقطع", "شرح"],
    quiz: ["quiz", "quizzes", "mcq", "mcqs", "question", "questions", "exam", "test", "practice", "questionbank", "اسئلة", "أسئلة", "امتحان", "اختبار", "بنك"],
    telegram: ["telegram", "channel", "group", "bot", "contact", "تليجرام", "قناة", "جروب", "بوت"],
    download: ["download", "downloads", "instrument", "instruments", "kit", "checklist", "list", "template", "تحميل", "ادوات", "أدوات", "عدة"],
    flashcard: ["flashcard", "flashcards", "deck", "recall", "cards", "بطاقات", "فلاش"],
    note: ["note", "notes", "summary", "summaries", "highyield", "mnemonic", "ملخص", "ملخصات", "نوت"],
    playlist: ["playlist", "playlists", "youtube", "بلاي", "يوتيوب"],
    drive: ["drive", "google", "cloud", "folder", "درايف", "جوجل"],
    anatomy: ["anatomy", "tooth", "teeth", "atlas", "morphology", "dentition", "molar", "incisor", "canine", "premolar", "تشريح", "سنة", "سن", "اسنان", "أسنان", "ضرس"],
    prothesis: ["prothesis", "prosthesis", "prosthodontic", "prosthodontics", "removable", "denture", "waxup", "wax", "تعويضات", "طقم", "شمع"],
    biomaterials2: ["biomaterial", "biomaterials", "impression", "ceramic", "ceramics", "cement", "cements", "composite", "resin", "elastomer", "gypsum", "alloy", "polymer", "بيوميتريال", "خامات", "طبعة", "سيراميك", "كمبوزيت"],
    bm2practical: ["practical", "casting", "investment", "manipulation", "labwork", "عملي", "معمل"],
    stage2: ["stage", "stage2", "second", "year", "level2", "buy", "buying", "المرحلة", "سنة تانية", "سنه تانيه"],
    exam: ["exam", "revision", "revise", "study", "prepare", "final", "مراجعة", "امتحان", "استذكار", "نهائي"],
    favorites: ["saved", "favorite", "favorites", "favourite", "favourites", "bookmark", "bookmarks", "star", "starred", "المحفوظات", "مفضلة", "محفوظ"]
  };
  const TOKEN_CONCEPT = {};
  Object.keys(SYNONYMS).forEach(concept => SYNONYMS[concept].forEach(tok => {
    (TOKEN_CONCEPT[tok] = TOKEN_CONCEPT[tok] || new Set()).add(concept);
  }));

  const STOP = new Set(("a an the of for to in on at is are be am can could would please show me find open take go i " +
    "want need where whats what which how do you give get see look about all any my your this that with and or best some only " +
    "list link file files section page here there help hi hey hello thanks thank " +
    "في من الى إلى على عن مع هو هي ايه إيه ازاي إزاي فين عايز عاوز محتاج ممكن لو سمحت يا").split(" "));

  /* ═══════════ favorites + navigation bridges ═══════════ */
  const Fav = {
    has(id) { try { return window.DentoVerse.Favorites.has(id); } catch (e) { return false; } },
    toggle(id) { try { return window.DentoVerse.Favorites.toggle(id); } catch (e) { return false; } }
  };
  function navigate(section) {
    try {
      if (window.DentoVerse && typeof window.DentoVerse.navigate === "function" && SECTIONS.some(s => s.id === section)) {
        window.DentoVerse.navigate(section); return true;
      }
    } catch (e) {}
    location.hash = "#" + section; return true;
  }

  const sectionLabel = (id) => { const s = SECTIONS.find(x => x.id === id); return s ? s.label : id; };
  const sectionIcon  = (id) => { const s = SECTIONS.find(x => x.id === id); return s ? s.icon : "📦"; };
  const isOpenable = (r) => r.status === "available" && !!(r.file || r.link);
  const srcOf = (r) => r.file || r.link || "";
  const isLocalMedia = (r) => { const s = srcOf(r); return isOpenable(r) && (r.type === "video" || r.type === "pdf") && !/^https?:/i.test(s); };

  function openResource(r) {
    if (!isOpenable(r)) { navigate(r.section); return; }
    if (isLocalMedia(r)) {
      navigate(r.section); closePanel(true);
      setTimeout(() => triggerCardOpen(r), 420);
      setTimeout(() => triggerCardOpen(r), 850);
      return;
    }
    const s = srcOf(r);
    if (/^https?:/i.test(s)) window.open(s, "_blank", "noopener"); else window.open(s, "_blank");
  }
  const cssId = (s) => String(s).replace(/["\\]/g, "\\$&");
  function triggerCardOpen(r) {
    const btn = document.querySelector(`[data-id="${cssId(r.id)}"] [data-view="${cssId(r.id)}"], [data-view="${cssId(r.id)}"]`);
    if (btn) { btn.click(); return true; } return false;
  }
  function goToResource(r) {
    navigate(r.section); closePanel(true);
    const flash = () => {
      const card = document.querySelector(`[data-id="${cssId(r.id)}"]`);
      if (card) { card.scrollIntoView({ behavior: "smooth", block: "center" }); card.classList.add("nova-flash"); setTimeout(() => card.classList.remove("nova-flash"), 2600); return true; }
      return false;
    };
    setTimeout(flash, 450); setTimeout(flash, 900);
  }
  function copyLink(r) {
    const s = srcOf(r); let url = s;
    if (s && !/^https?:/i.test(s)) url = location.origin + location.pathname.replace(/[^/]*$/, "") + s;
    const done = () => toast(t("linkCopied"), "🔗");
    try {
      if (navigator.clipboard && url) navigator.clipboard.writeText(url).then(done, () => fallbackCopy(url, done));
      else fallbackCopy(url, done);
    } catch (e) { fallbackCopy(url, done); }
  }
  function fallbackCopy(text, done) {
    try { const ta = el("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); done && done(); } catch (e) {}
  }

  /* ═══════════ toast ═══════════ */
  let toastWrap;
  function toast(msg, emoji) {
    if (window.DentoVerseEnhance && typeof window.DentoVerseEnhance.toast === "function") { try { window.DentoVerseEnhance.toast(msg, emoji); return; } catch (e) {} }
    if (!toastWrap) { toastWrap = el("div", "nova-toast-wrap"); document.body.appendChild(toastWrap); }
    const el2 = el("div", "nova-toast", `<span>${emoji || "✓"}</span><span>${esc(msg)}</span>`);
    toastWrap.appendChild(el2);
    setTimeout(() => { el2.classList.add("out"); setTimeout(() => el2.remove(), 300); }, 2200);
  }

  /* ═══════════════════════════════════════════════════════════════
     LOCAL SEARCH ENGINE (offline brain / grounding)
     ═══════════════════════════════════════════════════════════════ */
  const INDEX = RESOURCES.map(r => {
    const fields = {
      title: norm(r.title), description: norm(r.description), category: norm(r.category),
      subcategory: norm(r.subcategory), section: norm(r.section) + " " + norm(sectionLabel(r.section)),
      type: norm(r.type) + " " + norm(TYPE_LABEL[r.type]), tags: norm((r.tags || []).join(" ")),
      level: norm(r.level), semester: norm(r.semester)
    };
    const blob = Object.values(fields).join(" ");
    return { r, fields, blob, tokens: new Set(words(blob)) };
  });
  const W = { title: 12, tags: 7, category: 6, subcategory: 6, type: 5, section: 4, description: 4, level: 3, semester: 2 };

  function lev(a, b) {
    if (a === b) return 0; const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 3;
    const dp = Array.from({ length: m + 1 }, (_, i) => i);
    for (let j = 1; j <= n; j++) { let prev = dp[0]; dp[0] = j;
      for (let i = 1; i <= m; i++) { const tmp = dp[i]; dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = tmp; } }
    return dp[m];
  }
  const fuzzyEq = (a, b) => { if (a === b) return true; if (a.length < 4 || b.length < 4) return false; return lev(a, b) <= (a.length > 7 ? 2 : 1); };

  function analyze(query) {
    const qWords = words(query).filter(w => !STOP.has(w));
    const concepts = new Set();
    qWords.forEach(w => {
      (TOKEN_CONCEPT[w] || new Set()).forEach(c => concepts.add(c));
      Object.keys(TOKEN_CONCEPT).forEach(tok => { if (tok.length > 4 && fuzzyEq(w, tok)) TOKEN_CONCEPT[tok].forEach(c => concepts.add(c)); });
    });
    return { qWords, concepts: Array.from(concepts) };
  }
  function scoreResource(entry, qWords, concepts) {
    let score = 0; const matched = [];
    qWords.forEach(w => {
      let best = 0, bestField = null;
      for (const f in entry.fields) {
        const fv = entry.fields[f]; if (!fv) continue; const weight = W[f] || 1;
        if (fv.includes(w)) { const wordStart = new RegExp("\\b" + w).test(fv); const s = weight * (wordStart ? 1 : 0.7); if (s > best) { best = s; bestField = f; } }
        else { for (const tok of entry.tokens) { if (fuzzyEq(w, tok)) { const s = weight * 0.5; if (s > best) { best = s; bestField = f; } break; } } }
      }
      if (best > 0) { score += best; if (bestField) matched.push(bestField); }
    });
    concepts.forEach(c => {
      if (entry.r.section === c) score += 6;
      if (entry.r.type === c) score += 6;
      if (c === "favorites" && Fav.has(entry.r.id)) score += 4;
      if (c === "exam" && (entry.r.type === "quiz" || (entry.r.tags || []).some(x => /exam|revision|mcq/i.test(x)))) score += 5;
    });
    if (entry.r.status === "available") score += 1.5;
    if (entry.r.featured) score += 1;
    score += Math.max(-2, Math.min(3, Feedback.score(entry.r.id))); // feedback-tuned ranking
    return { score, matched: Array.from(new Set(matched)) };
  }
  function search(query, opts) {
    opts = opts || {};
    const { qWords, concepts } = analyze(query);
    if (!qWords.length && !concepts.length) return { results: [], concepts, qWords };
    let scored = INDEX.map(entry => { const { score, matched } = scoreResource(entry, qWords, concepts); return { r: entry.r, score, matched }; }).filter(x => x.score > 0);
    if (opts.type) scored = scored.filter(x => x.r.type === opts.type);
    if (opts.section) scored = scored.filter(x => x.r.section === opts.section);
    if (opts.availableOnly) scored = scored.filter(x => x.r.status === "available");
    scored.sort((a, b) => b.score - a.score);
    return { results: scored.slice(0, opts.limit || 6), concepts, qWords };
  }
  function detectSection(concepts, qWords) {
    const secConcepts = concepts.filter(c => SECTIONS.some(s => s.id === c));
    if (secConcepts.length) return secConcepts[0];
    for (const s of SECTIONS) { const lbl = norm(s.label); if (qWords.some(w => lbl.includes(w) && w.length > 3)) return s.id; }
    return null;
  }

  /* ═══════════ intent detection (routing) ═══════════
     Decide whether a message is best answered by the local hub engine
     or by the general AI brain. */
  const RX = {
    greet:  /\b(hi|hey|hello|yo|salam|salaam|good (morning|evening|afternoon))\b|السلام|اهلا|أهلا|مرحبا|هاي|ازيك|إزيك/i,
    thanks: /\b(thanks|thank you|thx|appreciate|shukran)\b|شكرا|شكراً|متشكر|تسلم/i,
    saved:  /\b(saved|favou?rites?|bookmark|starred|my (list|stuff))\b|المحفوظات|المفضلة|محفوظاتي/i,
    where:  /\b(where|locate|which (section|page|part)|find (the )?(section|page)|how do i (get|go) to)\b|فين|وين|في انهي|في أنهي|ازاي اروح|إزاي أروح/i,
    open:   /\b(open|launch|play|watch|start|view|read)\b|افتح|شغل|شغّل|اعرض|اقرا|اقرأ/i,
    web:    /\b(latest|news|today|current|price|weather|202[4-9]|search (the )?web|google|look up|online)\b|اخبار|أخبار|النهاردة|النهارده|دلوقتي|سعر|الجو|احدث|أحدث|ابحث|جوجل/i,
    exam:   /\b(exam|revision|revise|final|prepare)\b|امتحان|مراجعة|استذكار|نهائي/i,
    recommend: /\b(recommend|suggest|what should i (study|read|do|learn)|study next|study plan)\b|اقترح|توصي|اذاكر ايه|أذاكر إيه|ابدا منين|أبدأ منين/i,
    // signals that this is a general-knowledge / explanatory question
    general: /\b(what is|who is|why|how (do|does|can)|explain|define|difference between|compare|summari[sz]e|translate|meaning of|calculate|solve|write|give me|tell me about|is it|are there)\b|ايه هو|إيه هو|ايه الفرق|إيه الفرق|ليه|ازاي|إزاي|اشرح|إشرح|عرف|عرّف|ترجم|لخص|لخّص|يعني ايه|يعني إيه|احسب|امتى|إمتى/i
  };

  function isHubTargeted(text, concepts, qWords) {
    const lower = text.toLowerCase();
    if (RX.saved.test(text)) return true;
    const sec = detectSection(concepts, qWords);
    const conceptTypes = concepts.filter(c => TYPE_LABEL[c] || SECTIONS.some(s => s.id === c));
    // Direct navigate/open/where + a hub concept => local engine.
    if ((RX.where.test(text) || RX.open.test(text)) && (sec || conceptTypes.length)) return true;
    if (/\b(question bank|questionbank|بنك الاسئلة|بنك الأسئلة)\b/i.test(lower)) return true;
    return false;
  }

  /* ═══════════ tiny markdown → safe HTML ═══════════ */
  function mdToHtml(md) {
    let s = esc(md);
    // code blocks
    s = s.replace(/```([\s\S]*?)```/g, (m, c) => `<pre class="nova-code">${c.replace(/^\n/, "")}</pre>`);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    // bold / italic
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    // links
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // headings -> bold line
    s = s.replace(/^#{1,6}\s*(.+)$/gm, "<strong>$1</strong>");
    // lists
    const lines = s.split(/\n/); let out = [], inUl = false, inOl = false;
    const closeLists = () => { if (inUl) { out.push("</ul>"); inUl = false; } if (inOl) { out.push("</ol>"); inOl = false; } };
    lines.forEach(line => {
      const ul = line.match(/^\s*[-•]\s+(.+)/);
      const ol = line.match(/^\s*\d+[.)]\s+(.+)/);
      if (ul) { if (!inUl) { closeLists(); out.push('<ul class="nova-list">'); inUl = true; } out.push("<li>" + ul[1] + "</li>"); }
      else if (ol) { if (!inOl) { closeLists(); out.push('<ol class="nova-olist">'); inOl = true; } out.push("<li>" + ol[1] + "</li>"); }
      else { closeLists(); if (line.trim() === "") out.push("<br>"); else out.push("<p>" + line + "</p>"); }
    });
    closeLists();
    return out.join("");
  }

  /* ═══════════════════════════════════════════════════════════════
     RESPONSE (LOCAL / OFFLINE BRAIN) — returns {text, chips, cards, action}
     Multilingual-aware surface strings; falls back for general Qs.
     ═══════════════════════════════════════════════════════════════ */
  const L = (en, ar) => (UILANG === "ar" ? ar : en);

  function respondLocal(rawQuery) {
    const q = rawQuery.trim();
    const { qWords, concepts } = analyze(q);

    if (RX.greet.test(q) && qWords.length <= 3 && !concepts.length) {
      return { text: L(
        `Hi! I'm <strong>Nova</strong>, your DentoVerse AI companion. Ask me anything — general or dentistry — or let me find & open any resource here.`,
        `أهلاً! أنا <strong>Nova</strong>، مساعدك الذكي في DentoVerse. اسألني أي حاجة — عامة أو في الأسنان — أو خليني ألاقيلك وأفتح أي مصدر هنا.`
      ), chips: starterChips() };
    }
    if (RX.thanks.test(q) && qWords.length <= 4) {
      return { text: L("You're very welcome — happy studying! 🦷", "العفو — مذاكرة موفقة! 🦷"), chips: starterChips() };
    }
    if (RX.saved.test(q)) {
      const ids = safeFavList();
      const list = ids.map(id => RESOURCES.find(r => r.id === id)).filter(Boolean);
      if (!list.length) return { text: L("You haven't saved anything yet. Tap ★ on any card to keep it here.", "لسه مفيش حاجة محفوظة. دوس ★ على أي كارت عشان يتحفظ هنا."), chips: [{ label: L("⭐ Open Saved", "⭐ افتح المحفوظات"), act: "nav:favorites" }] };
      return { text: L(`You have <strong>${list.length}</strong> saved resource(s):`, `عندك <strong>${list.length}</strong> عنصر محفوظ:`), cards: list.slice(0, 5), chips: [{ label: L("⭐ Open full Saved page", "⭐ افتح صفحة المحفوظات"), act: "nav:favorites" }] };
    }
    if (RX.recommend.test(q)) return recommendResponse(concepts, qWords);
    if (RX.exam.test(q) && !RX.open.test(q)) return examResponse();

    if (RX.where.test(q)) {
      const { results } = search(q, { limit: 4 });
      const sec = detectSection(concepts, qWords);
      if (results.length) {
        const secId = sec || results[0].r.section;
        return { text: L(`That's in <strong>${sectionIcon(secId)} ${esc(sectionLabel(secId))}</strong>. Tap “Go to” and I'll highlight it:`,
          `دي في قسم <strong>${sectionIcon(secId)} ${esc(sectionLabel(secId))}</strong>. دوس «اذهب» وهوريهالك:`),
          cards: results.map(x => x.r).slice(0, 4), chips: [{ label: `${sectionIcon(secId)} ${sectionLabel(secId)}`, act: "nav:" + secId }] };
      }
      if (sec) return { text: L(`You'll find that under <strong>${sectionIcon(sec)} ${esc(sectionLabel(sec))}</strong>.`, `هتلاقيها تحت <strong>${sectionIcon(sec)} ${esc(sectionLabel(sec))}</strong>.`), chips: [{ label: `${sectionIcon(sec)} ${sectionLabel(sec)}`, act: "nav:" + sec }] };
      return noMatch(q);
    }
    if (RX.open.test(q)) {
      const opts = {}; const conceptTypes = concepts.filter(c => TYPE_LABEL[c]); if (conceptTypes.length === 1) opts.type = conceptTypes[0];
      const { results } = search(q, opts);
      if (results.length) {
        const top = results[0].r;
        if (isOpenable(top)) return { text: L(`Opening <strong>${esc(top.title)}</strong> for you.`, `بفتحلك <strong>${esc(top.title)}</strong> دلوقتي.`), cards: results.map(x => x.r).slice(0, results.length > 1 ? 4 : 1), action: { kind: "open", id: top.id } };
        return { text: L(`<strong>${esc(top.title)}</strong> isn't openable yet. Closest available ones:`, `<strong>${esc(top.title)}</strong> لسه مش متاح. أقرب المتاح:`), cards: results.map(x => x.r).slice(0, 4) };
      }
      const sec = detectSection(concepts, qWords);
      if (sec) return { text: L(`Taking you to <strong>${sectionIcon(sec)} ${esc(sectionLabel(sec))}</strong>…`, `بوديك لـ <strong>${sectionIcon(sec)} ${esc(sectionLabel(sec))}</strong>…`), action: { kind: "nav", section: sec } };
      return noMatch(q);
    }

    // Default local: smart search across everything.
    const secGuess = detectSection(concepts, qWords);
    const { results } = search(q, { limit: 6 });
    if (results.length) {
      const secId = secGuess || results[0].r.section;
      const strong = results[0].score >= 10;
      return { text: strong
          ? L(`Here's the best match for “${esc(q)}” plus related resources:`, `أقرب نتيجة لـ «${esc(q)}» وكمان مصادر مرتبطة:`)
          : L(`No exact match for “${esc(q)}”, but these are closest:`, `مفيش نتيجة مطابقة لـ «${esc(q)}»، بس دول أقرب حاجة:`),
        cards: results.map(x => x.r), chips: secId ? [{ label: `${sectionIcon(secId)} ${sectionLabel(secId)}`, act: "nav:" + secId }] : [] };
    }
    if (secGuess) {
      const list = RESOURCES.filter(r => r.section === secGuess);
      return { text: L(`I think you mean <strong>${sectionIcon(secGuess)} ${esc(sectionLabel(secGuess))}</strong>:`, `أظن تقصد <strong>${sectionIcon(secGuess)} ${esc(sectionLabel(secGuess))}</strong>:`), cards: list.slice(0, 5), chips: [{ label: `${sectionIcon(secGuess)} ${sectionLabel(secGuess)}`, act: "nav:" + secGuess }] };
    }
    return noMatch(q);
  }

  function recommendResponse(concepts, qWords) {
    const sec = detectSection(concepts, qWords);
    let pool = RESOURCES.filter(r => r.status === "available");
    if (sec) pool = pool.filter(r => r.section === sec);
    const pinned = new Set(window.PINNED_IDS || []);
    const rank = (r) => (pinned.has(r.id) ? 4 : 0) + (r.featured ? 2 : 0) + ((r.type === "quiz" || /mcq|exam|question/i.test((r.tags || []).join(" "))) ? 2 : 0) + (r.type === "pdf" ? 1 : 0) + Math.max(0, Feedback.score(r.id));
    pool = pool.slice().sort((a, b) => rank(b) - rank(a));
    const picks = pool.slice(0, 5);
    if (!picks.length) return { text: L("Try a topic like biomaterials, anatomy or prothesis.", "جرّب موضوع زي البيوميتريال أو التشريح أو التعويضات."), chips: starterChips() };
    return { text: L("Here's a smart study set — high-yield & exam-ready first:", "دي مجموعة مذاكرة ذكية — الأهم والأقرب للامتحان الأول:"), cards: picks, chips: [{ label: L("🎓 Stage 2 Guide", "🎓 دليل المرحلة الثانية"), act: "nav:stage2" }] };
  }
  function examResponse() {
    const cfg = window.EXAM_ZONE || {};
    const priority = (cfg.priorityIds || []).map(id => RESOURCES.find(r => r.id === id)).filter(Boolean);
    const qbank = RESOURCES.filter(r => (r.type === "quiz" || /mcq|exam|question|revision/i.test((r.tags || []).join(" "))) && r.status === "available");
    const seen = new Set(); const picks = [];
    [...priority, ...qbank, ...RESOURCES.filter(r => r.featured && r.status === "available")].forEach(r => { if (r && !seen.has(r.id)) { seen.add(r.id); picks.push(r); } });
    return { text: L("Exam mode 🚨 — question banks & high-yield files first:", "وضع الامتحان 🚨 — بنوك الأسئلة والملفات المهمة الأول:"), cards: picks.slice(0, 5), chips: [{ label: L("🧠 Question Bank", "🧠 بنك الأسئلة"), act: "nav:bm2practical" }] };
  }
  function noMatch(q) {
    const { results } = search(q, { limit: 4 });
    if (results.length) return { text: L(`No exact match for “${esc(q)}”. Closest resources — or browse a section:`, `مفيش نتيجة مطابقة لـ «${esc(q)}». أقرب المصادر — أو تصفّح قسم:`), cards: results.map(x => x.r), chips: sectionChips() };
    return { text: L(`I couldn't find that in the hub. Pick a section to explore:`, `ملقتهاش في المنصة. اختار قسم تستكشفه:`), chips: sectionChips() };
  }
  function safeFavList() { try { if (window.DentoVerse && window.DentoVerse.Favorites) return window.DentoVerse.Favorites.list(); } catch (e) {} return []; }

  /* ═══════════ suggestion chips (bilingual) ═══════════ */
  function starterChips() {
    if (UILANG === "ar") return [
      { label: "🧪 لاقي ملفات البيوميتريال", q: "لاقيلي كل ملفات البيوميتريال PDF" },
      { label: "🧠 افتح بنك الأسئلة", q: "افتح بنك الأسئلة" },
      { label: "🎯 أذاكر إيه للامتحان؟", q: "أذاكر إيه قبل الامتحان؟" },
      { label: "🦷 يعني إيه تسوّس؟", q: "اشرحلي يعني إيه تسوّس الأسنان ببساطة" },
      { label: "⭐ محفوظاتي", q: "وريني المحفوظات بتاعتي" }
    ];
    return [
      { label: "🧪 Find biomaterials PDFs", q: "Find all PDFs about biomaterials" },
      { label: "🧠 Open the question bank", q: "Open the question bank" },
      { label: "🎯 What should I study?", q: "What should I study before the exam?" },
      { label: "🦷 Explain dental caries", q: "Explain dental caries simply" },
      { label: "⭐ Show my saved", q: "Show me my saved resources" }
    ];
  }
  function sectionChips() {
    return SECTIONS.filter(s => !["home", "search", "about"].includes(s.id)).slice(0, 7).map(s => ({ label: `${s.icon} ${s.label}`, act: "nav:" + s.id }));
  }

  /* ═══════════════════════════════════════════════════════════════
     UI LAYER — floating button + drawer + chat
     ═══════════════════════════════════════════════════════════════ */
  let panelOpen = false;
  let fab, panel, thread, input, form, quickBar, modeSelect, webToggle;

  function buildUI() {
    fab = el("button", "nova-fab", `
      <span class="nova-fab-core"><span class="nova-fab-orb"></span><span class="nova-fab-icon">🤖</span></span>
      <span class="nova-fab-ring"></span>
      <span class="nova-fab-label">Ask Nova</span>`);
    fab.type = "button"; fab.setAttribute("aria-label", "Open AI Assistant");
    fab.addEventListener("click", togglePanel);
    document.body.appendChild(fab);

    panel = el("aside", "nova-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "DentoVerse AI Assistant");
    panel.innerHTML = `
      <div class="nova-glow-edge"></div>
      <header class="nova-head">
        <div class="nova-head-id">
          <div class="nova-avatar"><span>🤖</span><i class="nova-pulse"></i></div>
          <div class="nova-head-txt">
            <h3>${esc(ASSISTANT.name)} <span class="nova-tag" data-nova-tag></span></h3>
            <p class="nova-status"><i></i> <span data-nova-status></span></p>
          </div>
        </div>
        <div class="nova-head-actions">
          <button class="nova-icon-btn" data-nova="lang" title="العربية / English" aria-label="Toggle language">🌐</button>
          <button class="nova-icon-btn" data-nova="clear" title="Clear chat" aria-label="Clear chat">🧹</button>
          <button class="nova-icon-btn" data-nova="close" title="Close" aria-label="Close assistant">✕</button>
        </div>
      </header>
      <div class="nova-thread" id="nova-thread" aria-live="polite"></div>
      <div class="nova-quick" id="nova-quick"></div>
      <div class="nova-controls">
        <label class="nova-ctl">
          <span data-nova-modelabel></span>
          <select id="nova-mode" class="nova-mode"></select>
        </label>
        <button type="button" class="nova-web-toggle" id="nova-web" aria-pressed="false">
          <span class="nova-web-dot"></span><span data-nova-weblabel></span>
        </button>
      </div>
      <form class="nova-input" id="nova-form" autocomplete="off">
        <input type="text" id="nova-q" aria-label="Message the assistant" />
        <button type="submit" class="nova-send" aria-label="Send"><span>➤</span></button>
      </form>
      <div class="nova-foot" data-nova-foot></div>`;
    document.body.appendChild(panel);

    const scrim = el("div", "nova-scrim");
    scrim.addEventListener("click", () => closePanel());
    document.body.appendChild(scrim);
    panel._scrim = scrim;

    thread = panel.querySelector("#nova-thread");
    input = panel.querySelector("#nova-q");
    form  = panel.querySelector("#nova-form");
    quickBar = panel.querySelector("#nova-quick");
    modeSelect = panel.querySelector("#nova-mode");
    webToggle = panel.querySelector("#nova-web");

    // Build mode options
    ["auto", "short", "detailed", "steps", "simple", "compare", "summarize", "dentistry"].forEach(m => {
      const o = el("option"); o.value = m; o.dataset.mode = m; modeSelect.appendChild(o);
    });
    modeSelect.value = Prefs.data.mode || "auto";
    modeSelect.addEventListener("change", () => { Prefs.data.mode = modeSelect.value; Prefs.save(); });

    webToggle.addEventListener("click", () => {
      Prefs.data.web = !Prefs.data.web; Prefs.save();
      webToggle.setAttribute("aria-pressed", String(Prefs.data.web));
      webToggle.classList.toggle("on", Prefs.data.web);
    });
    webToggle.classList.toggle("on", !!Prefs.data.web);
    webToggle.setAttribute("aria-pressed", String(!!Prefs.data.web));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (!v) return;
      handleUserMessage(v);
      input.value = "";
    });

    panel.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-nova]");
      if (!btn) return;
      const act = btn.dataset.nova;
      if (act === "close") closePanel();
      else if (act === "clear") clearThread();
      else if (act === "lang") toggleLang();
    });

    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panelOpen) closePanel(); });

    applyUILang();
    renderQuickChips(starterChips());
    restoreHistory();
  }

  function applyUILang() {
    const info = I18N[UILANG];
    panel.setAttribute("dir", info.dir);
    panel.classList.toggle("rtl", info.dir === "rtl");
    panel.querySelector("[data-nova-tag]").textContent = t("guideTag");
    panel.querySelector("[data-nova-status]").textContent = t("status");
    panel.querySelector("[data-nova-foot]").textContent = t("foot");
    panel.querySelector("[data-nova-modelabel]").textContent = t("modeLabel");
    panel.querySelector("[data-nova-weblabel]").textContent = t("webLabel");
    input.setAttribute("placeholder", t("placeholder"));
    panel.querySelector('[data-nova="clear"]').title = t("clear");
    panel.querySelector('[data-nova="close"]').title = t("close");
    // mode option labels
    Array.from(modeSelect.options).forEach(o => { o.textContent = I18N[UILANG].modes[o.dataset.mode] || o.dataset.mode; });
  }
  function setUILang(lang, persist) {
    if (lang !== "ar" && lang !== "en") return;
    if (UILANG === lang) return;
    UILANG = lang;
    if (persist) { Prefs.data.lang = lang; Prefs.save(); }
    if (panel) applyUILang();
  }
  function toggleLang() {
    setUILang(UILANG === "ar" ? "en" : "ar", true);
    renderQuickChips(starterChips());
    toast(UILANG === "ar" ? "تم التبديل إلى العربية" : "Switched to English", "🌐");
  }

  function togglePanel() { panelOpen ? closePanel() : openPanel(); }
  function openPanel() {
    panelOpen = true;
    panel.classList.add("open");
    panel._scrim.classList.add("show");
    fab.classList.add("active");
    document.body.classList.add("nova-open");
    setTimeout(() => input && input.focus(), 260);
    if (!thread.children.length) greet();
    markSeen();
  }
  function closePanel() {
    panelOpen = false;
    panel.classList.remove("open");
    panel._scrim.classList.remove("show");
    fab.classList.remove("active");
    document.body.classList.remove("nova-open");
  }

  /* ═══════════ message rendering ═══════════ */
  function pushMessage(role, node, opts) {
    opts = opts || {};
    const row = el("div", `nova-msg ${role}`);
    if (opts.rtl) row.classList.add("rtl");
    if (role === "bot") row.appendChild(el("div", "nova-msg-avatar", "🤖"));
    const bubble = el("div", "nova-bubble");
    if (typeof node === "string") bubble.innerHTML = node; else bubble.appendChild(node);
    row.appendChild(bubble);
    thread.appendChild(row);
    scrollThread();
    return row;
  }
  function scrollThread() { thread.scrollTop = thread.scrollHeight; }
  function typingIndicator(label) {
    const row = el("div", "nova-msg bot typing");
    row.appendChild(el("div", "nova-msg-avatar", "🤖"));
    row.appendChild(el("div", "nova-bubble", `<span class="nova-dots"><i></i><i></i><i></i></span>${label ? `<span class="nova-typing-label">${esc(label)}</span>` : ""}`));
    thread.appendChild(row);
    scrollThread();
    return row;
  }

  function greet() {
    const seen = localStorage.getItem(LS_SEEN);
    const hi = seen ? t("greetBack") : t("greetNew");
    pushMessage("bot", hi, { rtl: UILANG === "ar" });
    renderQuickChips(starterChips());
    persistHistory();
  }

  /* ═══════════ the core turn handler (AI-first, local fallback) ═══════════ */
  async function handleUserMessage(text) {
    // Auto-switch UI language to match the user.
    const det = detectLang(text);
    if (Prefs.data.lang === "auto") setUILang(det.lang, false);

    pushMessage("user", esc(text), { rtl: det.rtl });
    Memory.push("user", text);
    persistHistory();

    const useWeb = !!Prefs.data.web && (RX.web.test(text) || Prefs.data.web);
    const typing = typingIndicator(useWeb ? t("searching") : t("thinking"));

    const { qWords, concepts } = analyze(text);
    const hubTargeted = isHubTargeted(text, concepts, qWords);

    // Route: hub-targeted commands → local engine (instant, deterministic).
    // Everything else → AI brain (with local fallback).
    if (hubTargeted || !AI.available) {
      // brief human-like delay for local answers
      const delay = 220 + Math.min(600, text.length * 10);
      setTimeout(() => {
        typing.remove();
        let reply;
        try { reply = respondLocal(text); }
        catch (e) { reply = { text: t("errNote"), chips: sectionChips() }; }
        renderReply(reply, { rtl: det.rtl });
      }, delay);
      return;
    }

    // AI path
    let ai;
    try { ai = await askAI(text, { mode: Prefs.data.mode, web: Prefs.data.web }); }
    catch (e) { ai = { ok: false, fallback: true }; }

    typing.remove();

    if (ai && ai.ok) {
      const replyDet = detectLang(ai.reply);
      const node = el("div", "nova-reply");
      const textNode = el("div", "nova-reply-text nova-md");
      if (replyDet.rtl) textNode.setAttribute("dir", "rtl");
      textNode.innerHTML = mdToHtml(ai.reply);
      node.appendChild(textNode);

      // If the AI answer references the hub, attach relevant local cards.
      const localCards = maybeAttachCards(text, ai.reply);
      if (localCards.length) {
        const list = el("div", "nova-cards");
        localCards.forEach(r => list.appendChild(resultCard(r)));
        node.appendChild(list);
      }
      // Web source cards
      if (ai.sources && ai.sources.length) node.appendChild(sourcesBlock(ai.sources));

      const row = pushMessage("bot", node, { rtl: replyDet.rtl });
      attachFeedback(row, text);
      Memory.push("assistant", ai.reply);
      renderQuickChips(followupChips(text));
      persistHistory();
      return;
    }

    // Fallback → local brain, with a gentle note the first time.
    if (!AI.__noticedOffline) { AI.__noticedOffline = true; }
    let reply;
    try { reply = respondLocal(text); }
    catch (e) { reply = { text: t("errNote"), chips: sectionChips() }; }
    renderReply(reply, { rtl: det.rtl });
  }

  /* Attach hub cards to an AI answer only when clearly hub-relevant. */
  function maybeAttachCards(userText, aiText) {
    const { results, qWords, concepts } = search(userText, { limit: 3 });
    const strong = results.length && results[0].score >= 12;
    const mentionsHub = /pdf|video|lecture|section|question|قسم|ملف|فيديو|محاضرة|بنك/i.test(userText);
    const sec = detectSection(concepts, qWords);
    if ((strong && (mentionsHub || sec)) ) return results.map(x => x.r).slice(0, 3);
    return [];
  }

  function sourcesBlock(sources) {
    const wrap = el("div", "nova-sources");
    wrap.appendChild(el("div", "nova-sources-title", `🌐 ${esc(t("sources"))}`));
    sources.slice(0, 5).forEach((s, i) => {
      const a = el("a", "nova-source");
      a.href = s.url; a.target = "_blank"; a.rel = "noopener";
      let host = ""; try { host = new URL(s.url).hostname.replace(/^www\./, ""); } catch (e) {}
      a.innerHTML = `<span class="nova-source-i">${i + 1}</span><span class="nova-source-t"><strong>${esc(s.title || host)}</strong><em>${esc(host)}</em></span>`;
      wrap.appendChild(a);
    });
    return wrap;
  }

  function attachFeedback(row, userText) {
    const bar = el("div", "nova-feedback");
    bar.innerHTML = `<span class="nova-fb-q">${esc(t("helpful"))}</span>
      <button class="nova-fb up" title="Helpful">👍</button>
      <button class="nova-fb down" title="Not helpful">👎</button>`;
    bar.addEventListener("click", (e) => {
      const b = e.target.closest(".nova-fb"); if (!b) return;
      const up = b.classList.contains("up");
      // Nudge ranking of resources related to this query.
      const { results } = search(userText, { limit: 3 });
      results.forEach(x => Feedback.bump(x.r.id, up ? 1 : -1));
      bar.querySelectorAll(".nova-fb").forEach(x => x.disabled = true);
      b.classList.add("chosen");
      toast(t("thanksFeedback"), up ? "👍" : "👎");
    });
    row.appendChild(bar);
    scrollThread();
  }

  function renderReply(reply, opts) {
    opts = opts || {};
    const wrap = el("div", "nova-reply");
    if (reply.text) {
      const tn = el("div", "nova-reply-text");
      if (opts.rtl) tn.setAttribute("dir", "rtl");
      tn.innerHTML = reply.text;
      wrap.appendChild(tn);
    }
    if (reply.cards && reply.cards.length) {
      const list = el("div", "nova-cards");
      reply.cards.forEach(r => list.appendChild(resultCard(r)));
      wrap.appendChild(list);
    }
    const row = pushMessage("bot", wrap, { rtl: opts.rtl });
    Memory.push("assistant", (reply.text || "").replace(/<[^>]+>/g, " ").trim().slice(0, 400));

    if (reply.chips && reply.chips.length) renderQuickChips(reply.chips);
    else renderQuickChips(starterChips());

    if (reply.action) {
      if (reply.action.kind === "open") { const r = RESOURCES.find(x => x.id === reply.action.id); if (r) setTimeout(() => openResource(r), 250); }
      else if (reply.action.kind === "nav") setTimeout(() => { navigate(reply.action.section); closePanel(); }, 250);
    }
    persistHistory();
    return row;
  }

  /* ═══════════ result card ═══════════ */
  function resultCard(r) {
    const card = el("article", "nova-card");
    card.dataset.id = r.id;
    const openable = isOpenable(r);
    const fav = Fav.has(r.id);
    const statusCls = r.status === "available" ? "avail" : (r.status === "pending-review" ? "pending" : "soon");
    const statusTxt = r.status === "available" ? L("Available", "متاح") : (r.status === "pending-review" ? L("Pending", "قيد المراجعة") : L("Coming soon", "قريباً"));
    card.innerHTML = `
      <div class="nova-card-top">
        <span class="nova-card-icon">${TYPE_ICON[r.type] || "📦"}</span>
        <div class="nova-card-head">
          <h4>${esc(r.title)}</h4>
          <div class="nova-card-meta">
            <span class="nc-pill">${esc(sectionLabel(r.section))}</span>
            <span class="nc-pill soft">${esc(r.category || TYPE_LABEL[r.type] || "")}</span>
            <span class="nc-status ${statusCls}">${statusTxt}</span>
          </div>
        </div>
      </div>
      <p class="nova-card-desc">${esc(trim(r.description, 130))}</p>
      <div class="nova-card-actions">
        ${openable ? `<button class="nc-btn primary" data-act="open">▸ ${esc(t("open"))}</button>` : `<button class="nc-btn primary" data-act="go">${esc(t("gotoSection"))}</button>`}
        <button class="nc-btn" data-act="go">📍 ${esc(t("goto"))}</button>
        <button class="nc-btn ${fav ? "on" : ""}" data-act="fav">${fav ? "★ " + esc(t("savedBtn")) : "☆ " + esc(t("save"))}</button>
        ${srcOf(r) ? `<button class="nc-btn" data-act="copy" title="${esc(t("copyLink"))}">🔗</button>` : ""}
      </div>`;
    card.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const act = b.dataset.act;
      if (act === "open") openResource(r);
      else if (act === "go") goToResource(r);
      else if (act === "fav") { const now = Fav.toggle(r.id); b.classList.toggle("on", now); b.textContent = now ? "★ " + t("savedBtn") : "☆ " + t("save"); toast(now ? t("saved") : t("unsaved"), now ? "★" : "☆"); }
      else if (act === "copy") copyLink(r);
    });
    return card;
  }
  const trim = (s, n) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1).trim() + "…" : s; };

  /* ═══════════ quick chip bar ═══════════ */
  function followupChips(lastText) {
    // Offer contextual follow-ups after an AI answer.
    if (UILANG === "ar") return [
      { label: "➕ اشرح أكتر", q: "اشرح أكتر بالتفصيل" },
      { label: "🔽 لخّصلي", q: "لخّص اللي قلته في نقاط" },
      { label: "🇬🇧 بالإنجليزي", q: "Answer that in English" },
      { label: "🎯 مثال عملي", q: "اديني مثال عملي" }
    ];
    return [
      { label: "➕ Explain more", q: "Explain that in more detail" },
      { label: "🔽 Summarize", q: "Summarize what you said in bullets" },
      { label: "🇸🇦 بالعربي", q: "جاوب ده بالعربي" },
      { label: "🎯 Give an example", q: "Give me a practical example" }
    ];
  }
  function renderQuickChips(chips) {
    quickBar.innerHTML = "";
    (chips || []).forEach(c => {
      const chip = el("button", "nova-chip", esc(c.label));
      chip.type = "button";
      chip.addEventListener("click", () => {
        if (c.q) handleUserMessage(c.q);
        else if (c.act && c.act.startsWith("nav:")) {
          const sec = c.act.slice(4);
          pushMessage("user", esc(c.label.replace(/^[^\w\u0600-\u06FF]+/, "").trim()));
          const ty = typingIndicator();
          setTimeout(() => {
            ty.remove();
            pushMessage("bot", L(`Taking you to <strong>${sectionIcon(sec)} ${esc(sectionLabel(sec))}</strong> now. 🚀`, `بوديك لـ <strong>${sectionIcon(sec)} ${esc(sectionLabel(sec))}</strong> دلوقتي. 🚀`), { rtl: UILANG === "ar" });
            renderQuickChips(starterChips());
            persistHistory();
            setTimeout(() => { navigate(sec); closePanel(); }, 300);
          }, 300);
        }
      });
      quickBar.appendChild(chip);
    });
  }

  /* ═══════════ clear + persistence ═══════════ */
  function clearThread() {
    thread.innerHTML = "";
    localStorage.removeItem(LS_HISTORY);
    Memory.clear();
    greet();
    toast(t("cleared"), "🧹");
  }
  function persistHistory() {
    try {
      const msgs = Array.from(thread.querySelectorAll(".nova-msg")).slice(-40).map(m => ({
        role: m.classList.contains("user") ? "user" : "bot",
        rtl: m.classList.contains("rtl"),
        html: m.querySelector(".nova-bubble") ? m.querySelector(".nova-bubble").innerHTML : ""
      })).filter(m => m.html && !m.html.includes("nova-dots"));
      localStorage.setItem(LS_HISTORY, JSON.stringify(msgs));
    } catch (e) {}
  }
  function restoreHistory() {
    let msgs = [];
    try { msgs = JSON.parse(localStorage.getItem(LS_HISTORY)) || []; } catch (e) {}
    if (!msgs.length) return;
    msgs.forEach(m => {
      const row = el("div", `nova-msg ${m.role}${m.rtl ? " rtl" : ""}`);
      if (m.role === "bot") row.appendChild(el("div", "nova-msg-avatar", "🤖"));
      row.appendChild(el("div", "nova-bubble", m.html));
      thread.appendChild(row);
    });
    scrollThread();
  }
  function markSeen() { try { localStorage.setItem(LS_SEEN, "1"); } catch (e) {} }

  /* ═══════════ BOOT ═══════════ */
  function boot() {
    Prefs.load(); Memory.load(); Feedback.load();
    // initial UI language from saved pref (auto → keep en until first message)
    if (Prefs.data.lang === "ar" || Prefs.data.lang === "en") UILANG = Prefs.data.lang;
    buildUI();
    probeAI().then(() => { if (panel) { const st = panel.querySelector("[data-nova-status]"); if (st && AI.available) st.textContent = t("status"); } });
    if (!localStorage.getItem(LS_SEEN)) {
      setTimeout(() => fab && fab.classList.add("nudge"), 1400);
      setTimeout(() => fab && fab.classList.remove("nudge"), 6000);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  /* Public hook. */
  window.NovaAssistant = {
    open: openPanel,
    close: closePanel,
    ask: (q) => { openPanel(); setTimeout(() => handleUserMessage(q), 200); },
    setLang: (l) => setUILang(l, true),
    search,
    aiStatus: () => ({ ...AI })
  };
})();
