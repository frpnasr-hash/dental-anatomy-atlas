/* ═══════════════════════════════════════════════════════════════
   DENTOVERSE — NOVA AI · IMAGE GENERATION BACKEND (Vercel Function)
   ───────────────────────────────────────────────────────────────
   Route:  GET  /api/nova-image   — capability probe
           POST /api/nova-image   — generate image(s) from a prompt

   This is Nova's REAL image generation layer. It is model-agnostic
   and works out of the box:

     • A built-in KEYLESS default provider (Pollinations · FLUX) is
       always available, so the Studio can generate real images with
       ZERO configuration.
     • Premium providers are auto-detected from environment variables
       and take priority when configured.
     • If a premium provider fails at request time, the function
       automatically FALLS BACK down the chain (ending at the built-in
       provider) so the user still gets an image whenever possible.

   Provider chain (first configured wins; failures cascade down):

     1. Generic OpenAI-compatible /images/generations endpoint:
          NOVA_IMAGE_BASE_URL  (e.g. https://your-endpoint/v1)
          NOVA_IMAGE_API_KEY
          NOVA_IMAGE_MODEL
     2. OpenAI Images (DALL·E / gpt-image):
          OPENAI_API_KEY       + optional OPENAI_IMAGE_MODEL
                                 (default "gpt-image-1")
     3. Together AI (FLUX schnell/dev, SDXL…):
          TOGETHER_API_KEY     + optional TOGETHER_IMAGE_MODEL
                                 (default "black-forest-labs/FLUX.1-schnell")
     4. Stability AI (SDXL / SD3):
          STABILITY_API_KEY    + optional STABILITY_IMAGE_MODEL
                                 (default "sd3")
     5. Built-in default (no key needed):
          Pollinations.ai FLUX — free, keyless, supports width/height,
          seed and negative-ish prompting. Disable with
          NOVA_IMAGE_DISABLE_DEFAULT=1 if you only want paid providers.

   The client sends:
     { prompt, negative, format, preset, count, seed }
   `format` is a NovaImage format id (square/portrait/landscape/banner/
   story/poster/card/thumbnail); it is mapped to real pixel dimensions
   and to each provider's legal size set.

   Response:
     { ok:true, images:[{ url, seed, width, height }],
       provider, model, width, height, fallback? , elapsedMs }
   or a graceful { ok:false, reason } — never a dead 500 for the UI.

   Designed & Produced by Abdel Rahman Teba © ®
   ═══════════════════════════════════════════════════════════════ */

const REQUEST_TIMEOUT_MS = 55000;

/* ───────── small helpers (mirror api/nova.js conventions) ───────── */
function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
async function readBody(req) {
  if (req.body) {
    if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
    return req.body;
  }
  return await new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => { data += c; });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))
  ]);
}
function randomSeed() { return Math.floor(Math.random() * 2147483646) + 1; }

/* ───────── format → real pixel dimensions ─────────
   Dimensions are multiples of 32 (safe for diffusion models) and
   match the Studio's advertised ratios. */
const FORMAT_DIMS = {
  square:    { w: 1024, h: 1024, ratio: "1:1" },
  portrait:  { w: 960,  h: 1280, ratio: "3:4" },
  landscape: { w: 1280, h: 960,  ratio: "4:3" },
  banner:    { w: 1344, h: 768,  ratio: "16:9" },
  story:     { w: 768,  h: 1344, ratio: "9:16" },
  poster:    { w: 832,  h: 1248, ratio: "2:3" },
  card:      { w: 1200, h: 960,  ratio: "5:4" },
  thumbnail: { w: 1280, h: 720,  ratio: "16:9" }
};
function dimsOf(format) { return FORMAT_DIMS[format] || FORMAT_DIMS.square; }

/* OpenAI gpt-image-1 / dall-e-3 legal sizes */
function openAiSize(format) {
  const d = dimsOf(format);
  const r = d.w / d.h;
  if (r > 1.25) return "1792x1024";  // landscape family
  if (r < 0.8)  return "1024x1792";  // portrait family
  return "1024x1024";                // square-ish
}
/* Stability SD3 accepts aspect_ratio strings */
function stabilityAspect(format) {
  const d = dimsOf(format);
  const r = d.w / d.h;
  if (Math.abs(r - 1) < 0.06) return "1:1";
  if (r > 1.6) return "16:9";
  if (r > 1.2) return "4:3";
  if (r < 0.62) return "9:16";
  if (r < 0.85) return "3:4";
  return "1:1";
}

/* ───────── provider chain detection ─────────
   Returns an ORDERED list: configured premium providers first,
   built-in keyless default last (unless disabled). */
