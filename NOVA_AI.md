# 🤖 Nova AI — DentoVerse Assistant (v2)

Nova is the premium, **multilingual, general-purpose** AI companion built into DentoVerse.
It understands **English, Modern Standard Arabic (الفصحى), and Egyptian colloquial Arabic (العامية المصرية)**,
answers general **and** dentistry questions, explains concepts, finds & opens hub resources,
and can search the web when configured.

## ✨ What Nova can do
- **Multilingual** — auto-detects the user's language (EN / MSA / Egyptian) and replies in the same language, RTL-aware. Handles mixed AR/EN.
- **General knowledge Q&A** — science, study help, tech, everyday explanations, comparisons, summaries, translation.
- **Dentistry expert** — anatomy, biomaterials, prosthodontics, operative, etc.
- **Hub intelligence** — finds PDFs, videos, question banks & sections; opens them; highlights cards; recommends what to study next.
- **Web search** — optional live grounding with cited source cards.
- **Memory & feedback** — remembers the session, learns from 👍/👎 to sharpen retrieval, saves preferences (language, answer style, web toggle).
- **Answer modes** — Auto / Short / Detailed / Steps / Simple / Compare / Summarize / Dentistry.

## 🧠 Architecture
- **Frontend:** `assets/js/assistant.js` + `assets/css/assistant.css` — the UI, local smart-search engine, language detection, memory, and AI routing. **100% additive** and non-destructive to the rest of the site.
- **Backend:** `api/nova.js` — a Vercel serverless function that proxies to an LLM (and optional web search). It never exposes keys to the browser.
- **Graceful degradation:** if no LLM key is set (or the API is unreachable), Nova automatically falls back to its built-in offline smart search — **the site never breaks.**

## 🔑 Enable the AI brain (Vercel → Settings → Environment Variables)
All variables are **optional**. Add an LLM key to unlock true general-purpose answers.
Set **one** LLM provider (auto-detected in this order):

| Provider | Variable(s) | Optional model var |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` | `OPENAI_MODEL` (default `gpt-4o-mini`) |
| OpenRouter | `OPENROUTER_API_KEY` | `OPENROUTER_MODEL` |
| Groq | `GROQ_API_KEY` | `GROQ_MODEL` (default `llama-3.3-70b-versatile`) |
| DeepSeek | `DEEPSEEK_API_KEY` | `DEEPSEEK_MODEL` (default `deepseek-chat`) |
| Google Gemini | `GEMINI_API_KEY` | `GEMINI_MODEL` (default `gemini-1.5-flash`) |
| Any OpenAI-compatible | `NOVA_LLM_BASE_URL` + `NOVA_LLM_API_KEY` | `NOVA_LLM_MODEL` |

### Optional web search (set one)
`TAVILY_API_KEY` · `SERPER_API_KEY` · `BRAVE_API_KEY` · `GOOGLE_CSE_KEY` + `GOOGLE_CSE_CX`

After adding variables, redeploy (Vercel does this automatically on the next push).
See `.env.example` for a copy-paste template. **Redeploy** and Nova's brain is live — no code change needed.

## 🧪 Verify it's live
Open `/api/nova` in the browser (GET) — it returns a JSON health probe:
```json
{ "ok": true, "ai": true, "provider": "openai", "webSearch": false, "name": "Nova", "version": "2.0" }
```
`ai: false` means no LLM key is configured yet (Nova still works offline).

---
Designed & Produced by **Abdel Rahman Teba** © ®
