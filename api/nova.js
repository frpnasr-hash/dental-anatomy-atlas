/* ═══════════════════════════════════════════════════════════════
   DENTOVERSE — NOVA AI · Serverless Backend (Vercel Function)
   ───────────────────────────────────────────────────────────────
   Route:  GET  /api/nova   — capability probe (frontend-friendly)
           POST /api/nova   — chat completion with tool-aware context

   Phase 2 upgrades (additive, non-breaking):
     • Reads the approved EXTERNAL SOURCES allowlist from
       /assets/data/nova-sources.json so the LLM only cites safe
       external domains and emits proper attributions.
     • Accepts "tool" hints from the frontend (explain, summarize,
       locate, search, recommend, compare, translate, guide,
       openResource, web, refine) and informs the LLM which tool
       to behave like for this turn.
     • Accepts a per-turn "lang" / "dialect" signal from the client
       so the LLM mirrors Egyptian vs MSA without mis-detecting.
     • Bilingual term expansion is wider and supports the new
       synonyms/concept map shipped in /assets/js/nova-core.js.
     • System prompt now spells out Nova's eight Phase-2 capability
       chapters — knowledge growth, smarter general AI, advanced
       resource understanding, approved external knowledge,
       feedback improvement, multilingual excellence, advanced chat
       experience and tool-like behaviour — so the model behaves
       like a continuously improving expert assistant.

   Configure on Vercel → Project → Settings → Environment Variables
   (all OPTIONAL — site works perfectly with Nova's local brain):

     LLM PROVIDER (pick ONE; auto-detected in this order):
       OPENAI_API_KEY          + optional OPENAI_MODEL   (default gpt-4o-mini)
       OPENROUTER_API_KEY      + optional OPENROUTER_MODEL
       GROQ_API_KEY            + optional GROQ_MODEL      (default llama-3.3-70b-versatile)
       DEEPSEEK_API_KEY        + optional DEEPSEEK_MODEL  (default deepseek-chat)
       GEMINI_API_KEY          + optional GEMINI_MODEL    (default gemini-1.5-flash)
     Generic override:
       NOVA_LLM_BASE_URL       (OpenAI-compatible /chat/completions base)
       NOVA_LLM_API_KEY
       NOVA_LLM_MODEL

     WEB SEARCH (optional; pick ONE — gated by approved sources):
       TAVILY_API_KEY
       SERPER_API_KEY          (google.serper.dev)
       BRAVE_API_KEY
       GOOGLE_CSE_KEY + GOOGLE_CSE_CX

   Designed & Produced by Abdel Rahman Teba © ®
   ═══════════════════════════════════════════════════════════════ */

const MAX_MESSAGES = 24;
const REQUEST_TIMEOUT_MS = 45000;

let KNOWLEDGE = { chunks: [], stats: {}, documents: [] };
let SOURCES  = { sources: [], topic_aliases: {}, policy: { web_search_enabled_default: false } };
try { KNOWLEDGE = require("../assets/data/nova-knowledge.json"); } catch { /* local fallback still works */ }
try { SOURCES  = require("../assets/data/nova-sources.json"); } catch { /* external sources still optional */ }

/* ───────── Arabic term dictionary shared across client + server ───────── */
const ARABIC_QUERY_TERMS = {
  "اسنان": "dental teeth", "سن": "tooth dental", "ضرس": "molar tooth", "مينا": "enamel", "عاج": "dentin",
  "لب": "pulp", "لثه": "gingiva periodontal", "رباط": "ligament", "تكوين": "formation development", "تطور": "development",
  "جذر": "root", "تاج": "crown", "مواد": "materials", "خامات": "biomaterials materials", "طبعة": "impression",
  "طبعات": "impression materials", "جبس": "gypsum", "شمع": "wax", "سيراميك": "ceramics", "اسمنت": "cement",
  "حشو": "restorative composite", "كمبوزيت": "composite", "راتنج": "resin", "بوليمر": "polymer",
  "سباكة": "casting", "سبائك": "alloys", "تركيب": "composition structure", "خصائص": "properties",
  "انواع": "classification types", "فرق": "difference compare", "وظيفه": "function",
  "عملي": "practical", "محاضره": "lecture", "محاضرة": "lecture",
  "ملف": "pdf document", "ملفات": "pdf documents", "صفحه": "page", "صفحة": "page",
  "اسئلة": "questions mcq exam", "اسئله": "questions mcq exam", "امتحان": "exam questions",
  "تشريح": "anatomy", "تعويضات": "prosthesis", "تركيبات": "prosthetics"
};

