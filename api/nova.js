/* ═══════════════════════════════════════════════════════════════
   DENTOVERSE — NOVA AI · Serverless Backend (Vercel Function)
   ───────────────────────────────────────────────────────────────
   Route:  POST /api/nova
   Purpose:
     • Give Nova a real LLM brain for general + dentistry Q&A.
     • Full multilingual support (English / MSA Arabic / Egyptian
       colloquial Arabic) driven entirely by the system prompt.
     • Optional live web-search grounding (Tavily / Serper / Brave /
       Google CSE) when the user asks for current / external info.
     • 100% graceful degradation: if no LLM key is configured the
       endpoint returns { ok:false, fallback:true } and the frontend
       silently falls back to its offline local search — the base
       site NEVER breaks.

   Configure on Vercel → Project → Settings → Environment Variables
   (all optional — set only what you have):

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

     WEB SEARCH (optional; pick ONE):
       TAVILY_API_KEY
       SERPER_API_KEY          (google.serper.dev)
       BRAVE_API_KEY
       GOOGLE_CSE_KEY + GOOGLE_CSE_CX

   Designed & Produced by Abdel Rahman Teba © ®
   ═══════════════════════════════════════════════════════════════ */

const MAX_MESSAGES = 24;          // trim conversation to keep tokens sane
const REQUEST_TIMEOUT_MS = 45000; // hard ceiling for upstream calls
let KNOWLEDGE = { chunks: [], stats: {} };
try { KNOWLEDGE = require("../assets/data/nova-knowledge.json"); } catch { /* local fallback still works */ }

const ARABIC_QUERY_TERMS = {
  "اسنان": "dental teeth", "سن": "tooth dental", "ضرس": "molar tooth", "مينا": "enamel", "عاج": "dentin",
  "لب": "pulp", "لثه": "gingiva periodontal", "رباط": "ligament", "تكوين": "formation development", "تطور": "development",
  "جذر": "root", "تاج": "crown", "مواد": "materials", "خامات": "biomaterials materials", "طبعه": "impression",
  "جبس": "gypsum", "شمع": "wax", "سيراميك": "ceramics", "اسمنت": "cement", "حشو": "restorative composite",
  "كمبوزيت": "composite", "راتنج": "resin", "سباكه": "casting", "سبايك": "alloys", "تركيب": "composition structure",
  "خصائص": "properties", "انواع": "classification types", "فرق": "difference compare", "وظيفه": "function", "عملي": "practical",
  "محاضره": "lecture", "ملف": "pdf document", "ملفات": "pdf documents", "صفحه": "page", "اسئله": "questions mcq exam", "امتحان": "exam questions"
};

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

function searchKnowledge(query, limit = 6) {
  const stop = new Set("a an the of for to in on at is are be can could would please show me find open i want need where what which how do you about this that with and or في من الى علي عن مع هو هي ايه ما ماذا كيف هل يا".split(" "));
  const base = normalizeSearch(query).split(" ").filter((word) => word.length > 1 && !stop.has(word));
  const terms = [...base];
  base.forEach((word) => {
    const candidates = [word];
    if (word.startsWith("وال") && word.length > 4) candidates.push(word.slice(3));
    if (word.startsWith("ال") && word.length > 3) candidates.push(word.slice(2));
    if (word.endsWith("ات") && word.length > 4) candidates.push(word.slice(0, -2), word.slice(0, -2) + "ه");
    const mapped = candidates.map((candidate) => ARABIC_QUERY_TERMS[candidate]).find(Boolean);
    if (mapped) terms.push(...mapped.split(" "));
  });
  const unique = [...new Set(terms)];
  if (!unique.length) return [];
  return (KNOWLEDGE.chunks || []).map((chunk) => {
    const meta = normalizeSearch(`${chunk.title} ${chunk.sectionLabel} ${chunk.category} ${chunk.heading}`);
    const text = normalizeSearch(chunk.text);
    let score = 0;
    unique.forEach((term) => {
      if (meta.includes(term)) score += 8;
      else if (new RegExp(`(^|\\s)${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`).test(text)) score += 3.5;
      else if (term.length > 4 && text.includes(term)) score += 2;
    });
    return { ...chunk, score };
  }).filter((chunk) => chunk.score >= 3.5).sort((a, b) => b.score - a.score).slice(0, limit);
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

async function fetchJSON(url, opts, ms) {
  const r = await withTimeout(fetch(url, opts), ms || REQUEST_TIMEOUT_MS);
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: r.ok, status: r.status, data };
}

