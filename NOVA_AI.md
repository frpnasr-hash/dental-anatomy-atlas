# Nova AI — Phase 1 PDF + Site Knowledge Assistant

Nova is DentoVerse's bilingual academic assistant. Phase 1 is intentionally focused on reliable answers from the site's own PDFs and resource catalogue, with a fast local fallback and optional LLM-powered synthesis.

## Phase 1 capabilities

- Searches **45 local PDFs across 1,466 pages** using a generated page-level knowledge index.
- Answers from retrieved PDF passages and shows the exact **file, section, category, and page**.
- Searches all existing DentoVerse resources and explains where each resource is located.
- Supports English, Modern Standard Arabic, Egyptian Arabic, and mixed Arabic/English queries.
- Keeps conversation context for follow-up questions.
- Provides Open, Go to, Copy, and Save actions on grounded source cards.
- Works without an external AI provider: local retrieval returns the closest useful source passage.
- Uses an optional server-side LLM only to synthesize a more natural answer from retrieved local passages. Keys are never exposed to the browser.

## Architecture

- `assets/data/nova-knowledge.json` — generated searchable PDF metadata and page chunks.
- `scripts/build-nova-index.js` — extracts text with `pdftotext`, keeps page numbers, and rebuilds the index.
- `assets/js/assistant.js` — bilingual retrieval, follow-up context, resource search, and premium assistant UI.
- `assets/css/assistant.css` — floating button, expandable chat panel, source cards, actions, RTL, loading states, and responsive layout.
- `api/nova.js` — Vercel function that performs server-side retrieval and optionally asks a configured LLM to answer only from grounded passages.

## Rebuild the PDF index

After adding or replacing PDFs and updating `assets/js/data.js`, run:

```bash
node scripts/build-nova-index.js
```

The script reads the current resource catalogue, extracts local PDF text page by page, and rewrites `assets/data/nova-knowledge.json`. Commit the regenerated index with the PDF/resource change.

## Optional AI synthesis

Nova's local retrieval works without environment variables. For more natural explanations and Arabic translation of English PDF passages, configure one provider in Vercel:

