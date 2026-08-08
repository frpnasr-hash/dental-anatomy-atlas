#!/usr/bin/env node
"use strict";

/* ═══════════════════════════════════════════════════════════════
   DENTOVERSE — NOVA AI · CONTINUOUS INDEX WATCHER
   ───────────────────────────────────────────────────────────────
   Detects newly added PDFs, lectures, videos, resource cards and
   approved external sources, then re-indexes Nova's knowledge base
   WITHOUT manual intervention. Safe — never mutates source code,
   only refreshes the generated /assets/data/nova-knowledge.json
   file.

   This script is designed to be:
     • Run as a **scheduled cron** from Vercel's free cron jobs
       config — see DEPLOYMENT below — once per day.
     • Run **manually** as `node scripts/nova-watch.js` whenever new
       files are uploaded.
     • Run as a **post-install / post-deploy hook** to keep the
       knowledge base in sync with the latest site content.

   It:
     1. Reads assets/js/data.js for the resource catalog.
     2. Walks assets/media/pdf for any PDF file (new or updated).
        New files cause a re-index even if their resource id exists.
        Removed files are tolerated (just dropped from the index).
     3. Walks assets/data/nova-sources.json to pick up newly
        approved external sources.
     4. Re-runs scripts/build-nova-index.js.
     5. Writes a tiny DEPLOYMENT_STATUS.json for transparency.

   DEPLOYMENT
     ─────────
     Vercel cron (optional) — add a "vercel.json" cron entry or use
     GitHub Actions. This script may also be invoked locally from
     `scripts/refresh-knowledge.sh`.

   Designed & Produced by Abdel Rahman Teba © ®
   ═══════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const KNOWLEDGE_FILE = path.join(ROOT, "assets/data/nova-knowledge.json");
const SOURCES_FILE = path.join(ROOT, "assets/data/nova-sources.json");
const DATA_FILE = path.join(ROOT, "assets/js/data.js");
const PDF_DIR = path.join(ROOT, "assets/media/pdf");
const STATE_FILE = path.join(ROOT, "scripts/.nova-watch-state.json");
const REPORTS_DIR = path.join(ROOT, "scripts/reports");

function safeReadJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return fallback; } }
function safeWriteJson(file, value) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2)); return true; } catch (e) { return false; } }
function safeRead(file) { try { return fs.readFileSync(file, "utf8"); } catch (e) { return ""; } }

function fileHash(file) {
  try { const buf = fs.readFileSync(file); return crypto.createHash("sha1").update(buf).digest("hex").slice(0, 16); } catch (e) { return null; }
}

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  items.forEach(item => {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...walk(full));
    else out.push(full);
  });
  return out;
}

function snapshot() {
  const state = safeReadJson(STATE_FILE, { hashes: {}, lastRun: 0, lastReport: null });
  const snap = { ts: Date.now(), files: {}, sourcesHash: fileHash(SOURCES_FILE) };

  // Hash every PDF in the media tree
  const pdfs = walk(PDF_DIR).filter(p => /\.pdf$/i.test(p));
  pdfs.forEach(p => { snap.files[path.relative(ROOT, p)] = fileHash(p); });

  // Also track data.js + build script for completeness.
  snap.files[path.relative(ROOT, DATA_FILE)] = fileHash(DATA_FILE);
  snap.files[path.relative(ROOT, SOURCES_FILE)] = fileHash(SOURCES_FILE);

  return { state, snap };
}

function diff(state, snap) {
  const added = [], removed = [], changed = [];
  const before = state.hashes || {};
  const after = snap.files || {};

  Object.keys(after).forEach(rel => {
    if (!before[rel]) added.push(rel);
    else if (before[rel] !== after[rel]) changed.push(rel);
  });
  Object.keys(before).forEach(rel => { if (!after[rel]) removed.push(rel); });

  const sourcesChanged = (state.sourcesHash || null) !== snap.sourcesHash;
  return { added, removed, changed, sourcesChanged };
}

function rebuild() {
  console.log("[nova-watch] Rebuilding index …");
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts", "build-nova-index.js")], { stdio: "inherit", cwd: ROOT });
  if (r.status !== 0) { console.error("[nova-watch] rebuild failed with exit code", r.status); return false; }
  return true;
}

function writeReport(report) {
  try {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    const outFile = path.join(REPORTS_DIR, "nova-watch-latest.json");
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
    // also keep a short human-readable summary
    const summaryFile = path.join(REPORTS_DIR, "nova-watch-latest.txt");
    const lines = [
      `Nova AI watch run at ${new Date(report.ts).toISOString()}`,
      `Trigger: ${report.trigger}`,
      `Files added:   ${report.changes.added.length}`,
      `Files removed: ${report.changes.removed.length}`,
      `Files changed: ${report.changes.changed.length}`,
      `Sources list changed: ${report.changes.sourcesChanged ? "yes" : "no"}`,
      `Rebuilt: ${report.rebuilt ? "yes" : "no"}`,
      ""
    ];
    if (report.changes.added.length)   { lines.push("Added:"); report.changes.added.forEach(p => lines.push("  + " + p)); lines.push(""); }
    if (report.changes.removed.length) { lines.push("Removed:"); report.changes.removed.forEach(p => lines.push("  - " + p)); lines.push(""); }
    if (report.changes.changed.length) { lines.push("Changed:"); report.changes.changed.forEach(p => lines.push("  ~ " + p)); lines.push(""); }
    fs.writeFileSync(summaryFile, lines.join("\n"));
  } catch (e) { /* best-effort report */ }
}

function main() {
  const trigger = process.argv[2] || "watch";
  console.log(`[nova-watch] Trigger=${trigger}`);

  const { state, snap } = snapshot();
  const changes = diff(state, snap);

  const needsRebuild = !!(state.lastRun === 0)
    || changes.added.length || changes.removed.length || changes.changed.length
    || changes.sourcesChanged;

  let rebuilt = false;
  if (needsRebuild) { rebuilt = rebuild(); }
  else { console.log("[nova-watch] No changes detected — knowledge index is already up to date."); }

  // Persist updated state.
  const newState = { hashes: snap.files, sourcesHash: snap.sourcesHash, lastRun: snap.ts, lastResult: { rebuilt, trigger, added: changes.added.length, removed: changes.removed.length, changed: changes.changed.length, sourcesChanged: changes.sourcesChanged } };
  safeWriteJson(STATE_FILE, newState);

  const report = { ts: snap.ts, trigger, changes, rebuilt };
  writeReport(report);

  console.log(`[nova-watch] Done. +${changes.added.length} -${changes.removed.length} ~${changes.changed.length} (rebuilt=${rebuilt})`);
}

main();