/* ───────── LLM provider auto-detection ─────────
   Returns an OpenAI-compatible caller or null when nothing is set. */
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

/* ───────── web-search provider (optional) ───────── */
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: provider.key, query, max_results: 5, include_answer: true }),
      }, 20000);
      if (!ok) return null;
      const results = (data.results || []).map((r) => ({ title: r.title, url: r.url, snippet: r.content }));
      return { answer: data.answer || "", results };
    }
    if (provider.kind === "serper") {
      const { ok, data } = await fetchJSON("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": provider.key, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, num: 5 }),
      }, 20000);
      if (!ok) return null;
      const results = (data.organic || []).slice(0, 5).map((r) => ({ title: r.title, url: r.link, snippet: r.snippet }));
      return { answer: (data.answerBox && (data.answerBox.answer || data.answerBox.snippet)) || "", results };
    }
    if (provider.kind === "brave") {
      const u = "https://api.search.brave.com/res/v1/web/search?q=" + encodeURIComponent(query) + "&count=5";
      const { ok, data } = await fetchJSON(u, { headers: { "X-Subscription-Token": provider.key, "Accept": "application/json" } }, 20000);
      if (!ok) return null;
      const results = ((data.web && data.web.results) || []).slice(0, 5).map((r) => ({ title: r.title, url: r.url, snippet: r.description }));
      return { answer: "", results };
    }
    if (provider.kind === "google") {
      const u = "https://www.googleapis.com/customsearch/v1?key=" + provider.key + "&cx=" + provider.cx + "&num=5&q=" + encodeURIComponent(query);
      const { ok, data } = await fetchJSON(u, {}, 20000);
      if (!ok) return null;
      const results = (data.items || []).slice(0, 5).map((r) => ({ title: r.title, url: r.link, snippet: r.snippet }));
      return { answer: "", results };
    }
  } catch { /* graceful */ }
  return null;
}