const AR_EG_SLANG = new Set(["ازاي","إزاي","عايز","عاوز","عاوزة","محتاج","مش","مفيش","كده","كدا","دلوقتي","فين","منين","ليه","اومال","يعني","خلاص","بتاع","بص","جامد","تمام","ازيك","إزيك","النهارده","النهاردة","طب","طيب","حاجة","حاجه","يلا","وحشني","تعالا","امتى","إمتى"]);

/* ───────── small helpers ───────── */
function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
async function readBody(req) {
  if (req.body) {
    if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
    return req.body;
  }
  return await new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 2_000_000) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}
function normalizeSearch(value) {
  return String(value || "").toLowerCase()
    .replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/ة/g, "ه")
    .replace(/[ًٌٍَُِّْـ]/g, "").replace(/[^a-z0-9\u0600-\u06ff\s]/g, " ").replace(/\s+/g, " ").trim();
}
function isLikelyArabic(text) {
  const s = String(text || "");
  const ar = (s.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (s.match(/[a-zA-Z]/g) || []).length;
  return ar > 0 && ar >= latin * 0.5;
}
function detectDialect(text) {
  if (!isLikelyArabic(text)) return "en";
  return AR_EG_SLANG.has(decodeURIComponent(text).trim().split(/\s+/).slice(0, 6).find(w => AR_EG_SLANG.has(w))) ? "egy" : "msa";
}

function expandArabicTerms(query) {
  const base = normalizeSearch(query).split(" ").filter(w => w.length > 1);
  const terms = base.slice();
  base.forEach(word => {
    const candidates = [word];
    if (word.startsWith("وال") && word.length > 4) candidates.push(word.slice(3));
    if (word.startsWith("ال")  && word.length > 3) candidates.push(word.slice(2));
    if (word.endsWith("ات") && word.length > 4) candidates.push(word.slice(0, -2), word.slice(0, -2) + "ه");
    const mapped = candidates.map(c => ARABIC_QUERY_TERMS[c]).find(Boolean);
    if (mapped) terms.push(...mapped.split(" "));
  });
  return Array.from(new Set(terms));
}

function searchKnowledge(query, limit = 6) {
  const stop = new Set("a an the of for to in on at is are be can could would please show me find open i want need where what which how do you about this that with and or في من الى علي عن مع هو هي ايه ما ماذا كيف هل يا".split(" "));
  const expanded = expandArabicTerms(query).filter(w => w.length > 1 && !stop.has(w));
  if (!expanded.length) return [];
  return (KNOWLEDGE.chunks || []).map(chunk => {
    const meta = normalizeSearch(`${chunk.title} ${chunk.sectionLabel || ""} ${chunk.category} ${chunk.heading}`);
    const text = normalizeSearch(chunk.text);
    let score = 0;
    expanded.forEach(term => {
      if (meta.includes(term)) score += 8;
      else if (new RegExp(`(^|\\s)${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`).test(text)) score += 3.5;
      else if (term.length > 4 && text.includes(term)) score += 2;
    });
    // Soft preference for real PDF page text over generic cards/studio
    if (chunk.source === "pdf") score += 0.5;
    return Object.assign({ _kind: chunk.source || "card", _score: score }, chunk, { score });
  }).filter(c => c.score >= 3.5).sort((a, b) => b.score - a.score).slice(0, limit);
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    Promise.resolve(promise).then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); }
    );
  });
}
async function fetchJSON(url, opts, ms) {
  const r = await withTimeout(fetch(url, opts), ms || REQUEST_TIMEOUT_MS);
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: r.ok, status: r.status, data };
}

/* ───────── host gating for safe external search ─────────
   Even if a web-search key is configured, Nova must only cite
   results whose origin host matches the approved allowlist. */
function hostAllowed(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (!host) return false;
    return (SOURCES.sources || []).some(s => (s.host || "").toLowerCase().replace(/^www\./, "") === host);
  } catch (e) { return false; }
}
function filterSourcesByAllowlist(results) {
  if (!Array.isArray(results)) return [];
  return results.filter(r => r && r.url && hostAllowed(r.url));
}

