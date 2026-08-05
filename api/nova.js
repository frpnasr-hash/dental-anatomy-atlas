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

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
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
function buildSystemPrompt(ctx) {
  const site = ctx && ctx.site ? ctx.site : {};
  const sections = (ctx && ctx.sections) || [];
  const resources = (ctx && ctx.topResources) || [];
  const sectionList = sections.map((s) => `- ${s.label} (id: ${s.id})${s.tagline ? " — " + s.tagline : ""}`).join("\n");
  const resourceList = resources
    .slice(0, 40)
    .map((r) => `- [${r.type}] "${r.title}" · section:${r.section}${r.category ? " · " + r.category : ""}${r.status && r.status !== "available" ? " · (" + r.status + ")" : ""}`)
    .join("\n");

  return `You are **Nova**, the premium AI academic assistant embedded in **${site.name || "DentoVerse"}** — a futuristic dental-student study hub created by ${site.author || "Abdel Rahman Teba"}.

## IDENTITY & TONE
- You are intelligent, warm, professional and genuinely helpful — like an expert tutor and friendly companion.
- Keep the futuristic, elegant DentoVerse spirit. Be concise but complete.

## LANGUAGE (VERY IMPORTANT)
- You are fully multilingual. Detect the user's language from THEIR message and reply in the SAME language and register:
  - **English** → reply in clear English.
  - **Modern Standard Arabic (الفصحى)** → reply in fluent MSA.
  - **Egyptian colloquial Arabic (العامية المصرية)** → reply in natural, friendly Egyptian dialect (زي ما المصريين بيتكلموا).
- Handle mixed Arabic/English (code-switching) naturally; mirror the user's mix.
- Understand Egyptian slang and casual phrasing. Never sound robotic or overly formal when the user is casual.
- For Arabic replies, write right-to-left friendly text and use correct Arabic punctuation.

## CAPABILITIES
You are a TRUE general-purpose assistant, not just a file finder. You can:
1. Answer ANY general-knowledge question (science, history, tech, everyday life...).
2. Answer dentistry & medical-education questions accurately (anatomy, biomaterials, prosthodontics, operative, etc.).
3. Explain concepts simply, compare/contrast, summarize, and give step-by-step study help.
4. Help the user find and navigate the hub's resources (PDFs, videos, sections, question banks).
5. Use provided WEB SEARCH RESULTS to answer questions about current/external info, and cite sources.

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
      version: "2.0",
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
  const context = body.context || {};
  const mode = typeof body.mode === "string" ? body.mode : "";
  const wantWeb = body.web === true;

  // Sanitize & trim conversation.
  const clean = userMessages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 6000) }))
    .slice(-MAX_MESSAGES);

  if (!clean.length) return json(res, 400, { ok: false, error: "No messages" });

  const lastUser = [...clean].reverse().find((m) => m.role === "user");
  const lastText = lastUser ? lastUser.content : "";

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

  let sysPrompt = buildSystemPrompt(context);
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
    const result = provider.kind === "gemini"
      ? await callGemini(provider, messages, {})
      : await callOpenAI(provider, messages, {});

    if (result.error) {
      return json(res, 200, { ok: false, fallback: true, reason: "llm_error", detail: result.error });
    }
    return json(res, 200, {
      ok: true,
      reply: result.content,
      sources,
      provider: provider.name,
      web: sources.length > 0,
    });
  } catch (err) {
    return json(res, 200, { ok: false, fallback: true, reason: "exception", detail: String(err && err.message || err) });
  }
};
