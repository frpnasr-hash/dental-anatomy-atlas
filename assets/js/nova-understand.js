/* ═══════════════════════════════════════════════════════════════
   DENTOVERSE — NOVA AI · DEEP UNDERSTANDING MODULE (Phase 4)
   ───────────────────────────────────────────────────────────────
   Extracts a rich "understanding envelope" from every user message
   BEFORE it reaches the LLM (or the local fallback).

   Why this module exists
     Nova's Phase-2 nova-core.js already detects the primary intent
     (explain / summarize / locate / compare / …). Deep Understanding
     goes further: it teases out the *hidden* structure of a request
     so the model no longer has to guess:

       • primary intent + secondary intents
       • language, dialect, mix, RTL flag, register (formal/casual)
       • depth requested (brief | normal | deep | exam-ready)
       • output format hints (list, table, steps, code, definition,
         paragraph, comparison, plan)
       • tone requested (professional, friendly, academic, exam)
       • must-include topics / entities (dental terms & bilingual)
       • must-exclude / avoid keywords
       • constraints (time limit, page limit, word count, deadline)
       • quoted phrases the user wants preserved verbatim
       • follow-up flag (message is a short refinement of previous)
       • image-request flag (delegated to NovaImage.isImageRequest)
       • ambiguity score + a bilingual clarify question if too vague
       • confidence score

   The envelope is exposed on window.NovaUnderstand.analyze(text)
   and is attached to every outbound /api/nova POST via a small
   fetch shim so the server-side system prompt can adapt. The shim
   only touches /api/nova requests and only *adds* fields; it never
   removes anything from the existing payload — so the current
   Phase-1/2/3 backend keeps working unchanged.

   Designed & Produced by Abdel Rahman Teba © ®
   ═══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";
  if (typeof window === "undefined") return;

  /* ───────── normalisation (mirror nova-core) ───────── */
  function norm(s) {
    return String(s || "").toLowerCase()
      .replace(/[’']/g, "").replace(/[^a-z0-9\u0600-\u06FF\s]/g, " ")
      .replace(/\s+/g, " ").trim();
  }
  function normArabic(s) {
    return norm(s)
      .replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
      .replace(/ة/g, "ه").replace(/[ًٌٍَُِّْـ]/g, "");
  }
  function tokens(s) { return normArabic(s).split(" ").filter(w => w.length > 1); }

  /* ───────── language + dialect ───────── */
  const AR_RX = /[\u0600-\u06FF]/g;
  const EG_RX = /(ازاي|إزاي|عايز|عاوز|عاوزة|محتاج|مش |مفيش|كده|كدا|دلوقتي|فين|منين|ليه|اومال|يعني|خلاص|بتاع|بتاعة|بتاعه|عشان|علشان| قوي|اهو|ياعم|بص |جامد|تمام|ازيك|إزيك|عامل ايه|النهارده|النهاردة|طب |طيب |حاجة|حاجه|ايه ده|إيه ده|دلوقت|تعالا|يلا|وحشني|هعمل|هعمله|هاعمل)/;
  function detectLang(text) {
    const s = String(text || "");
    const ar = (s.match(AR_RX) || []).length;
    const en = (s.match(/[a-zA-Z]/g) || []).length;
    const isAr = ar > 0 && ar >= en * 0.5;
    if (!isAr) return { lang: "en", dialect: "en", rtl: false, mixed: en > 0 && ar > 0 };
    const dialect = EG_RX.test(s) ? "egy" : "msa";
    const mixed = en >= Math.max(3, ar * 0.15);
    return { lang: "ar", dialect, rtl: true, mixed };
  }

  /* ───────── depth signal ───────── */
  const DEPTH_RX = {
    brief:    /\b(short|briefly|tl;?dr|one line|quick|in a sentence)\b|باختصار|بإختصار|في سطر|في جمله|في جملة|قصير/i,
    deep:     /\b(deep|thorough|comprehensive|in depth|elaborate|detailed|explain fully|full explanation|deep dive)\b|بالتفصيل|شرح مطول|بشكل عميق|شرح كامل|بعمق|تفصيلي|بالتفاصيل/i,
    exam:     /\b(exam[- ]?ready|for the exam|revision|revise|final|high[- ]yield|mcq[- ]style|past ?papers?)\b|امتحان|مراجعه|مراجعة|استذكار|نهائي|امتحانات|هامش الامتحان/i,
    stepwise: /\b(step[- ]?by[- ]?step|steps|walk me through|procedure|process|how to)\b|خطوه بخطوه|خطوة بخطوة|بالخطوات|بالتسلسل|كيف|إزاي|ازاي/i
  };
  function detectDepth(text) {
    if (DEPTH_RX.stepwise.test(text)) return "stepwise";
    if (DEPTH_RX.deep.test(text))     return "deep";
    if (DEPTH_RX.exam.test(text))     return "exam";
    if (DEPTH_RX.brief.test(text))    return "brief";
    // Heuristic: very long questions → deep; very short → brief.
    const n = String(text || "").trim().length;
    if (n > 260) return "deep";
    if (n < 24)  return "brief";
    return "normal";
  }

  /* ───────── format hints ───────── */
  const FORMAT_RX = {
    list:       /\b(list|bullet|bullets|enumerate|points|as bullets|in a list)\b|قايمه|قائمه|قائمة|قايمة|في نقاط|كنقاط|علي شكل نقاط/i,
    table:      /\b(table|tabular|columns?|matrix|side[- ]?by[- ]?side)\b|جدول|في جدول|جدوليًا/i,
    steps:      /\b(steps|step[- ]?by[- ]?step|numbered|1\.|first,? then)\b|خطوات|بالخطوات|خطوه خطوه|خطوة خطوة/i,
    definition: /\b(define|definition|what does .* mean|meaning of|what is|what are)\b|عرف|عرّف|تعريف|ايه معنى|إيه معنى|يعني ايه|يعني إيه|ما معنى/i,
    comparison: /\b(compare|comparison|vs\.?|versus|difference between|contrast|pros? and cons?)\b|قارن|مقارنه|مقارنة|الفرق بين|فرق بين/i,
    plan:       /\b(plan|study plan|schedule|road[- ]?map|timeline)\b|خطه|خطة|جدول مذاكره|جدول مذاكرة|خارطه طريق|خارطة طريق/i,
    code:       /\b(code|snippet|function|program|javascript|python|html|css|script)\b/i,
    example:    /\b(example|examples|for example|e\.g\.|give me an example)\b|مثال|امثله|أمثلة|علي سبيل المثال|علي سبيل|مثلا|مثلاً/i
  };
  function detectFormats(text) {
    return Object.entries(FORMAT_RX)
      .filter(([, rx]) => rx.test(text))
      .map(([k]) => k);
  }

  /* ───────── tone / register ───────── */
  const TONE_RX = {
    formal:    /\b(formal|academic|professional|technical|scholarly)\b|رسمي|اكاديمي|أكاديمي|علمي|احترافي/i,
    friendly:  /\b(friendly|casual|simple|beginner|easy|kid|child|for a child|like i'?m 5)\b|بسيط|بسّط|زي ما بتكلم صاحبك|زي طفل|للمبتدئين|سهل|ودود/i,
    exam:      /\b(exam|revision|mcq|question bank|final)\b|امتحان|مراجعه|مراجعة|امتحانات/i,
    clinical:  /\b(clinical|patient|case|treatment plan|diagnos)\b|اكلينيكي|إكلينيكي|سريري|علاج|مريض|حاله|حالة/i
  };
  function detectTone(text) {
    for (const key of Object.keys(TONE_RX)) if (TONE_RX[key].test(text)) return key;
    return "auto";
  }

  /* ───────── must-include / must-exclude phrases ───────── */
  const QUOTED_RX = /(["“„«‘'‹])([\s\S]{2,140}?)\1|[«‹]([\s\S]{2,140}?)[»›]/g;
  function extractQuoted(text) {
    const out = [];
    let m;
    QUOTED_RX.lastIndex = 0;
    while ((m = QUOTED_RX.exec(text)) && out.length < 8) {
      const phrase = (m[2] || m[3] || "").trim();
      if (phrase && phrase.length >= 2) out.push(phrase);
    }
    return out;
  }

  const INCLUDE_RX = /(?:include|make sure to include|must include|cover|mention|talk about|focus on|highlight)\s+([^.,;\n]{3,120})/gi;
  const INCLUDE_AR = /(?:اذكر|اشمل|غطي|ركّز على|ركز علي|تناول|تكلم عن|اشرح موضوع)\s+([^.,;\n]{3,120})/g;
  const EXCLUDE_RX = /(?:don'?t|do not|without|avoid|no|skip|exclude|leave out)\s+([^.,;\n]{2,80})/gi;
  const EXCLUDE_AR = /(?:من غير|بلا|بدون|متذكرش|متكلمش عن|تجنب|استبعد|مش عاوز|مش عايز|مش محتاج)\s+([^.,;\n]{2,80})/g;

  function extractPatternList(text, ...rxs) {
    const out = [];
    rxs.forEach(rx => {
      const r = new RegExp(rx.source, rx.flags);
      let m;
      while ((m = r.exec(text)) && out.length < 8) {
        const phrase = String(m[1] || "").trim().replace(/[.,;:!?،؛]+$/g, "").trim();
        if (phrase && phrase.length >= 2 && !out.includes(phrase)) out.push(phrase);
      }
    });
    return out;
  }

  /* ───────── constraints (word count, pages, minutes, deadline) ───────── */
  const CONSTRAINT_RX = [
    { key: "wordLimit",  rx: /\b(?:in|within|max|maximum|no more than|less than)\s*(\d{1,4})\s*(?:words?|word|كلم[هة])\b/i },
    { key: "wordLimit",  rx: /(\d{1,4})\s*(?:words?|كلم[هة])/i },
    { key: "pageLimit",  rx: /\b(\d{1,3})\s*(?:pages?|صفحه|صفحة|صفحات)\b/i },
    { key: "sentences",  rx: /\b(?:in\s*)?(\d{1,2})\s*(?:sentences?|جمله|جملة|جمل)\b/i },
    { key: "bullets",    rx: /\b(\d{1,2})\s*(?:bullets?|points?|نقاط|نقطه|نقطة)\b/i },
    { key: "minutes",    rx: /\b(?:in|within)\s*(\d{1,3})\s*(?:minutes?|min|دقايق|دقيقه|دقيقة)\b/i }
  ];
  function extractConstraints(text) {
    const out = {};
    CONSTRAINT_RX.forEach(({ key, rx }) => {
      if (out[key] != null) return;
      const m = text.match(rx);
      if (m && m[1]) out[key] = parseInt(m[1], 10);
    });
    return out;
  }

  /* ───────── follow-up / continuation ───────── */
  const FOLLOWUP_RX = /^(?:and|also|then|more|continue|go on|why|how|what about|expand|elaborate|and in arabic|in english|و |وماذا|وما |كمان|اكمل|أكمل|كمّل|واستمر|طب|طيب|ايوه|أيوه|ازيد|أزيد|بالانجليزي|بالانجليزى|بالعربي|ترجم)\b/i;
  function isFollowUp(text) { return FOLLOWUP_RX.test(String(text || "").trim()); }

  /* ───────── image request delegation ───────── */
  function isImageRequest(text) {
    try {
      if (window.NovaImage && typeof window.NovaImage.isImageRequest === "function") {
        return !!window.NovaImage.isImageRequest(text);
      }
    } catch (e) {}
    // Fallback surface-level cues.
    return /\b(image|picture|photo|render|illustration|poster|banner|infographic|diagram|logo|design|create an image|generate an image)\b/i.test(text)
        || /(صمم|اعمل|ارسم|صور|صورة|بوستر|بانر|انفوجرافيك|رسم|لوجو|بروشور)/.test(text);
  }

  /* ───────── ambiguity + clarify question ───────── */
  const VAGUE_WORDS = /^\s*(help|hi|hey|hello|nova|what|how|why|ok|test|explain|شرح|ساعدني|ساعديني|هاي|مرحبا|السلام|ايه)\s*[.!?]?\s*$/i;
  function ambiguity(text, primaryIntent) {
    const t = String(text || "").trim();
    if (!t) return 1;
    if (VAGUE_WORDS.test(t)) return 0.9;
    let score = 0;
    if (t.length < 12)                score += 0.5;
    if (tokens(t).length < 3)         score += 0.3;
    if (primaryIntent === "general" && tokens(t).length < 4) score += 0.2;
    if (/^(ok|k|ah|aha|yes|no|yep|هو كده|تمام|خلاص)$/i.test(t)) score += 0.5;
    return Math.max(0, Math.min(1, score));
  }
  function clarifyQuestion(text, envelope) {
    const det = envelope.lang;
    if (envelope.ambiguity < 0.5) return null;
    if (det.lang === "ar") {
      if (det.dialect === "egy") return "ممكن توضّحلي أكتر؟ عايز شرح، ولا مذاكرة سريعة، ولا مقارنة، ولا بتدور على ملف معيّن؟";
      return "هل يمكنك توضيح طلبك أكثر؟ هل تريد شرحًا مفصّلًا، مراجعة سريعة، مقارنة، أم البحث عن ملف معيّن؟";
    }
    return "Could you tell me a bit more? Do you want a deep explanation, a quick recap, a comparison, or should I locate a specific resource?";
  }

  /* ───────── entity hooks (dental terms bridge) ───────── */
  // Reuses nova-core's expansion glossary if present, otherwise stays quiet.
  function extractEntities(text) {
    let terms = [];
    try {
      if (window.NovaCore && window.NovaCore.Concepts && typeof window.NovaCore.Concepts.expandTerms === "function") {
        terms = window.NovaCore.Concepts.expandTerms(text).filter(w => w.length > 2);
      }
    } catch (e) {}
    // De-duplicate while preserving order.
    const seen = new Set(); const out = [];
    for (const t of terms) { if (!seen.has(t)) { seen.add(t); out.push(t); } }
    return out.slice(0, 12);
  }

  /* ───────── primary intent (delegates to NovaCore.Intent when available) ───────── */
  function primaryIntent(text) {
    try {
      if (window.NovaCore && window.NovaCore.Intent && typeof window.NovaCore.Intent.detect === "function"
          && window.NovaCore.Concepts && typeof window.NovaCore.Concepts.analyze === "function") {
        const c = window.NovaCore.Concepts.analyze(text);
        return window.NovaCore.Intent.detect(text, c.concepts, c.qWords) || "general";
      }
    } catch (e) {}
    // Extremely small local fallback.
    if (/^\s*(hi|hey|hello|salam|السلام|اهلا|هاي)/i.test(text)) return "greet";
    if (/\b(explain|what is|define|شرح|عرف)\b/i.test(text)) return "explain";
    if (/\b(compare|vs|قارن)\b/i.test(text)) return "compare";
    if (/\b(summari[sz]e|لخص)\b/i.test(text)) return "summarize";
    if (/\b(open|where|find|فين|افتح)\b/i.test(text)) return "locate";
    if (/\b(translate|ترجم)\b/i.test(text)) return "translate";
    return "general";
  }

  /* ───────── analyze() — main entry ───────── */
  function analyze(rawText) {
    const text = String(rawText == null ? "" : rawText);
    const lang = detectLang(text);
    const intent = primaryIntent(text);
    const depth  = detectDepth(text);
    const formats = detectFormats(text);
    const tone   = detectTone(text);

    const mustInclude = [
      ...extractPatternList(text, INCLUDE_RX, INCLUDE_AR),
      ...extractQuoted(text)
    ];
    // De-duplicate lightly.
    const mustIncludeSeen = new Set();
    const mustIncludeUnique = mustInclude.filter(x => {
      const k = normArabic(x);
      if (mustIncludeSeen.has(k)) return false;
      mustIncludeSeen.add(k);
      return true;
    });

    const mustExclude = extractPatternList(text, EXCLUDE_RX, EXCLUDE_AR);
    const constraints = extractConstraints(text);
    const followUp    = isFollowUp(text);
    const imageReq    = isImageRequest(text);
    const entities    = extractEntities(text);

    const envelope = {
      text: text.slice(0, 2000),
      lang,
      intent,
      depth,
      formats,
      tone,
      mustInclude: mustIncludeUnique.slice(0, 8),
      mustExclude: mustExclude.slice(0, 8),
      constraints,
      followUp,
      imageRequest: imageReq,
      entities
    };
    envelope.ambiguity  = ambiguity(text, intent);
    envelope.confidence = +(1 - envelope.ambiguity * 0.7).toFixed(2);
    envelope.clarify    = clarifyQuestion(text, envelope);
    return envelope;
  }

  /* ───────── compact directives the server prompt can use verbatim ───────── */
  function toPromptDirectives(env) {
    if (!env) return "";
    const lines = [];
    lines.push(`Detected intent: ${env.intent}${env.followUp ? " (follow-up)" : ""}.`);
    lines.push(`Language: ${env.lang.lang}${env.lang.lang === "ar" ? " (" + env.lang.dialect + ")" : ""}${env.lang.mixed ? ", mixed with English" : ""}.`);
    lines.push(`Depth requested: ${env.depth}. Tone: ${env.tone}.`);
    if (env.formats.length)     lines.push(`Preferred format hints: ${env.formats.join(", ")}.`);
    if (env.mustInclude.length) lines.push(`Must include / focus on: ${env.mustInclude.join(" · ")}.`);
    if (env.mustExclude.length) lines.push(`Must avoid: ${env.mustExclude.join(" · ")}.`);
    if (Object.keys(env.constraints).length) {
      lines.push("Constraints: " + Object.entries(env.constraints).map(([k, v]) => `${k}=${v}`).join(", ") + ".");
    }
    if (env.entities.length)    lines.push(`Likely key entities: ${env.entities.slice(0, 8).join(", ")}.`);
    if (env.ambiguity >= 0.55 && env.clarify) {
      lines.push(`The request is somewhat ambiguous (${env.ambiguity.toFixed(2)}). If you can't infer confidently, ask this clarify question first: "${env.clarify}"`);
    }
    return lines.join("\n");
  }

  /* ───────── /api/nova fetch shim — additive only ─────────
     Adds `understanding` + `learn` fields to the outgoing body so
     the backend can use them. Never removes / renames any existing
     field. Silently no-ops on non-Nova requests. */
  function installFetchShim() {
    if (window.__novaUnderstandFetchPatched) return;
    if (!window.fetch) return;
    const orig = window.fetch.bind(window);
    window.fetch = function patchedFetch(input, init) {
      try {
        const url = typeof input === "string" ? input : (input && input.url) || "";
        const method = (init && init.method) || (input && input.method) || "GET";
        if (/\/api\/nova(?:$|\?)/.test(url) && method === "POST" && init && typeof init.body === "string") {
          const body = JSON.parse(init.body);
          if (body && typeof body === "object") {
            // Find the latest user message text.
            let lastUser = "";
            if (Array.isArray(body.messages)) {
              for (let i = body.messages.length - 1; i >= 0; i--) {
                const m = body.messages[i];
                if (m && m.role === "user" && typeof m.content === "string") { lastUser = m.content; break; }
              }
            }
            const env = analyze(lastUser);
            if (!body.understanding) body.understanding = env;
            // Also attach learned-material context (top-4) if NovaLearn has any.
            try {
              if (window.NovaLearn && typeof window.NovaLearn.contextFor === "function") {
                const learned = window.NovaLearn.contextFor(lastUser, 4);
                if (learned && learned.length) {
                  body.learned = learned;
                }
              }
            } catch (e) {}
            init.body = JSON.stringify(body);
          }
        }
      } catch (e) { /* fall through — never break outgoing fetches */ }
      return orig(input, init);
    };
    window.__novaUnderstandFetchPatched = true;
  }

  /* ───────── boot ───────── */
  function boot() { try { installFetchShim(); } catch (e) {} }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  /* ───────── public API ───────── */
  window.NovaUnderstand = {
    version: "1.0-phase4",
    analyze,
    toPromptDirectives,
    detectLang,
    detectDepth,
    detectFormats,
    detectTone,
    isFollowUp,
    isImageRequest,
    extractEntities
  };
})();
