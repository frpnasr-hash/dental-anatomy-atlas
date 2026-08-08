/* ═══════════════════════════════════════════════════════════════
   DENTOVERSE — NOVA AI · CORE ENGINE MODULE (Phase 2)
   ───────────────────────────────────────────────────────────────
   Additive, non-destructive, dependency-free module that powers
   Nova's self-improving knowledge, signal tracking, intent
   detection, memory and personalization layer.

   Why this file exists
     • Nova previously had everything coupled inside assistant.js.
       This module extracts the brain into a stable, isolated API:
           window.NovaCore = { Knowledge, Signals, Intent, Memory,
                                Personalize, Refresh, Lang, Concepts,
                                Sources, Status }
     • The assistant.js chat & UI continue to work exactly as before;
       they bind to NovaCore opportunistically. If any hook is missing
       or this file fails to load, the base assistant gracefully
       degrades to the old behavior — site never breaks.
     • Designed for Phase 2 future growth — voice, image, longer
       memory, profiles, source citation, etc.

   Designed & Produced by Abdel Rahman Teba © ®
   ═══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  // Bail safely — never throw if loaded before data.js / hub.js.
  if (typeof window === "undefined") return;

  const NS = {
    KNOWLEDGE_URL: "/assets/data/nova-knowledge.json",
    SOURCES_URL: "/assets/data/nova-sources.json",
    PING_URL: "/api/nova",
    LS: {
      signals: "dentoverse_nova_signals_v1",
      concepts: "dentoverse_nova_concepts_v1",
      refresh: "dentoverse_nova_refresh_v1",
      prefs: "dentoverse_nova_prefs_v1",
      memory: "dentoverse_nova_memory_v1",
      feedback: "dentoverse_nova_feedback_v1",
      profile: "dentoverse_nova_profile_v1"
    }
  };

  /* ═══════════ tiny safe helpers ═══════════ */
  const lsGet = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fallback : v; } catch (e) { return fallback; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const safeNow = () => Date.now();
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const trim = (s, n) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1).trim() + "…" : s; };

  /* ═══════════ Arabic normalization (mirror assistant.js) ═══════════ */
  const norm = (s) => String(s || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9\u0600-\u06FF\s]/g, " ").replace(/\s+/g, " ").trim();
  const normArabic = (s) => norm(s)
    .replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/ة/g, "ه").replace(/[ًٌٍَُِّْـ]/g, "");
  const words = (s) => normArabic(s).split(" ").filter(w => w.length > 1);

  /* Arabic ↔ English bridging for dental terms. */
  const ARABIC_TERMS = {
    "اسنان": "teeth dental", "سن": "tooth dental", "ضرس": "molar tooth", "مينا": "enamel",
    "عاج": "dentin", "لب": "pulp", "لثه": "gingiva", "جذر": "root", "تاج": "crown",
    "رباط": "ligament periodontal", "تكوين": "formation development", "تطور": "development",
    "مواد": "materials", "خامات": "biomaterials materials", "طبعة": "impression", "جبس": "gypsum",
    "شمع": "wax", "سيراميك": "ceramics", "اسمنت": "cement", "حشو": "restorative composite",
    "كمبوزيت": "composite", "راتنج": "resin", "سباكة": "casting", "سبائك": "alloys",
    "تركيب": "composition structure", "خصائص": "properties", "انواع": "types classification",
    "وظيفه": "function", "عملي": "practical", "محاضره": "lecture", "محاضرة": "lecture",
    "ملف": "pdf document", "ملفات": "pdf documents", "صفحه": "page", "صفحة": "page",
    "اسئلة": "questions mcq exam", "اسئله": "questions mcq exam", "امتحان": "exam",
    "تشريح": "anatomy", "تعويضات": "prosthesis", "تركيبات": "prosthetics"
  };

  function expandQueryTerms(query) {
    const base = words(query);
    const extra = base.slice();
    base.forEach(w => {
      const candidates = [w];
      if (w.startsWith("وال") && w.length > 4) candidates.push(w.slice(3));
      if (w.startsWith("ال") && w.length > 3) candidates.push(w.slice(2));
      if (w.endsWith("ات") && w.length > 4) candidates.push(w.slice(0, -2), w.slice(0, -2) + "ه");
      const mapped = candidates.map(c => ARABIC_TERMS[c]).find(Boolean);
      if (mapped) extra.push(...words(mapped));
    });
    return Array.from(new Set(extra.filter(w => w.length > 1)));
  }

  /* ═══════════ Language detection (precise, dialect-aware) ═══════════ */
  const AR_RX = /[\u0600-\u06FF]/g;
  const EG_RX = /(ازاي|إزاي|عايز|عاوز|عاوزة|محتاج|مش |مفيش|كده|كدا|دلوقتي|فين|منين|ليه|اومال|يعني|خلاص|بتاع|بتاعة|بتاعه|عشان|علشان| قوي|اهو|ياعم|بص |جامد|تمام|ازيك|إزيك|عامل ايه|النهارده|النهاردة|طب |طيب |حاجة|حاجه|ايه ده|إيه ده|دلوقت|تعالا|يلا|وحشني)/;
  function detectLang(text) {
    const s = String(text || "");
    const arChars = (s.match(AR_RX) || []).length;
    const latin = (s.match(/[a-zA-Z]/g) || []).length;
    const isAr = arChars > 0 && arChars >= latin * 0.5;
    if (!isAr) return { lang: "en", dialect: "en", rtl: false, mixed: false };
    const dialect = EG_RX.test(s) ? "egy" : "msa";
    const mixed = latin >= Math.max(3, arChars * 0.15);
    return { lang: "ar", dialect, rtl: true, mixed };
  }

  /* ═══════════ Concept map (intent + topic detection) ═══════════ */
  const SYNONYMS = window.NovaCore_SYNONYMS || {};
  const TOKEN_CONCEPT = window.NovaCore_TOKEN_CONCEPT || {};

  const STOP = new Set(("a an the of for to in on at is are be am can could would please show me find open take go i " +
    "want need where whats what which how do you give get see look about all any my your this that with and or best some only " +
    "list link file files section page here there help hi hey hello thanks thank " +
    "في من الى إلى على عن مع هو هي ايه إيه ازاي إزاي فين عايز عاوز محتاج ممكن لو سمحت يا").split(" "));

  function analyzeConcepts(query) {
    const qWords = words(query).filter(w => !STOP.has(w));
    const concepts = new Set();
    qWords.forEach(w => {
      (TOKEN_CONCEPT[w] || new Set()).forEach(c => concepts.add(c));
      Object.keys(TOKEN_CONCEPT).forEach(tok => {
        if (tok.length > 4 && tok.startsWith(w) && w.length >= 4) TOKEN_CONCEPT[tok].forEach(c => concepts.add(c));
      });
    });
    return { qWords, concepts: Array.from(concepts) };
  }

  /* ═══════════ User signal tracking (feedback loop — safe, local) ═══════════ */
  // Tracks question patterns + resource engagement to gently improve
  // suggestion ranking, shortcut prompts, and recommended resources.
  // Does NOT modify Nova's code or self-train any model.
  const Signals = {
    state: lsGet(NS.LS.signals, {
      queries: [],          // recent queries (max 60)
      resources: {},        // resourceId -> {open, save, react, lastSeen}
      topics: {},           // concept -> count
      hoursBuckets: {},     // hour -> count
      webUsed: 0,
      lastQueries: []       // last 6 distinct queries
    }),
    log(text, meta) {
      try {
        const det = detectLang(text || "");
        const stamp = safeNow();
        meta = meta || {};
        const entry = { t: stamp, q: String(text || "").slice(0, 240), lang: det.lang, dialect: det.dialect, mixed: !!det.mixed };
        this.state.queries.push(entry);
        if (this.state.queries.length > 60) this.state.queries = this.state.queries.slice(-60);
        // topic counters
        analyzeConcepts(text).concepts.forEach(c => { this.state.topics[c] = (this.state.topics[c] || 0) + 1; });
        // hour bucket (low-cardinality usage pattern)
        const hr = new Date(stamp).getHours();
        this.state.hoursBuckets[hr] = (this.state.hoursBuckets[hr] || 0) + 1;
        // web use tracking
        if (meta.web) this.state.webUsed = (this.state.webUsed || 0) + 1;
        // last distinct queries (helps gloss over follow-ups)
        const last = this.state.lastQueries || [];
        if (text && (!last.length || last[last.length - 1].q !== text)) {
          this.state.lastQueries = [...last.slice(-5), entry];
        }
        lsSet(NS.LS.signals, this.state);
      } catch (e) {}
    },
    touched(id) {
      if (!id) return;
      const r = this.state.resources[id] || (this.state.resources[id] = { open: 0, save: 0, react: 0, lastSeen: 0 });
      if (arguments.length === 1) return;
    },
    bumpResource(id, key, delta) {
      if (!id) return;
      const r = this.state.resources[id] || (this.state.resources[id] = { open: 0, save: 0, react: 0, lastSeen: 0 });
      r[key] = (r[key] || 0) + (delta || 1); r.lastSeen = safeNow();
      lsSet(NS.LS.signals, this.state);
    },
    topTopics(limit) {
      return Object.entries(this.state.topics || {}).sort((a, b) => b[1] - a[1]).slice(0, limit || 5).map(x => x[0]);
    },
    popularRecent(limit) {
      return (this.state.lastQueries || []).slice(-(limit || 4)).reverse().map(x => x.q).filter(Boolean);
    },
    activeNow() {
      // Cheap heuristic: any signal in last 30 minutes = "active session"
      const last = this.state.lastQueries && this.state.lastQueries.length ? this.state.lastQueries[this.state.lastQueries.length - 1] : null;
      return last && (safeNow() - last.t) < 30 * 60 * 1000;
    },
    weeklySummary() {
      const qs = this.state.queries || [];
      const since = safeNow() - 7 * 24 * 3600 * 1000;
      const recent = qs.filter(x => x.t >= since);
      const langs = recent.reduce((m, x) => { m[x.lang] = (m[x.lang] || 0) + 1; return m; }, {});
      return { totalQueries: qs.length, recentQueries: recent.length, counts: this.state.topics, languages: langs };
    }
  };

  /* ═══════════ Intent detection (routing to handler type) ═══════════ */
  const RX = {
    greet: /\b(hi|hey|hello|yo|salam|salaam|good (morning|evening|afternoon))\b|السلام|اهلا|أهلا|مرحبا|هاي|ازيك|إزيك/i,
    thanks: /\b(thanks|thank you|thx|appreciate|shukran)\b|شكرا|شكراً|متشكر|تسلم/i,
    saved: /\b(saved|favou?rites?|bookmark|starred|my (list|stuff))\b|المحفوظات|المفضلة|محفوظاتي/i,
    where: /\b(where|locate|which (section|page|part)|find (the )?(section|page)|how do i (get|go) to)\b|فين|وين|في انهي|في أنهي|ازاي اروح|إزاي أروح/i,
    open: /\b(open|launch|play|watch|show me|view|read)\b|افتح|شغل|شغّل|اعرض|اقرا|اقرأ|وريني/i,
    web: /\b(latest|news|today|current|price|weather|202[4-9]|search (the )?web|google|look up|online|external|elsewhere)\b|اخبار|أخبار|النهاردة|النهارده|دلوقتي|سعر|الجو|احدث|أحدث|ابحث|جوجل|على النت|من النت/i,
    exam: /\b(exam|revision|revise|final|prepare|mcq|past ?paper)\b|امتحان|مراجعة|استذكار|نهائي/i,
    recommend: /\b(recommend|suggest|what should i (study|read|do|learn)|study next|study plan|to begin|start with)\b|اقترح|توصي|اذاكر ايه|أذاكر إيه|ابدا منين|أبدأ منين|ابدأ منين/i,
    compare: /\b(difference|compare|vs\.?|versus|better than|pros? and cons?|which is (better|more))\b|قارن|مقارنه|مقارنة|الفرق|ايه افضل|إيه أفضل|امتى نستخدم|أحسن|الفرق بين/i,
    translate: /\b(translate|translation|convert to|in arabic|in english|say it in)\b|ترجم|الترجمة|بالعربي|بالإنجليزي|بالانجليزي|بالانجليزى|في العربي|في الإنجليزية|to arabic|to english/i,
    summarize: /\b(summari[sz]e|summary|tl;?dr|recap|short version|brief)\b|لخص|لخّص|ملخص|باختصار|بإختصار/i,
    explain: /\b(explain|what is|what are|why|how|define|meaning of|tell me about|simplify|elaborate)\b|اشرح|إشرح|ايه هو|إيه هو|ايه هي|إيه هي|ليه|ازاي|إزاي|عرف|عرّف|يعني ايه|يعني إيه|وضح|وضّح/i,
    locate: /\b(open (the )?section|navigate to|go to (the )?section|under which|under what|which (section|tab|page))\b|في انهي قسم|في أنهي قسم|اكمن|فين/i,
    detail: /\b(detail|more detail|specifically|exactly|deep|step by step)\b|بالتفصيل|تفاصيل|خطوة بخطوة|التفاصيل|بالضبط/i
  };

  function detectIntent(text, concepts, qWords) {
    const t = String(text || "");
    const det = detectLang(t);

    // Conversational / social
    if (RX.greet.test(t) && (qWords || []).length <= 3 && (concepts || []).length === 0) return "greet";
    if (RX.thanks.test(t) && (qWords || []).length <= 4) return "thanks";

    // Action intents
    if (RX.saved.test(t)) return "saved";
    if (RX.compare.test(t)) return "compare";
    if (RX.translate.test(t)) return "translate";
    if (RX.locate.test(t) || RX.where.test(t) || (RX.open.test(t) && /section|قسم|tab/i.test(t))) return "locate";
    if (RX.recommend.test(t)) return "recommend";
    if (RX.exam.test(t) && !RX.explain.test(t)) return "exam-prep";
    if (RX.summaryIntent && RX.summaryIntent.test(t)) return "summarize";

    if (RX.summarize.test(t)) return "summarize";
    if (RX.explain.test(t) || RX.detail.test(t)) return "explain";

    // Web vs site decision (lightweight) — the real decision is made in the router.
    if (RX.web.test(t)) return "web";

    // Heuristic: short, concept-only queries that map to a known SECTIONS entry → "locate".
    if ((concepts || []).some(c => c === "anatomy" || c === "biomaterials2" || c === "prothesis" || c === "bm2practical" || c === "stage2" || c === "oralbio" || c === "quizzes" || c === "notes" || c === "flashcards")) {
      return (qWords || []).length <= 4 ? "locate" : "explain";
    }
    return "general";
  }

  /* ═══════════ Memory (longer, persistent, lightweight) ═══════════ */
  const Memory = {
    turns: lsGet(NS.LS.memory, []),
    push(role, content) {
      this.turns.push({ role, content: String(content || "").slice(0, 4000), t: safeNow() });
      if (this.turns.length > 24) this.turns = this.turns.slice(-24);
      lsSet(NS.LS.memory, this.turns);
    },
    clear() { this.turns = []; lsSet(NS.LS.memory, this.turns); },
    recent(limit) { return this.turns.slice(-(limit || 20)); },
    text(limit) { return this.turns.slice(-(limit || 20)).map(t => `${t.role}: ${t.content}`).join("\n"); }
  };

  /* ═══════════ Concept feedback (resource ranking deltas) ═══════════ */
  const Feedback = {
    data: lsGet(NS.LS.feedback, {}),
    bump(key, delta) { if (!key) return; this.data[key] = (this.data[key] || 0) + (delta || 1); lsSet(NS.LS.feedback, this.data); },
    score(key) { return this.data[key] || 0; }
  };

  /* ═══════════ Personalization (preferences + recent topics) ═══════════ */
  const Personalize = {
    data: lsGet(NS.LS.prefs, { mode: "auto", lang: "auto", web: false, intent: "auto" }),
    profile: lsGet(NS.LS.profile, { lastTopics: [], favouriteTopics: [], examFocus: false }),
    loadPrefs() { this.data = lsGet(NS.LS.prefs, this.data); return this.data; },
    savePrefs() { lsSet(NS.LS.prefs, this.data); },
    set(key, value) { if (key in this.data) { this.data[key] = value; this.savePrefs(); } },
    bumpTopic(topic) {
      if (!topic) return;
      this.profile.lastTopics = [topic, ...this.profile.lastTopics.filter(t => t !== topic)].slice(0, 8);
      // keep a tiny favourites list (top recurring)
      this.profile.favouriteTopics = this.profile.favouriteTopics.slice(0, 8);
      lsSet(NS.LS.profile, this.profile);
    },
    focusExam(on) { this.profile.examFocus = !!on; lsSet(NS.LS.profile, this.profile); },
    isExamFocused() { return !!this.profile.examFocus; }
  };

  /* ═══════════ Auto-refresh / index freshness ═══════════
     Nova KNOWS how to keep itself up to date. It tracks:
       • The last time the local knowledge index was loaded.
       • A daily soft-refresh hint (URL + timestamp) the chat can use
         to prompt the user for a manual refresh, AND a silent
         in-browser re-fetch every "interval" minutes.
     Never modifies code or execs anything. Only reads /assets/data.
  */
  const Refresh = {
    state: lsGet(NS.LS.refresh, { lastLoad: 0, lastRefreshCheck: 0, lastVersion: null, lastHash: null, softDirty: false }),
    minInterval: 5 * 60 * 1000,         // 5 minutes between automatic checks
    recommendInterval: 24 * 60 * 60 * 1000, // suggest manual refresh once / day
    markLoaded(knowledge) {
      this.state.lastLoad = safeNow();
      try {
        const str = JSON.stringify(knowledge).slice(0, 4096);
        this.state.lastHash = simpleHash(str);
        if (knowledge && knowledge.docsHash) this.state.lastVersion = knowledge.docsHash;
      } catch (e) {}
      lsSet(NS.LS.refresh, this.state);
    },
    markDirty(reason) {
      this.state.softDirty = true;
      this.state.lastDirtyReason = reason || "unknown";
      this.state.lastDirtyAt = safeNow();
      lsSet(NS.LS.refresh, this.state);
    },
    shouldCheck() { return safeNow() - (this.state.lastRefreshCheck || 0) > this.minInterval; },
    shouldRecommend() { return safeNow() - (this.state.lastLoad || 0) > this.recommendInterval; },
    freshness() {
      const age = safeNow() - (this.state.lastLoad || 0);
      return {
        ageMs: age,
        ageHours: +(age / 3600000).toFixed(1),
        stale: age > this.recommendInterval,
        softDirty: !!this.state.softDirty
      };
    }
  };
  function simpleHash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i); return (h >>> 0).toString(36); }

  /* ═══════════ Knowledge base (PDF-granular) ═══════════ */
  const Knowledge = {
    ready: false, loading: false,
    data: { documents: [], chunks: [], stats: {} },
    index: [],
    lastQuery: "", lastMatches: [],
    version: null, hash: null,
    async load(force) {
      if (this.loading) return false;
      if (this.ready && !force) return true;
      this.loading = true;
      try {
        // Add a cache-buster occasionally so the live site picks up freshly regenerated indexes.
        const bust = (Refresh.state.lastLoad && safeNow() - Refresh.state.lastLoad > 60 * 60 * 1000) ? ("?v=" + Date.now()) : "";
        const r = await fetch(NS.KNOWLEDGE_URL + bust, { cache: force ? "reload" : "default" });
        if (!r.ok) throw new Error("knowledge_unavailable");
        const d = await r.json();
        this.data = d;
        this.index = (d.chunks || []).map(chunk => {
          const meta = `${chunk.title} ${chunk.sectionLabel || chunk.section || ""} ${chunk.category} ${chunk.heading}`;
          return {
            chunk,
            _normalizedMeta: normArabic(meta),
            _normalizedText: normArabic(chunk.text),
            _tokens: new Set(words(`${meta} ${chunk.text}`))
          };
        });
        this.ready = true;
        this.version = d.docsHash || d.version || null;
        Refresh.markLoaded(d);
        return true;
      } catch (e) {
        this.ready = false;
        return false;
      } finally {
        this.loading = false;
      }
    },
    isReady() { return this.ready && this.index.length > 0; },
    resolveShortFollowup(q) {
      const short = /^(explain|summarize|continue|more|why|how|what about|and |اشرح|لخص|كمل|ليه|ازاي|طب |وماذا|وما |ايه كمان)/i.test(String(q).trim());
      return short && this.lastQuery ? `${this.lastQuery} ${q}` : q;
    },
    search(q, limit) {
      if (!this.isReady()) return [];
      const resolved = this.resolveShortFollowup(q);
      const terms = expandQueryTerms(resolved);
      const phrase = normArabic(resolved);
      const scored = this.index.map(entry => {
        let score = 0, hits = 0;
        terms.forEach(term => {
          if (entry._normalizedMeta.includes(term)) { score += 9; hits++; }
          else if (entry._tokens.has(term)) { score += 4.5; hits++; }
          else if (term.length > 4 && entry._normalizedText.includes(term)) { score += 2.2; hits++; }
        });
        if (phrase.length > 8 && entry._normalizedText.includes(phrase)) score += 20;
        // bilingual relevance — reward cross-language hits via term expansion already done
        if (hits > 1) score += hits * 1.6;
        // feedback nudge
        if (entry.chunk && entry.chunk.resourceId) score += clamp(Feedback.score(entry.chunk.resourceId), -2, 3);
        return { ...entry.chunk, score, hits };
      }).filter(c => c.score >= 3.5)
        .sort((a, b) => b.score - a.score || a.page - b.page);

      // diversify: max 2 chunks per resource
      const selected = [];
      const perDoc = {};
      for (const it of scored) {
        if ((perDoc[it.resourceId] || 0) >= 2) continue;
        selected.push(it); perDoc[it.resourceId] = (perDoc[it.resourceId] || 0) + 1;
        if (selected.length >= (limit || 6)) break;
      }
      if (selected.length) { this.lastQuery = resolved; this.lastMatches = selected; }
      return selected;
    },
    stats() { return Object.assign({}, this.data.stats || {}); }
  };

  /* ═══════════ External sources (allowlist loader) ═══════════ */
  const Sources = {
    policy: { web_search_enabled_default: false, max_results_per_query: 5 },
    list: [], topicAliases: {},
    ready: false, loading: false,
    async load() {
      if (this.ready || this.loading) return this.ready;
      this.loading = true;
      try {
        const r = await fetch(NS.SOURCES_URL, { cache: "default" });
        if (!r.ok) throw new Error("sources_unavailable");
        const d = await r.json();
        this.list = (d.sources || []);
        this.topicAliases = d.topic_aliases || {};
        this.policy = Object.assign({}, this.policy, d.policy || {});
        this.ready = true;
      } catch (e) { this.ready = false; }
      this.loading = false;
      return this.ready;
    },
    isAllowedHost(host) {
      if (!host) return false;
      host = host.toLowerCase().replace(/^www\./, "");
      return this.list.some(s => (s.host || "").toLowerCase().replace(/^www\./, "") === host);
    },
    pickFor(query, limit) {
      const q = String(query || "").toLowerCase();
      const ranked = this.list.map(s => {
        let score = 0;
        (s.tags || []).forEach(t => { if (q.includes(String(t).toLowerCase())) score += 2; });
        (s.language || []).forEach(l => { if (l === "en" || l === "ar") score += 0.2; });
        return Object.assign({ _score: score }, s);
      }).sort((a, b) => b._score - a._score);
      return ranked.slice(0, limit || 3);
    }
  };

  /* ═══════════ Public Status (for the UI badge) ═══════════ */
  const Status = {
    knowledge: { ready: false, docs: 0, pages: 0, chunks: 0, version: null, lastRefresh: 0, ageHours: 0, stale: false },
    sources: { ready: false, count: 0 },
    signals: { totalQueries: 0, recent: 0, topics: {} },
    intent: "auto",
    refresh() {
      this.knowledge.ready = Knowledge.isReady();
      const s = Knowledge.stats();
      this.knowledge.docs = s.documents || 0;
      this.knowledge.pages = s.pages || 0;
      this.knowledge.chunks = s.chunks || this.index ? Knowledge.index.length : 0;
      this.knowledge.version = Knowledge.version;
      this.knowledge.lastRefresh = Refresh.state.lastLoad || 0;
      const f = Refresh.freshness();
      this.knowledge.ageHours = f.ageHours;
      this.knowledge.stale = f.stale;
      this.sources.ready = Sources.ready;
      this.sources.count = Sources.list.length;
      const sum = Signals.weeklySummary();
      this.signals.totalQueries = sum.totalQueries;
      this.signals.recent = sum.recentQueries;
      this.signals.topics = sum.counts;
      this.intent = Personalize.data.intent || "auto";
    }
  };

  /* ═══════════ Bootstrapping (deferred) ═══════════ */
  let booted = false;
  async function boot() {
    if (booted) return;
    booted = true;
    try { await Knowledge.load(); } catch (e) {}
    try { await Sources.load(); } catch (e) {}
    try { Status.refresh(); } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  /* ═══════════ Public API ═══════════ */
  window.NovaCore = {
    version: "2.0-phase2",
    Knowledge, Sources, Signals, Memory, Feedback, Personalize, Refresh, Status,
    Lang: { detect: detectLang },
    Concepts: { analyze: analyzeConcepts, expandTerms: expandQueryTerms, synonyms: SYNONYMS, tokenConcept: TOKEN_CONCEPT },
    Intent: { detect: detectIntent, RX },
    boot
  };
})();