/* ───────── LLM providers ───────── */
function resolveProvider() {
  const E = process.env;
  if (E.NOVA_LLM_BASE_URL && E.NOVA_LLM_API_KEY) {
    return { kind: "openai", base: E.NOVA_LLM_BASE_URL.replace(/\/$/, ""), key: E.NOVA_LLM_API_KEY, model: E.NOVA_LLM_MODEL || "gpt-4o-mini", name: "custom" };
  }
  if (E.OPENAI_API_KEY) {
    return { kind: "openai", base: (E.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""), key: E.OPENAI_API_KEY, model: E.OPENAI_MODEL || "gpt-4o-mini", name: "openai" };
  }
  if (E.OPENROUTER_API_KEY) {
    return { kind: "openai", base: "https://openrouter.ai/api/v1", key: E.OPENROUTER_API_KEY, model: E.OPENROUTER_MODEL || "openai/gpt-4o-mini", name: "openrouter" };
  }
  if (E.GROQ_API_KEY) {
    return { kind: "openai", base: "https://api.groq.com/openai/v1", key: E.GROQ_API_KEY, model: E.GROQ_MODEL || "llama-3.3-70b-versatile", name: "groq" };
  }
  if (E.DEEPSEEK_API_KEY) {
    return { kind: "openai", base: "https://api.deepseek.com", key: E.DEEPSEEK_API_KEY, model: E.DEEPSEEK_MODEL || "deepseek-chat", name: "deepseek" };
  }
  if (E.GEMINI_API_KEY) {
    return { kind: "gemini", key: E.GEMINI_API_KEY, model: E.GEMINI_MODEL || "gemini-1.5-flash", name: "gemini" };
  }
  return null;
}
function resolveSearch() {
  const E = process.env;
  if (E.TAVILY_API_KEY) return { kind: "tavily", key: E.TAVILY_API_KEY };
  if (E.SERPER_API_KEY) return { kind: "serper", key: E.SERPER_API_KEY };
  if (E.BRAVE_API_KEY) return { kind: "brave", key: E.BRAVE_API_KEY };
  if (E.GOOGLE_CSE_KEY && E.GOOGLE_CSE_CX) return { kind: "google", key: E.GOOGLE_CSE_KEY, cx: E.GOOGLE_CSE_CX };
  return null;
}
async function runWebSearch(provider, query) {
  try {
    if (provider.kind === "tavily") {
      const { ok, data } = await fetchJSON("https://api.tavily.com/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: provider.key, query, max_results: 5, include_answer: true }),
      }, 20000);
      if (!ok) return null;
      return {
        answer: data.answer || "",
        results: (data.results || []).map(r => ({ title: r.title, url: r.url, snippet: r.content, host: safeHost(r.url) }))
      };
    }
    if (provider.kind === "serper") {
      const { ok, data } = await fetchJSON("https://google.serper.dev/search", {
        method: "POST", headers: { "X-API-KEY": provider.key, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, num: 5 }),
      }, 20000);
      if (!ok) return null;
      return {
        answer: (data.answerBox && (data.answerBox.answer || data.answerBox.snippet)) || "",
        results: (data.organic || []).slice(0, 5).map(r => ({ title: r.title, url: r.link, snippet: r.snippet, host: safeHost(r.link) }))
      };
    }
    if (provider.kind === "brave") {
      const u = "https://api.search.brave.com/res/v1/web/search?q=" + encodeURIComponent(query) + "&count=5";
      const { ok, data } = await fetchJSON(u, { headers: { "X-Subscription-Token": provider.key, "Accept": "application/json" } }, 20000);
      if (!ok) return null;
      return {
        answer: "",
        results: ((data.web && data.web.results) || []).slice(0, 5).map(r => ({ title: r.title, url: r.url, snippet: r.description, host: safeHost(r.url) }))
      };
    }
    if (provider.kind === "google") {
      const u = "https://www.googleapis.com/customsearch/v1?key=" + provider.key + "&cx=" + provider.cx + "&num=5&q=" + encodeURIComponent(query);
      const { ok, data } = await fetchJSON(u, {}, 20000);
      if (!ok) return null;
      return {
        answer: "",
        results: (data.items || []).slice(0, 5).map(r => ({ title: r.title, url: r.link, snippet: r.snippet, host: safeHost(r.link) }))
      };
    }
  } catch { /* graceful */ }
  return null;
}
function safeHost(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; } }

