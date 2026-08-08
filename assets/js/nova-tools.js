/* ═══════════════════════════════════════════════════════════════
   DENTOVERSE — NOVA AI · TOOL REGISTRY (Phase 2)
   ───────────────────────────────────────────────────────────────
   A modular set of prompt-side "tools" Nova can invoke.

   Goal: make Nova feel like an EXPERT ASSISTANT with named
   capabilities rather than a generic chatbot. Every tool is a
   deterministic pure function (or pure-JS processor) — none of
   them rewrite Nova or call dangerous endpoints.

   Tools included
     • answer       — open-ended AI answer (delegates to /api/nova)
     • explain      — explain a concept (detailed or simple)
     • summarize    — condense long content into bullets
     • locate       — find a resource / section / file
     • search       — search the hub
     • recommend    — suggest next resources
     • compare      — compare two topics/sections
     • translate    — natural translation request (English ↔ Arabic)
     • guide        — guide the user to a section or page
     • openResource — open a specific resource by id/title
     • web          — search approved external sources
     • refine       — refine / re-filter previous search results

   Designed & Produced by Abdel Rahman Teba © ®
   ═══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  if (typeof window === "undefined") return;

  let ToolRegistry = null; // internal alias to the Tools map (declared to satisfy strict mode)
  const STAGE = { resources: [], sections: [], labels: {}, helpers: {} };

  function registerContext(ctx) {
    if (!ctx) return;
    if (Array.isArray(ctx.resources)) {
      STAGE.resources = ctx.resources;
      STAGE.labels.RESOURCES = "Resource catalog";
    }
    if (Array.isArray(ctx.sections)) {
      STAGE.sections = ctx.sections;
      STAGE.labels.SECTIONS = "Section catalog";
    }
    Object.assign(STAGE.labels, ctx.labels || {});
    Object.assign(STAGE.helpers, ctx.helpers || {});
  }

  /* ───────── helpers ───────── */
  const trim = (s, n) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1).trim() + "…" : s; };
  const safe = (s) => String(s == null ? "" : s).replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

  function findResource(query) {
    const q = String(query || "").toLowerCase().trim();
    if (!q) return null;
    const byId = STAGE.resources.find(r => r.id === q);
    if (byId) return byId;
    const sub = STAGE.resources.filter(r => {
      return (r.title || "").toLowerCase().includes(q) || (r.category || "").toLowerCase().includes(q)
        || (r.description || "").toLowerCase().includes(q) || (r.tags || []).some(t => String(t).toLowerCase().includes(q));
    }).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    return sub[0] || null;
  }
  function findSection(idOrLabel) {
    const q = String(idOrLabel || "").toLowerCase().trim();
    if (!q) return null;
    return STAGE.sections.find(s => s.id === q || (s.label || "").toLowerCase() === q || (s.label || "").toLowerCase().includes(q)) || null;
  }

  /* ───────── tool implementations ─────────
     Every tool returns a uniform envelope:
       { kind, title, body, cards, sources, chips, action, followups }
     The chat renders this envelope the same way regardless of tool. */

  const Tools = {
    /* ─── explain ─── */
    explain(input, ctx) {
      const topic = (input.topic || input.query || "").trim();
      const det = (window.NovaCore && NovaCore.Lang && NovaCore.Lang.detect(topic)) || { lang: "en", rtl: false };
      const knowledgeMatches = (window.NovaCore && NovaCore.Knowledge && NovaCore.Knowledge.search(topic, 5)) || [];
      const hint = ctx && ctx.simple ? "simple" : (ctx && ctx.detail ? "detailed" : (ctx && ctx.mode) || "auto");
      const body = det.lang === "ar"
        ? `هشرحلك <strong>${safe(topic)}</strong> بطريقة منظمة اعتماداً على مكتبة المنصة. لو محتاج تبسيط أكتر أو تفصيل، قولّي.`
        : `Here's a clean explanation of <strong>${safe(topic)}</strong> grounded in the DentoVerse library. Tell me if you'd like a simpler or more detailed version.`;
      return { kind: "explain", title: "Explain", body, sources: knowledgeMatches, meta: { topic, mode: hint, routing: "explain" } };
    },

    /* ─── summarize ─── */
    summarize(input, ctx) {
      const topic = (input.topic || input.query || "").trim();
      const knowledgeMatches = (window.NovaCore && NovaCore.Knowledge && NovaCore.Knowledge.search(topic, 6)) || [];
      const det = (window.NovaCore && NovaCore.Lang && NovaCore.Lang.detect(topic)) || { lang: "en", rtl: false };
      const body = det.lang === "ar"
        ? `الملخص يستند على أفضل المقاطع في المكتبة. لو رفعت PDF معيّن خُصّصه ليك على طول.`
        : `Summary is grounded in the strongest matching library passages. Upload a specific PDF and I'll tailor the summary to it.`;
      return { kind: "summarize", title: "Summarize", body, sources: knowledgeMatches, meta: { topic } };
    },

    /* ─── locate ─── */
    locate(input) {
      const q = (input.query || input.topic || "").trim();
      const sec = findSection(q);
      const res = findResource(q);
      const matches = (window.NovaCore && NovaCore.Knowledge && NovaCore.Knowledge.search(q, 4)) || [];
      const det = (window.NovaCore && NovaCore.Lang && NovaCore.Lang.detect(q)) || { lang: "en", rtl: false };
      let body = det.lang === "ar"
        ? `لقيت المكان الأنسب لـ <strong>${safe(q)}</strong>:`
        : `Best location for <strong>${safe(q)}</strong>:`;
      return {
        kind: "locate",
        title: "Locate",
        body,
        cards: res ? [res] : (matches.length ? matches.map(m => STAGE.resources.find(r => r.id === m.resourceId)).filter(Boolean).slice(0, 3) : []),
        chips: sec ? [{ label: `${sec.icon} ${sec.label}`, act: "nav:" + sec.id }] : [],
        sourceMatches: matches
      };
    },

    /* ─── search ─── */
    search(input, ctx) {
      const q = (input.query || input.topic || "").trim();
      const det = (window.NovaCore && NovaCore.Lang && NovaCore.Lang.detect(q)) || { lang: "en", rtl: false };
      const knowledgeMatches = (window.NovaCore && NovaCore.Knowledge && NovaCore.Knowledge.search(q, 6)) || [];
      const body = det.lang === "ar"
        ? `نتائج البحث في المنصة عن <strong>${safe(q)}</strong>:`
        : `Search results for <strong>${safe(q)}</strong> in the hub:`;
      return { kind: "search", title: "Search", body, sources: knowledgeMatches, meta: { query: q } };
    },

    /* ─── recommend ─── */
    recommend(input) {
      const q = (input.topic || "").trim();
      const det = (window.NovaCore && NovaCore.Lang && NovaCore.Lang.detect(q || "study")) || { lang: "en", rtl: false };
      const sec = q ? findSection(q) : null;
      let pool = STAGE.resources.filter(r => r.status === "available");
      if (sec) pool = pool.filter(r => r.section === sec.id);
      const allKnowledge = STAGE.resources.length;
      const Pinned = (typeof window !== "undefined" && window.PINNED_IDS) || [];
      const rank = (r) =>
        (Pinned.includes(r.id) ? 4 : 0) +
        (r.featured ? 2 : 0) +
        (r.type === "quiz" ? 2 : 0) +
        (r.type === "pdf" ? 1 : 0) +
        Math.max(0, (window.NovaCore && NovaCore.Feedback && NovaCore.Feedback.score(r.id)) || 0);
      pool = pool.slice().sort((a, b) => rank(b) - rank(a));
      const picks = pool.slice(0, 5);
      const body = det.lang === "ar"
        ? `مجموعة مذاكرة ذكية${sec ? " في <strong>" + safe(sec.label) + "</strong>" : ""} — الأعلى مردوداً للامتحان أولاً:`
        : `Smart study set${sec ? " for <strong>" + safe(sec.label) + "</strong>" : ""} — high-yield & exam-ready first:`;
      return {
        kind: "recommend",
        title: "Recommend",
        body,
        cards: picks,
        chips: STAGE.sections.filter(s => !["home", "search", "about"].includes(s.id)).slice(0, 6).map(s => ({ label: `${s.icon} ${s.label}`, act: "nav:" + s.id })),
        meta: { section: sec && sec.id, picks: picks.map(p => p.id), pool: allKnowledge }
      };
    },

    /* ─── compare ─── */
    compare(input) {
      const a = (input.a || "").trim();
      const b = (input.b || "").trim();
      const known = [a, b].filter(Boolean).join(" vs ");
      const det = (window.NovaCore && NovaCore.Lang && NovaCore.Lang.detect(known || "compare")) || { lang: "en", rtl: false };
      const sw = encodeURIComponent(JSON.stringify({ a, b }));
      const body = det.lang === "ar"
        ? `قارن بين <strong>${safe(a)}</strong> و <strong>${safe(b)}</strong> في نقاط واضحة (تعريف / خصائص / استخدام / عيوب).`
        : `Comparing <strong>${safe(a)}</strong> vs <strong>${safe(b)}</strong> across definition / properties / usage / limitations.`;
      return { kind: "compare", title: "Compare", body, meta: { a, b, payload: sw } };
    },

    /* ─── translate ─── */
    translate(input) {
      const text = (input.text || input.topic || "").trim();
      const target = (input.target || "ar").toLowerCase();
      const det = (window.NovaCore && NovaCore.Lang && NovaCore.Lang.detect(text)) || { lang: "en", rtl: false };
      const body = det.lang === "ar"
        ? `سيتم الترجمة/التحويل لـ <strong>${target === "ar" ? "العربية" : "الإنجليزية"}</strong> مع الحفاظ على المصطلحات العلمية.`
        : `Translation to <strong>${target === "ar" ? "Arabic" : "English"}</strong> will preserve dental terminology.`;
      return { kind: "translate", title: "Translate", body, meta: { text, target, fromLang: det.lang } };
    },

    /* ─── guide ─── */
    guide(input) {
      const q = (input.topic || input.section || input.query || "").trim();
      const sec = findSection(q);
      const det = (window.NovaCore && NovaCore.Lang && NovaCore.Lang.detect(q)) || { lang: "en", rtl: false };
      const body = sec
        ? (det.lang === "ar" ? `روّحك على <strong>${safe(sec.label)}</strong>.` : `Taking you to <strong>${safe(sec.label)}</strong>.`)
        : (det.lang === "ar" ? `ما لقيتش قسم مطابق بـ«${safe(q)}». جرّب كلمة أعم.`
                              : `No section matched “${safe(q)}”. Try a broader keyword.`);
      const out = { kind: "guide", title: "Guide", body };
      if (sec) {
        out.action = { kind: "nav", section: sec.id };
        out.chips = [{ label: `${sec.icon} ${sec.label}`, act: "nav:" + sec.id }];
      } else {
        out.chips = STAGE.sections.slice(0, 7).map(s => ({ label: `${s.icon} ${s.label}`, act: "nav:" + s.id }));
      }
      return out;
    },

    /* ─── openResource ─── */
    openResource(input) {
      const q = (input.query || input.topic || "").trim();
      const r = findResource(q);
      const det = (window.NovaCore && NovaCore.Lang && NovaCore.Lang.detect(q)) || { lang: "en", rtl: false };
      const body = r
        ? (det.lang === "ar" ? `بفتح <strong>${safe(r.title)}</strong>.` : `Opening <strong>${safe(r.title)}</strong>.`)
        : (det.lang === "ar" ? `ما لقيتش «${safe(q)}». ممكن تكون كتبتها غلط.` : `Couldn't find “${safe(q)}”. Double-check the spelling.`);
      const out = { kind: "openResource", title: "Open", body, cards: r ? [r] : [] };
      if (r) out.action = { kind: "open", id: r.id };
      return out;
    },

    /* ─── web (approved external sources only) ─── */
    web(input) {
      const q = (input.query || input.topic || "").trim();
      const det = (window.NovaCore && NovaCore.Lang && NovaCore.Lang.detect(q)) || { lang: "en", rtl: false };
      const list = (window.NovaCore && window.NovaCore.Sources && window.NovaCore.Sources.ready) ? window.NovaCore.Sources.pickFor(q, 3) : [];
      const picks = list.map(s => ({ title: s.label, url: s.url, snippet: s.note || "", host: s.host }));
      const body = det.lang === "ar"
        ? `الأماكن المعتمدة اللي أقدر أبحث فيها عن <strong>${safe(q)}</strong>:`
        : `Approved sources I'll search for <strong>${safe(q)}</strong>:`;
      return { kind: "web", title: "Web", body, sources: picks, meta: { query: q, allowedCount: list.length } };
    },

    /* ─── refine ─── */
    refine(input, ctx) {
      const previous = ctx && ctx.previous || [];
      const filter = (input.filter || input.topic || "").trim();
      const det = (window.NovaCore && NovaCore.Lang && NovaCore.Lang.detect(filter)) || { lang: "en", rtl: false };
      const refined = previous.filter(card => {
        if (!filter) return true;
        const blob = [card.title, card.category, card.section, card.description, (card.tags || []).join(" ")].join(" ").toLowerCase();
        return blob.includes(filter.toLowerCase());
      });
      const body = det.lang === "ar"
        ? `نتائج مصفّاة بكلمة «${safe(filter)}»:`
        : `Refined by “${safe(filter)}”: ${refined.length} match.`;
      return { kind: "refine", title: "Refine", body, cards: refined.slice(0, 6), meta: { filter, prevCount: previous.length } };
    }
  };

  ToolRegistry = Tools;

  /* ───────── register & dispatch ───────── */
  function dispatch(name, input, ctx) {
    if (!name || !Tools[name]) return null;
    try { return Tools[name](input || {}, ctx || {}); } catch (e) { return null; }
  }

  window.NovaTools = {
    version: "2.0-phase2",
    Tools,
    registry: ToolRegistry,
    dispatch,
    registerContext,
    findResource,
    findSection
  };
})();
