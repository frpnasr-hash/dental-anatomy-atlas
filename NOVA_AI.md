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
