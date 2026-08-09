/* ═══════════════════════════════════════════════════════════════
   DENTOVERSE — NOVA AI · LEARN MODULE (Phase 4)
   ───────────────────────────────────────────────────────────────
   Safe, additive learning layer for Nova.

   PURPOSE
     Give Nova a way to *safely learn* from material the user
     explicitly provides — chat logs, prompt examples, AI output
     examples, dental study notes — WITHOUT any autonomous self-
     modifying behaviour and WITHOUT touching Nova's own source code.

     "Learning" here means:
       1. Ingest user text (paste or file drop) → normalise + split
          into tagged chunks.
       2. Persist chunks locally (localStorage) as a personal
          knowledge index only that browser can read.
       3. Rank + retrieve the most relevant learned chunks on every
          user turn, and expose them to /api/nova (and the local
          fallback) as extra context — so answers can *use* them.
       4. Track user feedback (👍 / 👎, edits, saves) as a soft
          ranking signal to bias future retrievals.
       5. Distil frequently-used prompt patterns into a reusable
          "prompt library" the chat can offer as one-tap chips.

     NOTHING in this module executes user-supplied code, calls
     unknown endpoints, or edits Nova's other JS files. It only
     reads what the user pasted and stores it as searchable text.

   PUBLIC API (window.NovaLearn)
     addText(text, meta?)             → { id, chunks } | null
     addFile(file)                    → Promise<{ id, chunks }>
     addConversation(text, meta?)     → same as addText, tagged "chat"
     addPrompt(text, meta?)           → adds to prompt library
     search(query, limit?)            → [{ id, text, score, tags,
                                          source, addedAt }]
     contextFor(query, limit?)        → [{ text, source, tags }]
     rate(entryId, delta)             → adjust ranking bias
     list()                           → all learned entries
     entry(id)                        → single entry with full chunks
     remove(id)                       → delete an entry
     clear()                          → wipe all learned material
     stats()                          → { entries, chunks, chars,
                                          prompts, lastAt }
     exportJSON()                     → downloadable snapshot
     importJSON(json)                 → merge an exported snapshot
     promptLibrary()                  → [{ id, title, text, uses }]
     usePrompt(id)                    → increments use counter

   Designed & Produced by Abdel Rahman Teba © ®
   ═══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  if (typeof window === "undefined") return;

  const LS = {
    entries:      "dentoverse_nova_learn_entries_v1",   // [{id, source, tags, chars, addedAt, chunks:[{text, norm, tokens[]}], meta}]
    promptLib:    "dentoverse_nova_learn_prompts_v1",   // [{id, title, text, uses, addedAt, lang}]
    ranking:      "dentoverse_nova_learn_ranking_v1",   // {entryId: number}
    version:      "dentoverse_nova_learn_version_v1"
  };
  const VERSION = "1.0-phase4";
  const MAX_ENTRIES     = 120;
  const MAX_CHARS_TOTAL = 900_000;   // ~900 KB of text total (conservative for localStorage)
  const CHUNK_CHARS     = 900;
  const CHUNK_OVERLAP   = 90;
  const MAX_TEXT_INPUT  = 500_000;   // per single addText/addFile
  const MAX_FILE_MB     = 8;

  /* ───────── safe storage helpers ───────── */
  function lsGet(key, fallback) {
    try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) {
      // Storage quota → try trimming entries and retry once.
      try {
        if (key === LS.entries && Array.isArray(value) && value.length > 4) {
          const trimmed = value.slice(-Math.max(4, Math.floor(value.length * 0.7)));
          localStorage.setItem(key, JSON.stringify(trimmed));
        }
      } catch (e2) {}
      return false;
    }
  }

  /* ───────── text normalisation (mirrors nova-core / nova-pdf) ───────── */
  function norm(s) {
    return String(s || "")
      .toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9\u0600-\u06FF\s]/g, " ")
      .replace(/\s+/g, " ").trim();
  }
  function normArabic(s) {
    return norm(s)
      .replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
      .replace(/ة/g, "ه").replace(/[ًٌٍَُِّْـ]/g, "");
  }
  function words(s) { return normArabic(s).split(" ").filter(w => w.length > 1); }

  const STOP = new Set(("a an the of for to in on at is are was were be been being can could would should please show me find open i " +
    "want need where what which how do does did you your this that these those with and or not it its as by from into we they he she " +
    "في من الى إلى على عن مع هو هي ايه إيه ما ماذا كيف هل يا ان أن كان قد ثم بين عند غير كل بعض هذا هذه ذلك تلك").split(" "));

  function detectLang(s) {
    const t = String(s || "");
    const ar = (t.match(/[\u0600-\u06FF]/g) || []).length;
    const en = (t.match(/[a-zA-Z]/g) || []).length;
    if (ar > 0 && ar >= en * 0.5) return "ar";
    if (en > 0) return "en";
    return "auto";
  }

  /* ───────── chunk splitter ───────── */
  function splitChunks(text) {
    const clean = String(text || "").replace(/\r\n/g, "\n").trim();
    if (!clean) return [];
    if (clean.length <= CHUNK_CHARS) return [clean];
    const out = [];
    let i = 0;
    while (i < clean.length) {
      let end = Math.min(i + CHUNK_CHARS, clean.length);
      if (end < clean.length) {
        // Prefer paragraph, then sentence, then space boundary.
        let cut = clean.lastIndexOf("\n\n", end);
        if (cut < i + CHUNK_CHARS * 0.4) cut = clean.lastIndexOf("\n", end);
        if (cut < i + CHUNK_CHARS * 0.4) cut = clean.lastIndexOf(". ", end);
        if (cut < i + CHUNK_CHARS * 0.4) cut = clean.lastIndexOf(" ", end);
        if (cut > i + CHUNK_CHARS * 0.4) end = cut + 1;
      }
      out.push(clean.slice(i, end).trim());
      if (end >= clean.length) break;
      i = Math.max(end - CHUNK_OVERLAP, i + 1);
    }
    return out.filter(Boolean);
  }

  /* ───────── conversation log format detection ─────────
     Rough heuristics — helps tag "chat" content so retrieval
     can weight patterns/style from real conversations higher. */
  const CHAT_MARKERS = /(^|\n)\s*(user|assistant|nova|system|you|me|bot|human|ai)\s*[:>-]/i;
  function looksLikeChatLog(text) { return CHAT_MARKERS.test(String(text || "").slice(0, 4000)); }

  const PROMPT_MARKERS = /(^|\n)\s*(prompt|برومبت|طلب|صيغة|template)\s*[:>-]/i;
  function looksLikePromptExample(text) {
    const s = String(text || "").slice(0, 1200);
    if (PROMPT_MARKERS.test(s)) return true;
    if (s.length < 800 && /(create|design|generate|imagine|render|photo of|صمم|اعمل|ارسم|صور)/i.test(s)) return true;
    return false;
  }

  /* ───────── ranking helpers ───────── */
  const Ranking = {
    data: lsGet(LS.ranking, {}),
    bump(id, delta) { if (!id) return; this.data[id] = (this.data[id] || 0) + (delta || 1); lsSet(LS.ranking, this.data); },
    score(id) { return this.data[id] || 0; }
  };

  /* ───────── entry store ───────── */
  const Store = {
    entries: lsGet(LS.entries, []),
    prompts: lsGet(LS.promptLib, []),

    persist() { lsSet(LS.entries, this.entries); },
    persistPrompts() { lsSet(LS.promptLib, this.prompts); },

    totalChars() { return this.entries.reduce((s, e) => s + (e.chars || 0), 0); },

    add(rawText, meta) {
      const text = String(rawText || "").trim();
      if (!text) return null;
      if (text.length > MAX_TEXT_INPUT) {
        // Silently truncate — we still index what we can.
      }
      const trimmed = text.slice(0, MAX_TEXT_INPUT);

      const tags = new Set(Array.isArray(meta && meta.tags) ? meta.tags : []);
      if (looksLikeChatLog(trimmed)) tags.add("chat");
      if (looksLikePromptExample(trimmed)) tags.add("prompt");
      if (meta && meta.source === "file") tags.add("file");

      const chunks = splitChunks(trimmed).map(t => ({
        text: t,
        _norm: normArabic(t),
        _tokens: new Set(words(t))
      }));
      if (!chunks.length) return null;

      const entry = {
        id: "learn-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
        source: (meta && meta.source) || "paste",
        title: (meta && meta.title) || autoTitle(trimmed),
        lang: detectLang(trimmed),
        tags: Array.from(tags),
        chars: trimmed.length,
        chunkCount: chunks.length,
        addedAt: Date.now(),
        _chunks: chunks,
        meta: (meta && typeof meta === "object") ? { ...meta } : {}
      };
      this.entries.push(entry);
      // Enforce caps.
      while (this.entries.length > MAX_ENTRIES || this.totalChars() > MAX_CHARS_TOTAL) {
        this.entries.shift();
      }
      this.persist();
      return entry;
    },

    remove(id) {
      const before = this.entries.length;
      this.entries = this.entries.filter(e => e.id !== id);
      if (this.entries.length !== before) this.persist();
      return this.entries.length !== before;
    },

    clear() { this.entries = []; this.persist(); },

    entry(id) { return this.entries.find(e => e.id === id) || null; },

    list() {
      // Return light-weight metadata (no chunk text) so UI can list quickly.
      return this.entries.map(e => ({
        id: e.id, source: e.source, title: e.title, lang: e.lang,
        tags: e.tags.slice(), chars: e.chars, chunkCount: e.chunkCount, addedAt: e.addedAt
      }));
    }
  };

  /* Rehydrate _norm / _tokens after storage load (Sets are lost through JSON). */
  Store.entries.forEach(e => {
    (e._chunks || []).forEach(c => {
      if (!c._norm) c._norm = normArabic(c.text);
      if (!(c._tokens instanceof Set)) c._tokens = new Set(words(c.text));
    });
  });

  function autoTitle(text) {
    const line = String(text || "").split(/\n+/).map(s => s.trim()).find(s => s.length >= 6);
    if (line) return line.slice(0, 80);
    return String(text || "").slice(0, 60) + "…";
  }

  /* ───────── search ───────── */
  function search(query, limit) {
    const q = String(query || "").trim();
    if (!q || !Store.entries.length) return [];
    // Expand Arabic terms if NovaCore is available (best-effort).
    let terms = words(q).filter(w => !STOP.has(w));
    try {
      if (window.NovaCore && window.NovaCore.Concepts && typeof window.NovaCore.Concepts.expandTerms === "function") {
        const extra = window.NovaCore.Concepts.expandTerms(q);
        terms = Array.from(new Set([...terms, ...extra.filter(w => !STOP.has(w))]));
      }
    } catch (e) {}
    if (!terms.length) return [];
    const phrase = normArabic(q);

    const scored = [];
    Store.entries.forEach(entry => {
      const rankBias = Math.max(-3, Math.min(6, Ranking.score(entry.id)));
      (entry._chunks || []).forEach((chunk, ci) => {
        let score = 0, hits = 0;
        terms.forEach(term => {
          if (chunk._tokens && chunk._tokens.has(term)) { score += 4; hits++; }
          else if (term.length > 4 && chunk._norm && chunk._norm.includes(term)) { score += 2; hits++; }
        });
        if (phrase.length > 10 && chunk._norm && chunk._norm.includes(phrase)) score += 12;
        if (hits > 1) score += hits * 1.4;
        // Prefer chat/prompt examples slightly when user is asking for style/pattern-like things.
        if (entry.tags && entry.tags.includes("prompt") && /prompt|style|design|صمم|برومبت/i.test(q)) score += 1.2;
        if (entry.tags && entry.tags.includes("chat") && /explain|شرح|قولي/i.test(q)) score += 0.6;
        score += rankBias;
        if (score >= 4.5) {
          scored.push({
            id: entry.id, chunkIndex: ci, text: chunk.text, score,
            tags: entry.tags.slice(), source: entry.source, title: entry.title,
            lang: entry.lang, addedAt: entry.addedAt
          });
        }
      });
    });
    scored.sort((a, b) => b.score - a.score);
    // Diversify: max 2 chunks per entry.
    const perEntry = {}; const out = [];
    for (const it of scored) {
      if ((perEntry[it.id] || 0) >= 2) continue;
      perEntry[it.id] = (perEntry[it.id] || 0) + 1;
      out.push(it);
      if (out.length >= (limit || 5)) break;
    }
    return out;
  }

  function contextFor(query, limit) {
    return search(query, limit || 4).map(m => ({
      text: m.text.slice(0, 1600),
      source: m.source, tags: m.tags, title: m.title, lang: m.lang
    }));
  }

  /* ───────── prompt library ───────── */
  function addPrompt(text, meta) {
    const t = String(text || "").trim();
    if (!t || t.length > 3000) return null;
    const entry = {
      id: "prm-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6),
      title: (meta && meta.title) || autoTitle(t),
      text: t,
      lang: detectLang(t),
      uses: 0,
      tags: (meta && Array.isArray(meta.tags)) ? meta.tags.slice(0, 6) : [],
      addedAt: Date.now()
    };
    Store.prompts.push(entry);
    while (Store.prompts.length > 60) Store.prompts.shift();
    Store.persistPrompts();
    return entry;
  }
  function usePrompt(id) {
    const p = Store.prompts.find(x => x.id === id);
    if (!p) return null;
    p.uses = (p.uses || 0) + 1;
    Store.persistPrompts();
    return p;
  }
  function promptLibrary() {
    return Store.prompts
      .slice()
      .sort((a, b) => (b.uses || 0) - (a.uses || 0) || b.addedAt - a.addedAt)
      .map(p => ({ id: p.id, title: p.title, text: p.text, uses: p.uses, lang: p.lang, tags: p.tags, addedAt: p.addedAt }));
  }
  function removePrompt(id) {
    const before = Store.prompts.length;
    Store.prompts = Store.prompts.filter(p => p.id !== id);
    if (Store.prompts.length !== before) Store.persistPrompts();
    return Store.prompts.length !== before;
  }

  /* ───────── file ingestion (text / md / json / csv only; PDFs go through NovaPDF) ───────── */
  async function addFile(file) {
    if (!file) throw new Error("no_file");
    if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error("too_large");
    const name = String(file.name || "attachment").toLowerCase();
    const type = String(file.type || "").toLowerCase();
    const isPdf = type === "application/pdf" || /\.pdf$/i.test(name);
    if (isPdf) {
      // PDFs are handled by NovaPDF, not here — the chat wires them separately.
      throw new Error("pdf_not_supported_here");
    }
    // Anything else: read as text.
    const text = await file.text();
    if (!text || !text.trim()) throw new Error("empty_file");
    const entry = Store.add(text, {
      source: "file",
      title: file.name,
      tags: ["file", extToTag(name)]
    });
    return entry;
  }
  function extToTag(name) {
    if (/\.md$/i.test(name)) return "md";
    if (/\.json$/i.test(name)) return "json";
    if (/\.csv$/i.test(name)) return "csv";
    if (/\.txt$/i.test(name)) return "txt";
    if (/\.html?$/i.test(name)) return "html";
    return "text";
  }

  /* ───────── export / import ───────── */
  function exportJSON() {
    return {
      version: VERSION,
      exportedAt: Date.now(),
      entries: Store.entries.map(e => ({
        id: e.id, source: e.source, title: e.title, lang: e.lang, tags: e.tags,
        chars: e.chars, chunkCount: e.chunkCount, addedAt: e.addedAt, meta: e.meta,
        _chunks: (e._chunks || []).map(c => ({ text: c.text }))
      })),
      prompts: Store.prompts.slice(),
      ranking: Ranking.data
    };
  }
  function importJSON(data) {
    if (!data || typeof data !== "object") return { ok: false, reason: "invalid" };
    let added = 0;
    if (Array.isArray(data.entries)) {
      data.entries.forEach(e => {
        if (!e || !Array.isArray(e._chunks)) return;
        const text = e._chunks.map(c => c.text).join("\n\n");
        if (Store.add(text, { source: e.source || "import", title: e.title, tags: e.tags })) added++;
      });
    }
    if (Array.isArray(data.prompts)) {
      data.prompts.forEach(p => { if (p && p.text) addPrompt(p.text, { title: p.title, tags: p.tags }); });
    }
    if (data.ranking && typeof data.ranking === "object") {
      Object.assign(Ranking.data, data.ranking);
      lsSet(LS.ranking, Ranking.data);
    }
    return { ok: true, added };
  }

  /* ───────── stats ───────── */
  function stats() {
    const lastAt = Store.entries.length ? Math.max(...Store.entries.map(e => e.addedAt || 0)) : 0;
    return {
      entries: Store.entries.length,
      chunks: Store.entries.reduce((s, e) => s + (e.chunkCount || 0), 0),
      chars: Store.totalChars(),
      prompts: Store.prompts.length,
      lastAt
    };
  }

  /* ───────── public API ───────── */
  window.NovaLearn = {
    version: VERSION,
    /* ingest */
    addText: (text, meta) => Store.add(text, meta || {}),
    addConversation: (text, meta) => Store.add(text, Object.assign({ source: "chat", tags: ["chat"] }, meta || {})),
    addFile,
    addPrompt,
    /* retrieval */
    search,
    contextFor,
    /* management */
    list: () => Store.list(),
    entry: (id) => {
      const e = Store.entry(id);
      if (!e) return null;
      return {
        id: e.id, source: e.source, title: e.title, lang: e.lang,
        tags: e.tags.slice(), chars: e.chars, chunkCount: e.chunkCount,
        addedAt: e.addedAt, meta: e.meta,
        chunks: (e._chunks || []).map(c => ({ text: c.text }))
      };
    },
    remove: (id) => Store.remove(id),
    clear: () => Store.clear(),
    stats,
    /* feedback / ranking */
    rate: (id, delta) => Ranking.bump(id, delta),
    /* prompt library */
    promptLibrary,
    usePrompt,
    removePrompt,
    /* backup */
    exportJSON,
    importJSON
  };
})();
