/* ═══════════════════════════════════════════════════════════════
   DENTOVERSE — NOVA AI · PDF ANALYSIS MODULE (Phase 1)
   ───────────────────────────────────────────────────────────────
   A self-contained, additive module that gives Nova the ability to
   read PDFs the user uploads directly in the chat:

     • Lazy-loads pdf.js (Mozilla) from CDN only when first needed —
       zero cost for users who never upload a PDF.
     • Extracts text PAGE BY PAGE so answers can cite exact pages.
     • Builds a lightweight bilingual (AR/EN) search index over the
       extracted pages (chunked for long pages).
     • Provides: extraction, per-page lookup, keyword search,
       heading/outline detection, key-point extraction and a
       heuristic summary — all fully client-side.
     • Exposes everything on window.NovaPDF for assistant.js.

   This file NEVER touches the DOM, the router, or any other part
   of the site. If pdf.js fails to load (offline / blocked CDN)
   every method degrades gracefully and reports a friendly error.

   Designed & Produced by Abdel Rahman Teba © ®
   ═══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  const PDFJS_VERSION = "3.11.174";
  const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
  const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

  const MAX_FILE_MB = 25;          // refuse enormous files politely
  const MAX_PAGES = 300;           // hard ceiling to keep the browser snappy
  const CHUNK_CHARS = 1400;        // split very long pages into chunks
  const MAX_DOCS = 4;              // keep at most N uploaded docs in memory

  /* ───────── text helpers (mirrors assistant.js normalisation) ───────── */
  const norm = (s) => String(s || "")
    .toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9\u0600-\u06FF\s]/g, " ")
    .replace(/\s+/g, " ").trim();
  const normArabic = (s) => norm(s)
    .replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/ة/g, "ه").replace(/[ًٌٍَُِّْـ]/g, "");
  const words = (s) => normArabic(s).split(" ").filter(w => w.length > 1);

  const STOP = new Set(("a an the of for to in on at is are was were be been being can could would should please show me find open i " +
    "want need where what which how do does did you your this that these those with and or not it its as by from into we they he she " +
    "في من الى إلى على عن مع هو هي ايه إيه ما ماذا كيف هل يا ان أن كان قد ثم بين عند غير كل بعض هذا هذه ذلك تلك").split(" "));

  /* ───────── pdf.js lazy loader ───────── */
  let pdfjsPromise = null;
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfjsPromise) return pdfjsPromise;
    pdfjsPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = PDFJS_URL;
      s.async = true;
      s.onload = () => {
        try {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
          resolve(window.pdfjsLib);
        } catch (e) { reject(new Error("pdfjs_init_failed")); }
      };
      s.onerror = () => { pdfjsPromise = null; reject(new Error("pdfjs_load_failed")); };
      document.head.appendChild(s);
    });
    return pdfjsPromise;
  }

  /* ───────── extraction ───────── */
  function linesFromTextContent(textContent) {
    // Group text items into visual lines using their Y coordinate.
    const rows = [];
    let current = null;
    (textContent.items || []).forEach(item => {
      const y = Math.round((item.transform && item.transform[5]) || 0);
      const str = item.str || "";
      if (!current || Math.abs(current.y - y) > 3) {
        current = { y, parts: [str] };
        rows.push(current);
      } else {
        current.parts.push(str);
      }
    });
    return rows.map(r => r.parts.join(" ").replace(/\s+/g, " ").trim()).filter(Boolean);
  }

  function looksLikeHeading(line) {
    const s = line.trim();
    if (!s || s.length > 90) return false;
    if (/^(\d+[\.\)]|[IVXLC]+[\.\)]|chapter|section|part|lecture|unit)\s+/i.test(s)) return true;
    const letters = s.replace(/[^A-Za-z]/g, "");
    if (letters.length >= 4 && letters === letters.toUpperCase() && s.split(" ").length <= 10) return true;
    if (/[:：]$/.test(s) && s.split(" ").length <= 8) return true;
    return false;
  }

  async function extractFile(file, onProgress) {
    if (!file || !/pdf$/i.test(file.type || "") && !/\.pdf$/i.test(file.name || "")) {
      throw new Error("not_pdf");
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error("too_large");

    const pdfjs = await loadPdfJs();
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    const total = Math.min(doc.numPages, MAX_PAGES);

    const pages = [];
    const headings = [];
    for (let p = 1; p <= total; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const lines = linesFromTextContent(tc);
      lines.forEach(line => { if (looksLikeHeading(line)) headings.push({ page: p, text: line.slice(0, 120) }); });
      pages.push({ page: p, text: lines.join("\n") });
      if (onProgress) { try { onProgress(p, total); } catch (e) {} }
      // Yield to the UI thread on big documents.
      if (p % 8 === 0) await new Promise(r => setTimeout(r, 0));
    }
    try { doc.destroy(); } catch (e) {}

    const totalChars = pages.reduce((s, pg) => s + pg.text.length, 0);
    return {
      id: "updf-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      name: file.name || "document.pdf",
      size: file.size,
      pages: total,
      truncated: doc.numPages > MAX_PAGES,
      scanned: totalChars < total * 12,       // near-zero text → probably a scanned/image PDF
      headings: headings.slice(0, 80),
      pageTexts: pages,
      addedAt: Date.now()
    };
  }

  /* ───────── chunk index ───────── */
  function buildChunks(docInfo) {
    const chunks = [];
    docInfo.pageTexts.forEach(({ page, text }) => {
      if (!text.trim()) return;
      if (text.length <= CHUNK_CHARS) {
        chunks.push({ page, text });
      } else {
        // split on paragraph/sentence boundaries near CHUNK_CHARS
        let rest = text;
        while (rest.length > 0) {
          if (rest.length <= CHUNK_CHARS) { chunks.push({ page, text: rest }); break; }
          let cut = rest.lastIndexOf("\n", CHUNK_CHARS);
          if (cut < CHUNK_CHARS * 0.4) cut = rest.lastIndexOf(". ", CHUNK_CHARS);
          if (cut < CHUNK_CHARS * 0.4) cut = CHUNK_CHARS;
          chunks.push({ page, text: rest.slice(0, cut + 1).trim() });
          rest = rest.slice(cut + 1).trim();
        }
      }
    });
    return chunks.map(c => ({
      ...c,
      docId: docInfo.id,
      name: docInfo.name,
      normalized: normArabic(c.text),
      tokens: new Set(words(c.text))
    }));
  }

  /* ───────── store ───────── */
  const Store = {
    docs: [],      // [{meta, chunks}]
    add(docInfo) {
      const chunks = buildChunks(docInfo);
      const meta = {
        id: docInfo.id, name: docInfo.name, pages: docInfo.pages, size: docInfo.size,
        truncated: docInfo.truncated, scanned: docInfo.scanned,
        headings: docInfo.headings, addedAt: docInfo.addedAt
      };
      this.docs.push({ meta, chunks, pageTexts: docInfo.pageTexts });
      while (this.docs.length > MAX_DOCS) this.docs.shift();
      return meta;
    },
    remove(id) { this.docs = this.docs.filter(d => d.meta.id !== id); },
    clear() { this.docs = []; },
    get(id) { return this.docs.find(d => d.meta.id === id) || null; },
    latest() { return this.docs.length ? this.docs[this.docs.length - 1] : null; },
    list() { return this.docs.map(d => d.meta); }
  };

  /* ───────── search across uploaded docs ───────── */
  function search(query, opts) {
    opts = opts || {};
    const pool = opts.docId ? [Store.get(opts.docId)].filter(Boolean) : Store.docs;
    if (!pool.length) return [];
    const terms = words(query).filter(w => !STOP.has(w));
    if (!terms.length) return [];
    const phrase = normArabic(query);
    const scored = [];
    pool.forEach(d => {
      d.chunks.forEach(chunk => {
        let score = 0, hits = 0;
        terms.forEach(term => {
          if (chunk.tokens.has(term)) { score += 4; hits++; }
          else if (term.length > 4 && chunk.normalized.includes(term)) { score += 2; hits++; }
        });
        if (phrase.length > 10 && chunk.normalized.includes(phrase)) score += 16;
        if (hits > 1) score += hits * 1.5;
        if (score >= 4) scored.push({ docId: d.meta.id, name: d.meta.name, page: chunk.page, text: chunk.text, score });
      });
    });
    scored.sort((a, b) => b.score - a.score || a.page - b.page);
    // At most 2 chunks per page to diversify.
    const perPage = {}; const out = [];
    for (const item of scored) {
      const key = item.docId + ":" + item.page;
      if ((perPage[key] || 0) >= 2) continue;
      perPage[key] = (perPage[key] || 0) + 1;
      out.push(item);
      if (out.length >= (opts.limit || 5)) break;
    }
    return out;
  }

  /* ───────── page lookup: "what does page 12 explain?" ───────── */
  const AR_DIGITS = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
  const toLatinDigits = (s) => String(s || "").replace(/[٠-٩]/g, d => AR_DIGITS[d] || d);
  function detectPageRequest(query) {
    const q = toLatinDigits(query);
    const m = q.match(/(?:page|p\.?|صفحه|صفحة|الصفحه|الصفحة)\s*(?:رقم\s*)?(\d{1,3})/i);
    return m ? parseInt(m[1], 10) : null;
  }
  function getPage(pageNum, docId) {
    const d = docId ? Store.get(docId) : Store.latest();
    if (!d) return null;
    const pg = d.pageTexts.find(p => p.page === pageNum);
    if (!pg) return null;
    return { docId: d.meta.id, name: d.meta.name, page: pg.page, text: pg.text, totalPages: d.meta.pages };
  }

  /* ───────── heuristic key points & summary (offline fallback) ───────── */
  function sentencesOf(text) {
    return String(text || "").split(/(?<=[.!?؟])\s+|\n+/).map(s => s.trim()).filter(s => s.length >= 30 && s.length <= 400);
  }
  function keyPoints(docId, limit) {
    const d = docId ? Store.get(docId) : Store.latest();
    if (!d) return [];
    // Score sentences by keyword density of the doc's most frequent tokens.
    const freq = {};
    d.chunks.forEach(c => c.tokens.forEach(t => { if (!STOP.has(t) && t.length > 3) freq[t] = (freq[t] || 0) + 1; }));
    const top = new Set(Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 24).map(x => x[0]));
    const picked = [];
    const seenStart = new Set();
    for (const pg of d.pageTexts) {
      for (const s of sentencesOf(pg.text)) {
        const toks = words(s);
        const hits = toks.filter(t => top.has(t)).length;
        const defBonus = /\b(is defined as|refers to|is called|consists of|is composed of|هي عباره عن|هو عباره عن|يعرف بانه|تعرف بانها|يتكون من)\b/i.test(s) ? 3 : 0;
        const score = hits + defBonus;
        if (score >= 3) {
          const start = normArabic(s).slice(0, 40);
          if (seenStart.has(start)) continue;
          seenStart.add(start);
          picked.push({ page: pg.page, text: s, score });
        }
      }
    }
    picked.sort((a, b) => b.score - a.score);
    return picked.slice(0, limit || 8).sort((a, b) => a.page - b.page);
  }
  function outline(docId) {
    const d = docId ? Store.get(docId) : Store.latest();
    if (!d) return [];
    return (d.meta.headings || []).slice(0, 24);
  }

  /* Build compact context blocks to hand to the LLM (server). */
  function contextFor(query, opts) {
    opts = opts || {};
    const pageNum = detectPageRequest(query);
    if (pageNum != null) {
      const pg = getPage(pageNum, opts.docId);
      if (pg) return [{ name: pg.name, page: pg.page, text: pg.text.slice(0, 3200) }];
    }
    const matches = search(query, { docId: opts.docId, limit: opts.limit || 4 });
    if (matches.length) return matches.map(m => ({ name: m.name, page: m.page, text: m.text.slice(0, 2400) }));
    // Generic ask ("summarize my PDF") → representative sample of the latest doc.
    const d = opts.docId ? Store.get(opts.docId) : Store.latest();
    if (!d) return [];
    const step = Math.max(1, Math.floor(d.pageTexts.length / 5));
    const sample = [];
    for (let i = 0; i < d.pageTexts.length && sample.length < 5; i += step) {
      const pg = d.pageTexts[i];
      if (pg.text.trim()) sample.push({ name: d.meta.name, page: pg.page, text: pg.text.slice(0, 1800) });
    }
    return sample;
  }

  /* ───────── public API ───────── */
  window.NovaPDF = {
    version: "1.0",
    maxFileMB: MAX_FILE_MB,
    maxPages: MAX_PAGES,
    isSupported: () => typeof window.FileReader !== "undefined" && typeof ArrayBuffer !== "undefined",
    hasDocs: () => Store.docs.length > 0,
    list: () => Store.list(),
    latest: () => (Store.latest() || {}).meta || null,
    remove: (id) => Store.remove(id),
    clear: () => Store.clear(),

    /** Extract + index a File. Returns the stored doc meta. */
    async add(file, onProgress) {
      const info = await extractFile(file, onProgress);
      return Store.add(info);
    },

    search,
    detectPageRequest,
    getPage,
    keyPoints,
    outline,
    contextFor
  };
})();