/* ───────── system prompt (the heart of Nova) ───────── */
function buildSystemPrompt(ctx, uploadedPdf) {
  const site = ctx && ctx.site ? ctx.site : {};
  const sections = (ctx && ctx.sections) || [];
  const resources = (ctx && ctx.topResources) || [];
  const knowledge = (ctx && ctx.knowledge) || [];
  const sectionList = sections.map((s) => `- ${s.label} (id: ${s.id})${s.tagline ? " — " + s.tagline : ""}`).join("\n");
  const resourceList = resources
    .slice(0, 40)
    .map((r) => `- [${r.type}] "${r.title}" · section:${r.section}${r.category ? " · " + r.category : ""}${r.status && r.status !== "available" ? " · (" + r.status + ")" : ""}`)
    .join("\n");
  const knowledgeList = knowledge.slice(0, 8).map((item, index) =>
    `[PDF ${index + 1}] ${item.title}\nSection: ${item.section || ""} · Category: ${item.category || ""} · Page: ${item.page}\nFile: ${item.file}\nHeading: ${item.heading || ""}\nExtracted text:\n${String(item.text || "").slice(0, 2400)}`
  ).join("\n\n");
  const uploadedList = (uploadedPdf || []).slice(0, 4).map((item, index) =>
    `[USER PDF PASSAGE ${index + 1}] ${item.name || "uploaded.pdf"} · page ${item.page}\n${String(item.text || "").slice(0, 2400)}`
  ).join("\n\n");

  return `You are **Nova**, the premium AI academic assistant embedded in **${site.name || "DentoVerse"}** — a futuristic dental-student study hub created by ${site.author || "Abdel Rahman Teba"}.

## IDENTITY & TONE
- You are intelligent, warm, professional and genuinely helpful — like an expert tutor and friendly companion.
- Keep the futuristic, elegant DentoVerse spirit. Be concise but complete.
- You are a real conversational assistant, not a search engine. Answer general questions, explain concepts, compare topics, summarize information, handle follow-ups, and maintain conversation context. Never sound robotic.

## LANGUAGE (VERY IMPORTANT)
- You are fully multilingual. Detect the user's language from THEIR message and reply in the SAME language and register:
  - **English** → reply in clear English.
  - **Modern Standard Arabic (الفصحى)** → reply in fluent MSA.
  - **Egyptian colloquial Arabic (العامية المصرية)** → reply in natural, friendly Egyptian dialect (زي ما المصريين بيتكلموا).
- Handle mixed Arabic/English (code-switching) naturally; mirror the user's mix.
- Understand Egyptian slang and casual phrasing. Never sound robotic or overly formal when the user is casual.
- For Arabic replies, write right-to-left friendly text and use correct Arabic punctuation.

## PHASE 1 CAPABILITIES
You are a retrieval-grounded academic assistant, not merely a file finder. Your priority is:
1. Answer questions from the supplied DentoVerse PDF passages and site resources.
2. Explain the answer naturally and helpfully in the user's language, rather than dumping search results.
3. Support follow-up questions by using the conversation and the supplied passages together.
4. Help users find and navigate PDFs, videos, sections, and question banks.
5. Answer general questions about how this site is organised.

## PDF GROUNDING RULES (CRITICAL)
- Treat the PDF KNOWLEDGE PASSAGES below as the authoritative local source context.
- When they contain the answer, synthesize a clear answer and cite the exact file title and page in this format: [Title, p. X].
- Never claim a passage says something it does not say. Never invent page numbers, file names, sections, or quotations.
- If passages are only partially relevant, clearly say that this is the closest match and explain what it does establish.
- If the local knowledge does not contain an exact answer, say so briefly, then provide the closest useful site result or a clearly-labelled general explanation.
- For an Arabic query, translate and explain the English source content naturally in the same Arabic register used by the user; keep technical English terms in parentheses where useful.

## ANSWER MODES
Respect the requested mode if the app sends one (short / detailed / step-by-step / simple / compare / summarize / dentistry). Otherwise choose the most helpful format automatically. Use short markdown (bold, bullet lists, numbered steps) — never huge walls of text.

## ACCURACY & SAFETY
- Be accurate. If you are unsure, say so honestly and suggest how to verify — do NOT invent facts, fake citations, fake file names, or fake URLs.
- For clinical/medical advice, add a brief note that it is educational and a professional should be consulted for real patient care.
- Stay polite, academic and encouraging.

## THE HUB (site context you can reference & guide toward)
Site: ${site.name || "DentoVerse"} — ${site.tagline || "The All-In-One Dental Academic Hub"}
Sections available:
${sectionList || "(none provided)"}

Sample of current resources (there may be more):
${resourceList || "(none provided)"}

## RETRIEVED PDF KNOWLEDGE PASSAGES (from the DentoVerse library — authoritative for site content)
${knowledgeList || "No directly matching site PDF passage was retrieved for this turn."}

## USER-UPLOADED PDF PASSAGES (attached in this chat — authoritative for that document)
${uploadedList || "No user PDF is currently attached to this conversation."}
- When the user asks about "this PDF", "my PDF", a specific page, an outline, key points, or a summary, treat the USER PDF PASSAGES above as the primary source. Cite pages as [uploaded.pdf, p. X] using the actual file name.
- Never invent page numbers or content that is not in the passages. If the passages do not cover the question, say so clearly and offer to explain a section they can point to.

## FOLLOW-UP & CONVERSATION CONTEXT
- Read the previous turns and connect the user's short follow-up questions ("tell me more", "why?", "and in Arabic?", "give an example") to the current topic. Never restart from scratch.
- If the user seems to reference "it", "that", "this topic" — resolve it from the last topic naturally.

When the user asks WHERE something is, or to OPEN/FIND a resource, tell them which section to open by its label, and note that they can tap the result cards or ask you to take them there. Do not fabricate resources that are not plausibly in the hub — if unsure, guide them to the closest relevant section or offer a web/general answer instead.`;
}

/* ───────── OpenAI-compatible chat call ───────── */
async function callOpenAI(provider, messages, opts) {
  const headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + provider.key,
  };
  if (provider.name === "openrouter") {
    headers["HTTP-Referer"] = "https://dentoverse.app";
    headers["X-Title"] = "DentoVerse Nova";
  }
  const body = {
    model: provider.model,
    messages,
    temperature: (opts && opts.temperature) != null ? opts.temperature : 0.5,
    max_tokens: (opts && opts.max_tokens) || 900,
  };
  const { ok, status, data } = await fetchJSON(provider.base + "/chat/completions", {
    method: "POST", headers, body: JSON.stringify(body),
  });
  if (!ok) return { error: (data && data.error && data.error.message) || ("upstream " + status) };
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  return { content: content || "" };
}

/* ───────── Gemini call (mapped to OpenAI-style messages) ───────── */
async function callGemini(provider, messages, opts) {
  const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + provider.model + ":generateContent?key=" + provider.key;
  const body = {
    systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
    contents,
    generationConfig: { temperature: (opts && opts.temperature) != null ? opts.temperature : 0.5, maxOutputTokens: (opts && opts.max_tokens) || 900 },
  };
  const { ok, status, data } = await fetchJSON(url, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!ok) return { error: (data && data.error && data.error.message) || ("upstream " + status) };
  const content = data.candidates && data.candidates[0] && data.candidates[0].content
    && data.candidates[0].content.parts && data.candidates[0].content.parts.map((p) => p.text).join("");
  return { content: content || "" };
}

