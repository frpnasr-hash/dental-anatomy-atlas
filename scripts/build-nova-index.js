#!/usr/bin/env node
"use strict";

/* ═══════════════════════════════════════════════════════════════
   DENTOVERSE — NOVA AI · KNOWLEDGE INDEX BUILDER (Phase 2)
   ───────────────────────────────────────────────────────────────
   Builds /assets/data/nova-knowledge.json from the live site.

   What it indexes (Phase 2 — keeps PDF extraction fully compatible):

     1. ── PDF page-level chunks (existing behavior, unchanged output
        schema) — extracted via `pdftotext` when present on PATH.
        Each chunk carries: resourceId, title, file, section, page,
        heading, text, sectionLabel, category. Used for precise
        PDF-aware question answering.

     2. ── Library-level "cards" for EVERY resource in data.js.
        PDFs still appear here (deduped), but so do videos, telegrams,
        links, notes, flashcards, quizzes, downloads, playlists and
        drive resources. Each card carries: id, title, type, section,
        sectionLabel, category, subcategory, description, tags, level,
        semester, status, file, link, headings (already cleaned text
        for non-PDF items), text (full text blob for matching).
        Used for site-wide search and "where is this?" answers.

     3. ── A small "studio" set of derived topic cards extracted from
        the rich descriptions in BIOMATERIALS2_META / BM2P_META /
        ORALBIO_META / STAGE2_GUIDE etc. — gives Nova authoritative
        domain-summary knowledge for the whole hub.

   Adding a new resource to data.js? Just run:
        node scripts/build-nova-index.js
   and commit the regenerated nova-knowledge.json. Nova picks it up
   on the next page load.

   Graceful fallback: if `pdftotext` is not installed, PDFs are
   skipped (with a warning) but cards are still produced. The base
   site keeps working either way.

   Designed & Produced by Abdel Rahman Teba © ®
   ═══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT, "assets/js/data.js");
const OUTPUT_FILE = path.join(ROOT, "assets/data/nova-knowledge.json");

/* ───────── site-data loader (sandboxed) ───────── */
function loadSiteData() {
  const context = { window: {}, localStorage: { getItem: () => null, setItem: () => {} } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(DATA_FILE, "utf8"), context, { filename: DATA_FILE });
  return context.window;
}

/* ───────── small text helpers ───────── */
function cleanText(value) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function pageHeading(text, fallback) {
  const line = text
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item.length >= 4 && item.length <= 100 && /[A-Za-z\u0600-\u06ff]/.test(item));
  return line || fallback;
}

function usefulText(text) {
  const letters = (text.match(/[A-Za-z\u0600-\u06ff]/g) || []).length;
  return letters >= 18;
}

function safeHas(sh, cmdName) {
  try { execFileSync("which", [sh]); return true; } catch (e) { return false; }
}
const pdftotextAvailable = (() => { try { execFileSync("which", ["pdftotext"], { stdio: "ignore" }); return true; } catch (e) { return false; } })();

/* ───────── PDF page chunking (Phase 1, unchanged) ───────── */
function buildPdfChunks(resource, section, relativeFile, absoluteFile) {
  const chunks = [];
  let pages = [];
  if (pdftotextAvailable && fs.existsSync(absoluteFile)) {
    let extracted = "";
    try {
      extracted = execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", absoluteFile, "-"], {
        encoding: "utf8", maxBuffer: 20 * 1024 * 1024,
      });
    } catch (error) {
      console.warn(`Unable to extract ${relativeFile}: ${error.message}`);
    }
    pages = extracted.split("\f");
  } else {
    pages = [resource.description || ""];
  }

  pages.forEach((pageText, pageIndex) => {
    const text = cleanText(pageText);
    if (!usefulText(text)) return;
    const page = pageIndex + 1;
    chunks.push({
      id: `${resource.id}:p${page}`,
      resourceId: resource.id,
      source: "pdf",
      title: resource.title,
      file: relativeFile,
      section: resource.section,
      sectionLabel: section.label || resource.section,
      category: resource.category || "",
      heading: pageHeading(text, resource.title),
      page,
      text,
      tags: resource.tags || [],
      level: resource.level || "",
      semester: resource.semester || "",
      type: resource.type,
      status: resource.status || "available"
    });
  });
  return { chunks, pages: Math.max(1, pages.length - (pages[pages.length - 1].trim() ? 0 : 1)) };
}

