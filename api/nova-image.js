/* ═══════════════════════════════════════════════════════════════
   DENTOVERSE — NOVA AI · IMAGE GENERATION BACKEND (Vercel Function)
   ───────────────────────────────────────────────────────────────
   Route:  GET  /api/nova-image   — capability probe
           POST /api/nova-image   — generate image(s) from a prompt

   This endpoint is the OPTIONAL, future-ready generation layer for
   Nova's Image Design Studio (assets/js/nova-image.js →
   NovaImage.Backend). The Studio works perfectly WITHOUT it: when no
   provider key is configured, it returns { ok:false, reason } and the
   Studio shows a premium prompt-composer placeholder instead of faking
   generation.

   When a provider key IS configured on Vercel, real images are
   returned as { ok:true, images:[{url}], provider }.

   Configure on Vercel → Project → Settings → Environment Variables
   (all OPTIONAL — pick ONE image provider; auto-detected in order):

     OpenAI Images (DALL·E / gpt-image):
       OPENAI_API_KEY            + optional OPENAI_IMAGE_MODEL
                                   (default "gpt-image-1")
     Stability AI (SDXL / SD3):
       STABILITY_API_KEY         + optional STABILITY_IMAGE_MODEL
       (default "sd3")
     Generic OpenAI-compatible /images/generations endpoint:
       NOVA_IMAGE_BASE_URL       (e.g. https://your-endpoint/v1)
       NOVA_IMAGE_API_KEY
       NOVA_IMAGE_MODEL

   The client sends: { prompt, negative, format, preset, count }.
   `format` is a NovaImage format id (square/portrait/landscape/banner/
   story/poster/card/thumbnail); it is mapped to a provider-legal size.

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

/* ───────── provider auto-detection ───────── */
function detectProvider() {
  if (process.env.NOVA_IMAGE_BASE_URL && process.env.NOVA_IMAGE_API_KEY) {
    return {
      id: "custom",
      kind: "openai-compatible",
      baseUrl: process.env.NOVA_IMAGE_BASE_URL.replace(/\/+$/, ""),
      apiKey: process.env.NOVA_IMAGE_API_KEY,
      model: process.env.NOVA_IMAGE_MODEL || "gpt-image-1"
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      id: "openai",
      kind: "openai-compatible",
      baseUrl: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, ""),
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1"
    };
  }
  if (process.env.STABILITY_API_KEY) {
    return {
      id: "stability",
      kind: "stability",
      apiKey: process.env.STABILITY_API_KEY,
      model: process.env.STABILITY_IMAGE_MODEL || "sd3"
    };
  }
  return null;
}

/* ───────── NovaImage format id → provider-legal size ─────────
   Providers accept a limited set of sizes; we map every Studio
   format to the closest legal one per provider family. */
const FORMAT_ASPECT = {
  square:    { w: 1, h: 1 },
  portrait:  { w: 3, h: 4 },
  landscape: { w: 4, h: 3 },
  banner:    { w: 16, h: 9 },
  story:     { w: 9, h: 16 },
  poster:    { w: 2, h: 3 },
  card:      { w: 5, h: 4 },
  thumbnail: { w: 16, h: 9 }
};
function aspectOf(format) { return FORMAT_ASPECT[format] || FORMAT_ASPECT.square; }

/* OpenAI gpt-image-1 / dall-e-3 legal sizes */
function openAiSize(format) {
  const a = aspectOf(format);
  const r = a.w / a.h;
  if (r > 1.25) return "1792x1024";  // landscape family
  if (r < 0.8)  return "1024x1792";  // portrait family
  return "1024x1024";                // square-ish
}
/* Stability SD3 accepts aspect_ratio strings */
function stabilityAspect(format) {
  const a = aspectOf(format);
  const r = a.w / a.h;
  if (Math.abs(r - 1) < 0.06) return "1:1";
  if (r > 1.6) return "16:9";
  if (r > 1.2) return "4:3";
  if (r < 0.62) return "9:16";
  if (r < 0.85) return "3:4";
  return "1:1";
}

/* ───────── generation adapters ───────── */
async function generateOpenAiCompatible(provider, payload) {
  const size = openAiSize(payload.format);
  const n = Math.min(Math.max(parseInt(payload.count, 10) || 1, 1), 4);
  // Some models (dall-e-3) only allow n=1; be conservative.
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
  const images = (d.data || []).map((im) => {
    if (im.url) return { url: im.url };
    if (im.b64_json) return { url: `data:image/png;base64,${im.b64_json}` };
    return null;
  }).filter(Boolean);
  if (!images.length) return { ok: false, reason: "empty_result" };
  return { ok: true, images, provider: provider.id, model: provider.model, size };
}

async function generateStability(provider, payload) {
  // Stability v2beta stable-image generate (SD3). Returns image bytes.
  const form = new FormData();
  form.append("prompt", payload.prompt);
  if (payload.negative) form.append("negative_prompt", payload.negative);
  form.append("aspect_ratio", stabilityAspect(payload.format));
  form.append("model", provider.model);
  form.append("output_format", "png");
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
  return { ok: true, images: [{ url }], provider: provider.id, model: provider.model, aspect: stabilityAspect(payload.format) };
}

async function generate(provider, payload) {
  if (provider.kind === "openai-compatible") return generateOpenAiCompatible(provider, payload);
  if (provider.kind === "stability") return generateStability(provider, payload);
  return { ok: false, reason: "no_backend" };
}

/* ───────── handler ───────── */
module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }

  const provider = detectProvider();

  if (req.method === "GET") {
    return json(res, 200, {
      ok: true,
      name: "Nova Image",
      version: "1.0-phase3",
      imageGeneration: !!provider,
      provider: provider ? provider.id : null,
      model: provider ? provider.model : null,
      formats: Object.keys(FORMAT_ASPECT)
    });
  }

  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });

  if (!provider) {
    // No backend configured — the Studio treats this as the premium
    // prompt-composer path (never fakes an image).
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
    count: body.count
  };

  try {
    const result = await generate(provider, payload);
    if (result.ok) return json(res, 200, result);
    return json(res, 200, result); // still 200 so the Studio can show a graceful message
  } catch (e) {
    const reason = /timeout/i.test(String(e && e.message)) ? "timeout" : "generation_failed";
    return json(res, 200, { ok: false, reason });
  }
};