| Provider | Environment variable | Optional model variable |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` | `OPENAI_MODEL` |
| OpenRouter | `OPENROUTER_API_KEY` | `OPENROUTER_MODEL` |
| Groq | `GROQ_API_KEY` | `GROQ_MODEL` |
| DeepSeek | `DEEPSEEK_API_KEY` | `DEEPSEEK_MODEL` |
| Gemini | `GEMINI_API_KEY` | `GEMINI_MODEL` |
| OpenAI-compatible | `NOVA_LLM_BASE_URL` + `NOVA_LLM_API_KEY` | `NOVA_LLM_MODEL` |

The model receives only the most relevant local PDF chunks, resource metadata, and recent conversation turns. It is instructed to cite exact titles and pages and never invent sources.

## Health check

`GET /api/nova` returns the active provider and index statistics:

```json
{
  "ok": true,
  "ai": true,
  "provider": "openai",
  "name": "Nova",
  "version": "3.0-phase1",
  "knowledge": { "documents": 45, "chunks": 1261, "pages": 1466 }
}
```

Phase 1 deliberately excludes voice, image understanding, advanced long-term memory, and full web search.

---

# Nova AI — Phase 3 · Image Design Studio

Phase 3 turns Nova into a premium **AI image-design assistant**. Nova does **not** pretend to be an image model — it is a powerful **image-prompt intelligence layer** with an **optional** generation backend that plugs in cleanly when a provider key is configured.

Every existing DentoVerse feature (dental anatomy, search, favorites, filters, downloads, resources, PDFs, videos, the Phase 1/2 assistant) is untouched — the image system is purely additive.

## What Nova can do

- **Understand image requests** in natural language (EN / Modern Standard Arabic / Egyptian colloquial) and infer subject, style, mood, quality, format, composition, purpose and audience.
- **Compose production-ready prompts** with subject, style, composition, lighting, palette, camera language, realism/quality guidance and **negative prompts**.
- **Offer multiple prompt variants**: short, detailed, stylized, professional, safe fallback, and an academic variant for study/dental requests.
- **Refine iteratively** — "more cinematic", "أكثر واقعية", "make it cleaner", "change colors to deep blue and orange" — without starting over.
- **13 style presets**: Realistic, Cinematic, Futuristic, Minimal, Academic, Clean Medical, Dentistry Educational, Poster, Social Banner, Infographic, Luxury, Soft Modern, Bold Editorial.
- **Composition, quality and aspect-ratio/format controls** with smart auto-recommendation.
- **Prompt memory + feedback learning** (local/session): remembers successful presets/formats, learns from approvals, edits and saves — no magical claims, just practical bias.
- **Reusable prompt library** of modular templates (dental education, academic, social, creative).
- Especially strong at **dentistry visuals**: education posters, study diagrams, lecture banners, medical-style infographics, clean anatomy visuals, academic covers, course announcements.

## Architecture (all additive)

- `assets/js/nova-image.js` — `window.NovaImage`: request understanding, prompt composer, presets, variants, refinement, memory/feedback, prompt library, backend adapter.
- `assets/js/nova-image-studio.js` — `window.NovaImageStudio`: the premium glass overlay UI (request input, controls, variant tabs, editable prompt + negative prompt, improve/regenerate/copy/save, history + saved + template library, result placeholders or real images).
- `assets/css/nova-image.css` — Studio styles + chat-side launcher chip/invite, matching the DentoVerse glassmorphism (deep blue / white / orange).
- `assets/js/nova-chat.js` — the additive bridge that connects the Studio to the existing Nova chat: a 🎨 header launcher, a persistent "Image Studio" quick-chip, and capture-phase detection of image requests typed in chat (only image requests are intercepted; all other messages use the normal chat path).
- `api/nova-image.js` — optional Vercel function for real generation.

## Optional image generation backend

The Studio works fully **without** a backend — it stays a premium prompt composer and shows a "connect a model" placeholder (it never fakes an image). To enable real generation, configure **one** provider on Vercel:

| Provider | Environment variable | Optional model variable |
|---|---|---|
| OpenAI Images | `OPENAI_API_KEY` | `OPENAI_IMAGE_MODEL` (default `gpt-image-1`) |
| Stability AI | `STABILITY_API_KEY` | `STABILITY_IMAGE_MODEL` (default `sd3`) |
| OpenAI-compatible | `NOVA_IMAGE_BASE_URL` + `NOVA_IMAGE_API_KEY` | `NOVA_IMAGE_MODEL` |

### Image backend health check

`GET /api/nova-image`:

```json
{
  "ok": true,
  "name": "Nova Image",
  "version": "1.0-phase3",
  "imageGeneration": true,
  "provider": "openai",
  "model": "gpt-image-1",
  "formats": ["square","portrait","landscape","banner","story","poster","card","thumbnail"]
}
```

`POST /api/nova-image` with `{ prompt, negative, format, preset, count }` returns `{ ok:true, images:[{url}], provider }`, or a graceful `{ ok:false, reason }` when no provider is configured.

---

# Nova AI — Phase 5 · Deep Understanding + Learned Context (server-integrated)

Phase 5 closes the loop between Nova's client-side intelligence and its serverless brain. The deep-understanding envelope and the user's personal learned material are now **actually consumed by the backend**, and the offline fallback benefits from learned material too. Everything is additive and backward compatible — no existing DentoVerse feature changes.

## What Phase 5 adds

- **Deep request understanding, server-side.** `nova-understand.js` already analysed every message into an *understanding envelope* (intent, depth, tone, output-format hints, must-include / must-exclude topics, hard constraints like word/sentence/page limits, key entities, ambiguity + a bilingual clarify question). `api/nova.js` now folds that envelope into the system prompt as an explicit **DEEP REQUEST UNDERSTANDING** directive block, so the model plans against the real request instead of a shallow keyword read.
- **Depth-aware generation.** The backend tunes `max_tokens` / `temperature` to the understood depth (`deep`, `exam`, `brief`, `stepwise`) and hard-caps output to respect explicit word/sentence budgets.
- **Learned material as grounded context.** User-provided, locally-indexed material (chat logs, notes, prompt examples via `NovaLearn`) is passed to the backend and injected as a trusted **USER-PROVIDED LEARNED MATERIAL** section — so answers match the user's own style, terminology and examples. All input is sanitized and length-capped; the client never sends code, only text.
- **Offline learned answers.** When no AI key is configured, `respondFromLearned()` in `assistant.js` searches the personal `NovaLearn` index and surfaces the most relevant snippets as a grounded bilingual reply, styled to match the DentoVerse glass UI.
- **Language back-fill.** When the client omits an explicit `lang` / `dialect` / `tool` hint, the backend derives them from the understanding envelope (English / MSA / Egyptian Arabic / mixed).

## New / expanded LLM providers

In addition to OpenAI, OpenRouter, Groq, DeepSeek and Gemini, Phase 5 adds:

| Provider | Environment variable | Optional model variable | Notes |
|---|---|---|---|
| Mistral AI | `MISTRAL_API_KEY` | `MISTRAL_MODEL` (default `mistral-large-latest`) | OpenAI-compatible La Plateforme |
| Alibaba Qwen | `QWEN_API_KEY` / `DASHSCOPE_API_KEY` | `QWEN_MODEL` (default `qwen2.5-72b-instruct`), `QWEN_BASE_URL` | DashScope OpenAI-compatible endpoint |
| Meta Llama 3.1 | *(via Groq or OpenRouter)* | `GROQ_MODEL=llama-3.1-70b-versatile` or `OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct` | no dedicated key needed |

## Health check (Phase 5)

`GET /api/nova` now reports version `4.0-phase5` and a capabilities map:

```json
{
  "ok": true,
  "ai": true,
  "provider": "openai",
  "name": "Nova",
  "version": "4.0-phase5",
  "capabilities": {
    "deepUnderstanding": true,
    "learnedContext": true,
    "multilingual": true,
    "uploadedPdf": true,
    "approvedWebSearch": false,
    "depthAwareGeneration": true
  }
}
```

`POST /api/nova` responses additionally include `usedUnderstanding`, `usedLearned`, `understoodIntent` and `understoodDepth` so the frontend can observe how the request was interpreted.
