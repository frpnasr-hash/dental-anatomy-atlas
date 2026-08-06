#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT, "assets/js/data.js");
const OUTPUT_FILE = path.join(ROOT, "assets/data/nova-knowledge.json");

function loadSiteData() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(DATA_FILE, "utf8"), context, { filename: DATA_FILE });
  return context.window;
}

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

function main() {
  const site = loadSiteData();
  const sections = new Map((site.SECTIONS || []).map((section) => [section.id, section]));
  const resourcesByFile = new Map();

  (site.RESOURCES || []).forEach((resource) => {
    const source = resource.file || resource.link || "";
    if (!source || !/\.pdf(?:$|[?#])/i.test(source)) return;
    const cleanSource = source.split(/[?#]/)[0];
    const existing = resourcesByFile.get(cleanSource);
    if (!existing || (existing.section === "downloads" && resource.section !== "downloads")) {
      resourcesByFile.set(cleanSource, resource);
    }
  });

  const documents = [];
  const chunks = [];

  [...resourcesByFile.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([relativeFile, resource]) => {
    const absoluteFile = path.join(ROOT, relativeFile);
    if (!fs.existsSync(absoluteFile)) {
      console.warn(`Skipping missing PDF: ${relativeFile}`);
      return;
    }

    let extracted = "";
    try {
      extracted = execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", absoluteFile, "-"], {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      });
    } catch (error) {
      console.warn(`Unable to extract ${relativeFile}: ${error.message}`);
    }

    const pages = extracted.split("\f");
    const section = sections.get(resource.section) || {};
    const document = {
      id: resource.id,
      title: resource.title,
      file: relativeFile,
      section: resource.section,
      sectionLabel: section.label || resource.section,
      category: resource.category || "",
      subsection: resource.subsection || resource.subcategory || "",
      description: resource.description || "",
      tags: resource.tags || [],
      level: resource.level || "",
      semester: resource.semester || "",
      pages: Math.max(1, pages.length - (pages[pages.length - 1].trim() ? 0 : 1)),
    };
    documents.push(document);

    pages.forEach((pageText, pageIndex) => {
      const text = cleanText(pageText);
      if (!usefulText(text)) return;
      const page = pageIndex + 1;
      chunks.push({
        id: `${resource.id}:p${page}`,
        resourceId: resource.id,
        title: resource.title,
        file: relativeFile,
        section: resource.section,
        sectionLabel: section.label || resource.section,
        category: resource.category || "",
        heading: pageHeading(text, resource.title),
        page,
        text,
      });
    });
  });

  const output = {
    version: 1,
    stats: {
      documents: documents.length,
      chunks: chunks.length,
      pages: documents.reduce((sum, item) => sum + item.pages, 0),
    },
    documents,
    chunks,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output));
  console.log(`Nova index: ${output.stats.documents} PDFs, ${output.stats.pages} pages, ${output.stats.chunks} searchable chunks`);
  console.log(`Wrote ${path.relative(ROOT, OUTPUT_FILE)} (${Math.round(fs.statSync(OUTPUT_FILE).size / 1024)} KB)`);
}

main();