/* ───────── Card layer (works for ALL resource types) ───────── */
function buildCards(resources, sections) {
  const cards = [];
  resources.forEach(resource => {
    if (!resource || !resource.id) return;
    const section = sections.get(resource.section) || {};
    const text = cleanText([
      resource.title,
      resource.description,
      resource.category,
      resource.subcategory,
      resource.subtitle,
      Array.isArray(resource.tags) ? resource.tags.join(", ") : "",
      section.label,
      resource.lectureNumber ? "Lecture " + resource.lectureNumber : "",
      resource.semester, resource.level,
    ].filter(Boolean).join("\n"));
    cards.push({
      id: resource.id + ":card",
      resourceId: resource.id,
      source: "site",
      title: resource.title || "",
      type: resource.type || "link",
      section: resource.section || "",
      sectionLabel: section.label || resource.section || "",
      category: resource.category || "",
      subcategory: resource.subcategory || "",
      heading: resource.title || "",
      page: null,
      text,
      file: resource.file || "",
      link: resource.link || "",
      tags: resource.tags || [],
      level: resource.level || "",
      semester: resource.semester || "",
      status: resource.status || "available",
      featured: !!resource.featured,
      description: resource.description || "",
      lectureNumber: resource.lectureNumber || null
    });
  });
  return cards;
}

/* ───────── Studio cards: curated topic summaries ───────── */
function buildStudioCards(site) {
  const cards = [];

  function push(id, title, text, section, sectionLabel, category, tags) {
    cards.push({
      id, resourceId: id, source: "studio",
      title, type: "studio",
      section, sectionLabel, category,
      heading: title, page: null,
      text: cleanText(text),
      file: "", link: "", tags, level: "", semester: "", status: "available",
      featured: false, description: text.slice(0, 280)
    });
  }

  // Stage 2 guide — distilled
  if (site.STAGE2_GUIDE) {
    const sg = site.STAGE2_GUIDE;
    push("stage2-guide-overview", "Stage 2 Guide — Overview",
      [sg.intro, "Buy: " + (sg.buy || []).map(x => x.name + " (" + x.note + ")").join("; "),
       "Avoid: " + (sg.avoid || []).map(x => x.name + " (" + x.note + ")").join("; "),
       "Tips: " + (sg.tips || []).join("; ")].join("\n\n"),
      "stage2", "Stage 2 Guide", "Overview",
      ["stage2", "guide", "instruments", "buying"]);
    (sg.buy || []).forEach((item, i) => push("stage2-buy-" + i, "Recommended: " + item.name, item.note, "stage2", "Stage 2 Guide", "Buy", ["buy", item.name]));
    (sg.avoid || []).forEach((item, i) => push("stage2-avoid-" + i, "Avoid: " + item.name, item.note, "stage2", "Stage 2 Guide", "Avoid", ["avoid", item.name]));
    (sg.tips || []).forEach((tip, i) => push("stage2-tip-" + i, "Tip: " + tip.slice(0, 70), tip, "stage2", "Stage 2 Guide", "Tip", ["tip", "advice"]));
  }

  // Section meta cards
  (site.SECTIONS || []).forEach(s => {
    if (!s.id || !s.label || s.id === "home" || s.id === "search" || s.id === "favorites") return;
    push("section-" + s.id, s.label, s.tagline || s.label + " is one of the major academic areas in DentoVerse. Nova can answer questions, find PDFs, recommend resources and guide you through it.", s.id, s.label, "Overview", [s.id, "section", "overview"]);
  });

  // Course meta cards
  [
    ["BIOMATERIALS2_META", "biomaterials2", "Biomaterials 2"],
    ["BM2P_META", "bm2practical", "Biomaterials 2 · Practical"],
    ["ORALBIO_META", "oralbio", "Oral Biology"]
  ].forEach(([k, secId, label]) => {
    const meta = site[k];
    if (!meta) return;
    push("course-" + secId, meta.courseName || label,
      [meta.intro || "", "Course code: " + (meta.courseCode || ""), "Semester: " + (meta.semester || ""), "Year: " + (meta.year || "")].join("\n\n"),
      secId, label, "Course",
      ["course", secId, "overview"]);
  });

  // Group cards (category overviews)
  [
    ["BIOMATERIALS2_GROUPS", "biomaterials2", "Biomaterials 2"],
    ["BM2P_LECTURE_GROUPS", "bm2practical", "Biomaterials 2 · Practical"],
    ["BM2P_QUESTION_GROUPS", "bm2practical", "Biomaterials 2 · Practical · Question Bank"],
    ["ORALBIO_GROUPS", "oralbio", "Oral Biology"],
    ["PROTHESIS_GROUPS", "prothesis", "Stage 2 Prothesis"]
  ].forEach(([groupsKey, secId, secLabel]) => {
    (site[groupsKey] || []).forEach(g => {
      push("group-" + secId + "-" + g.key.replace(/\s+/g, "-").toLowerCase(),
        g.title, g.blurb, secId, secLabel, g.key,
        [secId, "category", g.key.toLowerCase()]);
    });
  });

  return cards;
}