function providerChain() {
  const chain = [];
  if (process.env.NOVA_IMAGE_BASE_URL && process.env.NOVA_IMAGE_API_KEY) {
    chain.push({
      id: "custom",
      kind: "openai-compatible",
      baseUrl: process.env.NOVA_IMAGE_BASE_URL.replace(/\/+$/, ""),
      apiKey: process.env.NOVA_IMAGE_API_KEY,
      model: process.env.NOVA_IMAGE_MODEL || "gpt-image-1"
    });
  }
  if (process.env.OPENAI_API_KEY) {
    chain.push({
      id: "openai",
      kind: "openai-compatible",
      baseUrl: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, ""),
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1"
    });
  }
  if (process.env.TOGETHER_API_KEY) {
    chain.push({
      id: "together",
      kind: "together",
      apiKey: process.env.TOGETHER_API_KEY,
      model: process.env.TOGETHER_IMAGE_MODEL || "black-forest-labs/FLUX.1-schnell"
    });
  }
  if (process.env.STABILITY_API_KEY) {
    chain.push({
      id: "stability",
      kind: "stability",
      apiKey: process.env.STABILITY_API_KEY,
      model: process.env.STABILITY_IMAGE_MODEL || "sd3"
    });
  }
  if (String(process.env.NOVA_IMAGE_DISABLE_DEFAULT || "") !== "1") {
    chain.push({
      id: "pollinations",
      kind: "pollinations",
      model: process.env.NOVA_IMAGE_DEFAULT_MODEL || "flux",
      builtin: true
    });
  }
  return chain;
}

/* ───────── generation adapters ───────── */
async function generateOpenAiCompatible(provider, payload) {
  const size = openAiSize(payload.format);
  const n = Math.min(Math.max(parseInt(payload.count, 10) || 1, 1), 4);
  const body = {
    model: provider.model,
    prompt: payload.prompt,
    size,
    n: /dall-e-3/i.test(provider.model) ? 1 : n
  };
  const r = await withTimeout(fetch(`${provider.baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify(body)
  }), REQUEST_TIMEOUT_MS);
  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    return { ok: false, reason: "provider_error", status: r.status, detail: detail.slice(0, 500) };
  }
  const d = await r.json();
  const [w, h] = size.split("x").map(Number);
  const images = (d.data || []).map((im) => {
    if (im.url) return { url: im.url, width: w, height: h };
    if (im.b64_json) return { url: `data:image/png;base64,${im.b64_json}`, width: w, height: h };
    return null;
  }).filter(Boolean);
  if (!images.length) return { ok: false, reason: "empty_result" };
  return { ok: true, images, provider: provider.id, model: provider.model, width: w, height: h };
}

async function generateTogether(provider, payload) {
  const d = dimsOf(payload.format);
  const seed = parseInt(payload.seed, 10) || randomSeed();
  const body = {
    model: provider.model,
    prompt: payload.prompt,
    width: d.w,
    height: d.h,
    steps: /schnell/i.test(provider.model) ? 4 : 20,
    n: 1,
    seed,
    response_format: "b64_json"
  };
  if (payload.negative) body.negative_prompt = payload.negative;
  const r = await withTimeout(fetch("https://api.together.xyz/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify(body)
  }), REQUEST_TIMEOUT_MS);
  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    return { ok: false, reason: "provider_error", status: r.status, detail: detail.slice(0, 500) };
  }
  const out = await r.json();
  const images = ((out.data || [])).map((im) => {
    if (im.b64_json) return { url: `data:image/png;base64,${im.b64_json}`, seed, width: d.w, height: d.h };
    if (im.url) return { url: im.url, seed, width: d.w, height: d.h };
    return null;
  }).filter(Boolean);
  if (!images.length) return { ok: false, reason: "empty_result" };
  return { ok: true, images, provider: provider.id, model: provider.model, width: d.w, height: d.h, seed };
}

async function generateStability(provider, payload) {
  // Stability v2beta stable-image generate (SD3). Returns image bytes.
  const form = new FormData();
  form.append("prompt", payload.prompt);
  if (payload.negative) form.append("negative_prompt", payload.negative);
  form.append("aspect_ratio", stabilityAspect(payload.format));
  form.append("model", provider.model);
  form.append("output_format", "png");
  if (payload.seed) form.append("seed", String(parseInt(payload.seed, 10) || 0));
  const r = await withTimeout(fetch("https://api.stability.ai/v2beta/stable-image/generate/sd3", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${provider.apiKey}`,
      "Accept": "image/*"
    },
    body: form
  }), REQUEST_TIMEOUT_MS);
  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    return { ok: false, reason: "provider_error", status: r.status, detail: detail.slice(0, 500) };
  }
  const buf = Buffer.from(await r.arrayBuffer());
  const url = `data:image/png;base64,${buf.toString("base64")}`;
  const d = dimsOf(payload.format);
  return { ok: true, images: [{ url, width: d.w, height: d.h }], provider: provider.id, model: provider.model, width: d.w, height: d.h };
}