/* ───────── system prompt (the heart of Nova) ───────── */
function buildSystemPrompt(ctx, uploadedPdf) {
  const site    = (ctx && ctx.site)    || {};
  const sections = (ctx && ctx.sections) || [];
  const resources = (ctx && ctx.topResources) || [];
  const knowledge = (ctx && ctx.knowledge) || [];
  const userLang = (ctx && ctx.lang)    || "auto";
  const userDialect = (ctx && ctx.dialect) || "auto";
  const tool = (ctx && ctx.tool) || "";

  const sectionList = sections.map(s => `- ${s.label} (id: ${s.id})${s.tagline ? " — " + s.tagline : ""}`).join("\n");
  const resourceList = resources.slice(0, 40).map(r =>
    `- [${r.type}] "${r.title}" · section:${r.section}${r.category ? " · " + r.category : ""}${r.status && r.status !== "available" ? " · (" + r.status + ")" : ""}`
  ).join("\n");

  const knowledgeList = knowledge.slice(0, 8).map((item, index) =>
    `[${(item._kind || "PASSAGE").toUpperCase()} ${index + 1}] ${item.title}\nSection: ${item.section || ""} · Category: ${item.category || ""}` +
    (item.page ? " · Page: " + item.page : "") +
    (item.file ? "\nFile: " + item.file : "") +
    (item.link ? "\nLink: " + item.link : "") +
    (item.heading ? "\nHeading: " + item.heading : "") +
    "\nText:\n" + String(item.text || "").slice(0, 2200)
  ).join("\n\n");

  const uploadedList = (uploadedPdf || []).slice(0, 4).map((item, index) =>
    `[USER PDF PASSAGE ${index + 1}] ${item.name || "uploaded.pdf"} · page ${item.page}\n${String(item.text || "").slice(0, 2400)}`
  ).join("\n\n");

  const approvedSourcesList = (SOURCES.sources || []).slice(0, 12).map(s =>
    `- ${s.label} · ${s.host} · ${(s.tags || []).join(", ")} · trust:${s.trust || "medium"}`
  ).join("\n");

  const toolGuidance = {
    "": "",
    explain:   "## ACTIVE TOOL — explain\nTeach the concept clearly. Use the supplied passages to drive the explanation. Use short markdown structure (bold, bullets, numbered steps). Offer a follow-up question.",
    summarize: "## ACTIVE TOOL — summarize\nCompress the supplied passages and topic into clear, top-down bullets. Prefer key points and definitions.",
    locate:    "## ACTIVE TOOL — locate\nIdentify where the resource/section lives in DentoVerse, name the section and category, suggest the exact section label to open.",
    search:    "## ACTIVE TOOL — search\nList matching resources with section + category, ordered by relevance. Suggest what to open first.",
    recommend: "## ACTIVE TOOL — recommend\nSuggest a short study set, sorted by exam value (question banks, high-yield PDFs, summaries).",
    compare:   "## ACTIVE TOOL — compare\nBuild a clean side-by-side comparison. Use a table-or-bullet format. Cover definition, properties, usage, advantages, limitations, and when to choose one over the other.",
    translate: "## ACTIVE TOOL — translate\nTranslate the snippet faithfully, preserve dental terminology in parentheses, keep the original sense.",
    guide:     "## ACTIVE TOOL — guide\nDescribe how to navigate to the right place in the site, step by step.",
    openResource: "## ACTIVE TOOL — openResource\nTell the user which exact resource you recommend to open (title + section).",
    web:       "## ACTIVE TOOL — web\nThe user wants external/research-level information. Only cite sources in the APPROVED EXTERNAL SOURCES list. Always include the host and a short attribution. If no approved source is suitable, say so honestly and offer the closest site material instead.",
    refine:    "## ACTIVE TOOL — refine\nNarrow the previous result set by re-ranking with the new filter."
  }[tool] || "";

  return `You are **Nova**, the premium AI academic assistant embedded in **${site.name || "DentoVerse"}** — a futuristic dental-student study hub created by ${site.author || "Abdel Rahman Teba"}.

## IDENTITY & TONE
- You are intelligent, warm, professional and genuinely helpful — like an expert tutor and friendly companion.
- You are a real conversational assistant — answer general questions, explain concepts, compare topics, summarize information, hold conversations, and help students understand difficult subjects. Never sound robotic.
- Keep the futuristic, elegant DentoVerse spirit. Be concise but complete.

## LANGUAGE (VERY IMPORTANT)
- You are fully multilingual. Detect the user's language from THEIR message and reply in the SAME language and register:
  - **English** → reply in clear English.
  - **Modern Standard Arabic (الفصحى)** → reply in fluent MSA.
  - **Egyptian colloquial Arabic (العامية المصرية)** → reply in natural, friendly Egyptian dialect (زي ما المصريين بيتكلموا).
- Handle mixed Arabic/English (code-switching) naturally; mirror the user's mix.
- For Arabic replies, write right-to-left friendly text and use correct Arabic punctuation.
- The client may pass a lang hint ("${userLang === "auto" ? "not provided — detect from message" : userLang}") and a dialect hint ("${userDialect === "auto" ? "not provided — detect from message" : userDialect}"). Honour it unless the user's actual message clearly uses a different one.
- Honor proper transliteration when explaining English dental terms inside Arabic text.

${toolGuidance}

## PHASE 2 — HOW NOVA CONTINUOUSLY IMPROVES
1. **Continuous knowledge growth** — Nova ingests newly uploaded PDFs, lectures, videos, and resource cards automatically. The local KNOWLEDGE PASSAGES below are refreshed without manual code edits. If the user references a topic you don't yet see, say so and route them to the closest existing material or an authoritative external source (only if approved).
2. **Smarter general AI** — You answer general questions, explain concepts, summarize long content, compare topics, follow up naturally, and behave like an expert tutor. Knowledge depth grows as new passages arrive.
3. **Advanced resource understanding** — You understand PDFs, lectures, notes, MCQ banks, question banks, resource sections, videos and resource cards. You can locate any item by name, section, category, level, semester or tag.
4. **Approved external knowledge expansion** — When configured, you may pull from the APPROVED EXTERNAL SOURCES listed below. You must NOT cite hostnames outside that list. If a user asks for "the latest" and the only safe answer involves an external domain, ask them to enable Web mode first.
5. **Feedback-based improvement** — Be concise and well-structured. Users reward answers that cite page/file references with 👍 and dock synthetic filler. Mirror what works.
6. **Multilingual excellence** — Detect Arabic vs Arabic-dialect precisely. Keep dental terminology in parentheses when useful and answer naturally.
7. **Advanced chat experience** — Output short, structured markdown the frontend can render cleanly. Use bold for key terms, lists for points, and tables (| A | B |) for comparisons. Do not paste huge walls of text.
8. **Tool-like behaviour** — Behave like a smart assistant with named capabilities: answer, explain, summarize, locate, search, recommend, compare, translate, guide, open resources, search approved external sources, refine results.

## PDF / KNOWLEDGE GROUNDING RULES
- Treat RETRIEVED KNOWLEDGE PASSAGES as authoritative for site-specific content. PDF-typed entries are direct PDF page text; "site" entries describe whole resources (videos, notes, MCQ banks, links); "studio" entries describe curated topics (course overviews, stage-2 guides, group blurbs).
- When a passage contains the answer, synthesize a clear answer and cite the exact file title and page in this format: [Title, p. X].
- Never claim a passage says something it does not say. Never invent page numbers, file names, sections, or quotations.
- If the local knowledge does not contain an exact answer, say so briefly, then provide the closest useful site result or a clearly-labelled general explanation.
- For an Arabic query, translate and explain the English source content naturally in the same Arabic register used by the user; keep technical English terms in parentheses where useful.

## ACCURACY & SAFETY
- Be accurate. If you are unsure, say so honestly — do NOT invent facts, fake citations, fake file names, or fake URLs.
- For clinical/medical advice, add a brief note that it is educational and a professional should be consulted for real patient care.

## THE HUB (site context you can reference & guide toward)
Site: ${site.name || "DentoVerse"} — ${site.tagline || "The All-In-One Dental Academic Hub"}
Available sections:
${sectionList || "(none provided)"}

A few example resources (there are many more — search Nova's local index for a fuller list):
${resourceList || "(none provided)"}

## APPROVED EXTERNAL SOURCES (web search — optional)
${approvedSourcesList || "(none configured)"}
- Web results are filtered to this allowlist before they reach you.
- For each external citation, include the host once so the user can see the source domain.

## RETRIEVED KNOWLEDGE PASSAGES (DentoVerse library — authoritative for site content)
${knowledgeList || "No directly matching site passage was retrieved for this turn."}

## USER-UPLOADED PDF PASSAGES (attached in this chat — authoritative for that document)
${uploadedList || "No user PDF is currently attached to this conversation."}
- When the user asks about "this PDF", "my PDF", a specific page, an outline, key points, or a summary, treat the USER PDF PASSAGES above as the primary source. Cite pages as [uploaded.pdf, p. X] using the actual file name.

## FOLLOW-UP & CONVERSATION CONTEXT
- Read the previous turns and connect the user's short follow-up questions ("tell me more", "why?", "and in Arabic?", "give an example") to the current topic. Never restart from scratch.
- If the user seems to reference "it", "that", "this topic" — resolve it from the last topic naturally.

When the user asks WHERE something is, or to OPEN/FIND a resource, tell them which section to open by its label, and note that they can tap the result cards or ask you to take them there. Do not fabricate resources that are not plausibly in the hub — if unsure, guide them to the closest relevant section or offer a web/general answer instead.`;
}