/* ───────── main ───────── */
function main() {
  const site = loadSiteData();
  const sections = new Map((site.SECTIONS || []).map(s => [s.id, s]));
  const resources = Array.isArray(site.RESOURCES) ? site.RESOURCES : [];

  // 1. PDF chunks
  const pdfResources = new Map();
  resources.forEach(resource => {
    const src = resource.file || resource.link || "";
    if (!src || !/\.pdf(?:$|[?#])/i.test(src)) return;
    const cleanSrc = src.split(/[?#]/)[0];
    const existing = pdfResources.get(cleanSrc);
    if (!existing || (existing.section === "downloads" && resource.section !== "downloads")) {
      pdfResources.set(cleanSrc, resource);
    }
  });

  const pdfDocuments = [];
  const pdfChunks = [];
  [...pdfResources.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([rel, resource]) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      // don't error out for paths declared but not on disk
      console.warn(`Skipping missing PDF: ${rel}`);
      return;
    }
    const section = sections.get(resource.section) || {};
    const built = buildPdfChunks(resource, section, rel, abs);
    pdfDocuments.push({
      id: resource.id, title: resource.title, file: rel,
      section: resource.section, sectionLabel: section.label || resource.section,
      category: resource.category || "",
      subsection: resource.subcategory || "",
      description: resource.description || "",
      tags: resource.tags || [],
      level: resource.level || "",
      semester: resource.semester || "",
      pages: built.pages
    });
    built.chunks.forEach(c => pdfChunks.push(c));
  });

  // 2. Site cards (any resource)
  const siteCards = buildCards(resources, sections);

  // 3. Studio cards (curated topic summaries)
  const studioCards = buildStudioCards(site);

  // Merge chunks into a single searchable list — PDFs still come first
  // (high-precision grounding), then cards cover everything else.
  const allChunks = []
    .concat(pdfChunks)        // source === "pdf"
    .concat(siteCards)        // source === "site"
    .concat(studioCards);     // source === "studio"

  // Document roll-up
  const documents = pdfDocuments.map(d => d);

  // Build a stable docsHash so Nova can detect when the index changes.
  let hashSeed = "";
  try { hashSeed = JSON.stringify({
    docs: documents.map(d => ({ id: d.id, pages: d.pages })),
    totalChunks: pdfChunks.length,
    cards: siteCards.length,
    studio: studioCards.length
  }); } catch (e) {}
  const docsHash = crypto.createHash("sha1").update(hashSeed).digest("hex").slice(0, 12);

  const output = {
    version: 2,
    docsHash,
    indexedAt: new Date().toISOString(),
    stats: {
      documents: documents.length,
      pages: documents.reduce((s, d) => s + d.pages, 0),
      chunks: pdfChunks.length,
      cards: siteCards.length + studioCards.length,
      sources: { pdf: pdfChunks.length, site: siteCards.length, studio: studioCards.length },
      sections: (site.SECTIONS || []).length,
      resourcesIndexed: resources.length
    },
    documents,
    chunks: allChunks
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output));
  console.log(`Nova index v${output.version}: ${output.stats.documents} PDFs · ${output.stats.pages} pages · ${output.stats.chunks} PDF chunks · ${siteCards.length} site cards · ${studioCards.length} studio cards`);
  console.log(`docsHash: ${docsHash}  →  ${path.relative(ROOT, OUTPUT_FILE)} (${Math.round(fs.statSync(OUTPUT_FILE).size / 1024)} KB)`);
}

main();