/* ───────── main handler ───────── */
module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }

  if (req.method === "GET") {
    // Health / capability probe used by the frontend to decide if AI is live.
    const provider = resolveProvider();
    const search = resolveSearch();
    return json(res, 200, {
      ok: true,
      ai: !!provider,
      provider: provider ? provider.name : null,
      webSearch: !!search,
      name: "Nova",
      version: "3.0-phase1",
      knowledge: KNOWLEDGE.stats || {},
    });
  }

  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });

  const provider = resolveProvider();
  if (!provider) {
    // No key configured → tell frontend to use its offline brain.
    return json(res, 200, { ok: false, fallback: true, reason: "no_llm_configured" });
  }

  let body;
  try { body = await readBody(req); } catch { body = {}; }

  const userMessages = Array.isArray(body.messages) ? body.messages : [];
  const context = body.context && typeof body.context === "object" ? body.context : {};
  const mode = typeof body.mode === "string" ? body.mode : "";
  const wantWeb = body.web === true;
  // Sanitize client-supplied uploaded PDF passages (already extracted in the browser).
  const uploadedPdf = Array.isArray(body.uploadedPdf) ? body.uploadedPdf
    .filter((p) => p && typeof p.text === "string")
    .slice(0, 4)
    .map((p) => ({
      name: String(p.name || "uploaded.pdf").slice(0, 180),
      page: Number.isFinite(+p.page) ? +p.page : 1,
      text: String(p.text || "").slice(0, 2600),
    })) : [];

  // Sanitize & trim conversation.
  const clean = userMessages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 6000) }))
    .slice(-MAX_MESSAGES);

  if (!clean.length) return json(res, 400, { ok: false, error: "No messages" });

  const lastUser = [...clean].reverse().find((m) => m.role === "user");
  const lastText = lastUser ? lastUser.content : "";

  // Retrieve server-side as well as client-side so every AI answer is grounded even if the UI index is still loading.
  const serverKnowledge = searchKnowledge(lastText, 6);
  context.knowledge = serverKnowledge.map((match) => ({
    resourceId: match.resourceId, title: match.title, file: match.file, section: match.sectionLabel,
    category: match.category, heading: match.heading, page: match.page, text: String(match.text || "").slice(0, 2400)
  }));

  // Optional web search grounding.
  let sources = [];
  let webBlock = "";
  const searchProvider = resolveSearch();
  if (wantWeb && searchProvider && lastText) {
    const sr = await runWebSearch(searchProvider, lastText);
    if (sr && (sr.results || []).length) {
      sources = sr.results;
      webBlock =
        "\n\n## LIVE WEB SEARCH RESULTS (use these to answer; cite sources by title)\n" +
        (sr.answer ? "Quick answer: " + sr.answer + "\n" : "") +
        sr.results
          .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet || ""}`)
          .join("\n\n");
    }
  }

  let sysPrompt = buildSystemPrompt(context, uploadedPdf);
  if (mode) {
    const modeHint = {
      short: "Answer briefly in 1-3 sentences.",
      detailed: "Give a thorough, well-structured explanation.",
      steps: "Answer as clear numbered steps.",
      simple: "Explain simply, as if to a beginner student.",
      compare: "Structure the answer as a clear comparison (table-like bullets of similarities & differences).",
      summarize: "Summarize the key points concisely with bullets.",
      dentistry: "Focus the answer on the dentistry / dental-education angle.",
      arabic: "Reply in Arabic regardless of input language.",
      english: "Reply in English regardless of input language.",
    }[mode];
    if (modeHint) sysPrompt += "\n\n## CURRENT ANSWER MODE\n" + modeHint;
  }
  if (webBlock) sysPrompt += webBlock;

  const messages = [{ role: "system", content: sysPrompt }, ...clean];

  try {
    // Slightly lower temperature when we're grounding on a user PDF, to reduce fabrication.
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
      knowledgeSources: serverKnowledge.map(({ resourceId, title, file, sectionLabel, category, heading, page }) => ({ resourceId, title, file, sectionLabel, category, heading, page })),
    });
  } catch (err) {
    return json(res, 200, { ok: false, fallback: true, reason: "exception", detail: String(err && err.message || err) });
  }
};