/* ───────── OpenAI-compatible chat call ───────── */
async function callOpenAI(provider, messages, opts) {
  const headers = { "Content-Type": "application/json", "Authorization": "Bearer " + provider.key };
  if (provider.name === "openrouter") {
    headers["HTTP-Referer"] = "https://dentoverse.app";
    headers["X-Title"]      = "DentoVerse Nova";
  }
  const body = {
    model: provider.model,
    messages,
    temperature: (opts && opts.temperature) != null ? opts.temperature : 0.5,
    max_tokens: (opts && opts.max_tokens) || 950,
  };
  const { ok, status, data } = await fetchJSON(provider.base + "/chat/completions", {
    method: "POST", headers, body: JSON.stringify(body),
  });
  if (!ok) return { error: (data && data.error && data.error.message) || ("upstream " + status) };
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  return { content: content || "" };
}

/* ───────── Gemini call ───────── */
async function callGemini(provider, messages, opts) {
  const sys = messages.filter(m => m.role === "system").map(m => m.content).join("\n\n");
  const contents = messages
    .filter(m => m.role !== "system")
    .map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + provider.model + ":generateContent?key=" + provider.key;
  const body = {
    systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
    contents,
    generationConfig: { temperature: (opts && opts.temperature) != null ? opts.temperature : 0.5, maxOutputTokens: (opts && opts.max_tokens) || 950 },
  };
  const { ok, status, data } = await fetchJSON(url, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!ok) return { error: (data && data.error && data.error.message) || ("upstream " + status) };
  const content = data.candidates && data.candidates[0] && data.candidates[0].content
    && data.candidates[0].content.parts && data.candidates[0].content.parts.map(p => p.text).join("");
  return { content: content || "" };
}