/* Built-in keyless default: Pollinations.ai (FLUX).
   The image is generated on-demand when the URL is fetched; we
   HEAD-verify availability with a short probe so we never hand the
   client a dead link without knowing. Seed makes results reproducible
   and lets "regenerate" produce true variations. */
function pollinationsUrl(provider, payload, seed) {
  const d = dimsOf(payload.format);
  // Blend the negative prompt in as guidance — pollinations has no
  // dedicated negative field, but appending an avoidance clause helps.
  let prompt = payload.prompt;
  if (payload.negative) {
    const negShort = payload.negative.split(",").slice(0, 6).map(s => s.trim()).filter(Boolean).join(", ");
    if (negShort) prompt += `. Avoid: ${negShort}`;
  }
  const base = "https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt.slice(0, 1800));
  const params = new URLSearchParams({
    width: String(d.w),
    height: String(d.h),
    seed: String(seed),
    model: provider.model || "flux",
    nologo: "true",
    enhance: "false",
    safe: "true"
  });
  return `${base}?${params.toString()}`;
}
async function generatePollinations(provider, payload) {
  const d = dimsOf(payload.format);
  const count = Math.min(Math.max(parseInt(payload.count, 10) || 1, 1), 2);
  const baseSeed = parseInt(payload.seed, 10) || randomSeed();
  const images = [];
  for (let i = 0; i < count; i++) {
    const seed = i === 0 ? baseSeed : randomSeed();
    images.push({ url: pollinationsUrl(provider, payload, seed), seed, width: d.w, height: d.h });
  }
  // Verify the first image actually renders (generation happens on fetch).
  try {
    const probe = await withTimeout(fetch(images[0].url, { method: "GET" }), REQUEST_TIMEOUT_MS);
    if (!probe.ok) return { ok: false, reason: "provider_error", status: probe.status };
    const ct = probe.headers.get("content-type") || "";
    if (!/image\//i.test(ct)) return { ok: false, reason: "provider_error" };
    // Return the verified image as a data URL so the client shows the
    // exact same render (pollinations regenerates per fetch otherwise
    // being cache-consistent by seed; data URL removes any ambiguity
    // for the first image while extra variants stay lazy URLs).
    const buf = Buffer.from(await probe.arrayBuffer());
    if (buf.length > 0 && buf.length < 4.2 * 1024 * 1024) {
      images[0] = { url: `data:${ct.split(";")[0] || "image/jpeg"};base64,${buf.toString("base64")}`, seed: images[0].seed, width: d.w, height: d.h, sourceUrl: images[0].url };
    }
  } catch (e) {
    if (/timeout/i.test(String(e && e.message))) return { ok: false, reason: "timeout" };
    return { ok: false, reason: "provider_error" };
  }
  return { ok: true, images, provider: provider.id, model: provider.model, width: d.w, height: d.h, seed: baseSeed };
}

async function generateWith(provider, payload) {
  if (provider.kind === "openai-compatible") return generateOpenAiCompatible(provider, payload);
  if (provider.kind === "together") return generateTogether(provider, payload);
  if (provider.kind === "stability") return generateStability(provider, payload);
  if (provider.kind === "pollinations") return generatePollinations(provider, payload);
  return { ok: false, reason: "no_backend" };
}

/* ───────── handler ───────── */
module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }

  const chain = providerChain();

  if (req.method === "GET") {
    return json(res, 200, {
      ok: true,
      name: "Nova Image",
      version: "2.0-phase3",
      imageGeneration: chain.length > 0,
      provider: chain.length ? chain[0].id : null,
      model: chain.length ? chain[0].model : null,
      providers: chain.map(p => ({ id: p.id, model: p.model, builtin: !!p.builtin })),
      builtinDefault: chain.some(p => p.builtin),
      formats: Object.keys(FORMAT_DIMS)
    });
  }

  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });

  if (!chain.length) {
    return json(res, 200, { ok: false, reason: "no_backend" });
  }

  const body = await readBody(req);
  const prompt = String(body.prompt || "").trim();
  if (!prompt) return json(res, 400, { ok: false, reason: "missing_prompt" });

  const payload = {
    prompt,
    negative: String(body.negative || "").trim(),
    format: String(body.format || "square"),
    preset: String(body.preset || ""),
    count: body.count,
    seed: body.seed
  };

  const started = Date.now();
  let lastFail = { ok: false, reason: "generation_failed" };
  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i];
    try {
      const result = await generateWith(provider, payload);
      if (result.ok) {
        result.fallback = i > 0;
        result.elapsedMs = Date.now() - started;
        return json(res, 200, result);
      }
      lastFail = result;
    } catch (e) {
      lastFail = { ok: false, reason: /timeout/i.test(String(e && e.message)) ? "timeout" : "generation_failed" };
    }
  }
  lastFail.elapsedMs = Date.now() - started;
  return json(res, 200, lastFail); // still 200 so the Studio shows a graceful message
};