/* ───────── main handler ───────── */
module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }

  if (req.method === "GET") {
    const provider = resolveProvider();
    const search = resolveSearch();
    return json(res, 200, {
      ok: true,
      ai: !!provider,
      provider: provider ? provider.name : null,
      webSearch: !!search,
      name: "Nova",
      version: "3.1-phase2",
      knowledge: KNOWLEDGE.stats || {},
      externalSources: (SOURCES.sources || []).length,
      sourcesPolicy: SOURCES.policy || {}
    });
  }

  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });

  const provider = resolveProvider();
  if (!provider) {
    return json(res, 200, { ok: false, fallback: true, reason: "no_llm_configured" });
  }

  let body;
  try { body = await readBody(req); } catch { body = {}; }

  const userMessages = Array.isArray(body.messages) ? body.messages : [];
  const context = body.context && typeof body.context === "object" ? body.context : {};
  const mode = typeof body.mode === "string" ? body.mode : "";
  const wantWeb = body.web === true;

  // Client may pass a detected language / dialect hint; keep them.
  if (typeof body.lang === "string")   context.lang = String(body.lang).slice(0, 8);
  if (typeof body.dialect === "string") context.dialect = String(body.dialect).slice(0, 8);
  if (typeof body.tool === "string")    context.tool = String(body.tool).slice(0, 24);

  const uploadedPdf = Array.isArray(body.uploadedPdf) ? body.uploadedPdf
    .filter(p => p && typeof p.text === "string")
    .slice(0, 4)
    .map(p => ({
      name: String(p.name || "uploaded.pdf").slice(0, 180),
      page: Number.isFinite(+p.page) ? +p.page : 1,
      text: String(p.text || "").slice(0, 2600),
    })) : [];

  const clean = userMessages
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map(m => ({ role: m.role, content: String(m.content).slice(0, 6000) }))
    .slice(-MAX_MESSAGES);

  if (!clean.length) return json(res, 400, { ok: false, error: "No messages" });

  const lastUser = [...clean].reverse().find(m => m.role === "user");
  const lastText = lastUser ? lastUser.content : "";

  // Server-side grounding — covers PDF page text AND rich cards/studio cards.
  const serverMatches = searchKnowledge(lastText, 6);
  context.knowledge = serverMatches.map(m => ({
    resourceId: m.resourceId, title: m.title, file: m.file, link: m.link,
    section: m.sectionLabel, category: m.category, heading: m.heading, page: m.page,
    type: m.type, source: m._kind, text: String(m.text || "").slice(0, 2400)
  }));

  // Optional web search with approved-host filter.
  let sources = [];
  let webBlock = "";
  const searchProvider = resolveSearch();
  if (wantWeb && searchProvider && lastText) {
    const sr = await runWebSearch(searchProvider, lastText);
    if (sr && (sr.results || []).length) {
      const allowed = filterSourcesByAllowlist(sr.results);
      sources = allowed.slice(0, 5);
      webBlock =
        "\n\n## LIVE WEB SEARCH RESULTS (filtered by APPROVED EXTERNAL SOURCES; cite by title + host)\n" +
        (sr.answer ? "Quick answer: " + sr.answer + "\n" : "") +
        sources.map((r, i) => `[${i + 1}] ${r.title}\nHost: ${r.host}\nURL: ${r.url}\n${r.snippet || ""}`).join("\n\n");
    }
  }

  let sysPrompt = buildSystemPrompt(context, uploadedPdf);
  if (mode) {
    const modeHint = {
      short:      "Answer briefly in 1-3 sentences.",
      detailed:   "Give a thorough, well-structured explanation.",
      steps:      "Answer as clear numbered steps.",
      simple:     "Explain simply, as if to a beginner student.",
      compare:    "Structure the answer as a clear comparison (table-like bullets of similarities & differences).",
      summarize:  "Summarize the key points concisely with bullets.",
      dentistry:  "Focus the answer on the dentistry / dental-education angle.",
      arabic:     "Reply in Arabic regardless of input language.",
      english:    "Reply in English regardless of input language."
    }[mode];
    if (modeHint) sysPrompt += "\n\n## CURRENT ANSWER MODE\n" + modeHint;
  }
  if (webBlock) sysPrompt += webBlock;

  const messages = [{ role: "system", content: sysPrompt }, ...clean];

  try {
    const genOpts = uploadedPdf.length ? { temperature: 0.35 } : {};
    const result = provider.kind === "gemini"
      ? await callGemini(provider, messages, genOpts)
      : await callOpenAI(provider, messages, genOpts);

    if (result.error) {
      return json(res, 200, { ok: false, fallback: true, reason: "llm_error", detail: result.error });
    }
    return json(res, 200, {
      ok: true,
      reply: result.content,
      sources,
      provider: provider.name,
      web: sources.length > 0,
      usedUploadedPdf: uploadedPdf.length > 0,
      tool: context.tool || "",
      lang: context.lang || "auto",
      dialect: context.dialect || "auto",
      knowledgeSources: serverMatches.map(({ resourceId, title, file, link, sectionLabel, category, heading, page, type, source }) =>
        ({ resourceId, title, file, link, sectionLabel, category, heading, page, type, source }))
    });
  } catch (err) {
    return json(res, 200, { ok: false, fallback: true, reason: "exception", detail: String(err && err.message || err) });
  }
};
