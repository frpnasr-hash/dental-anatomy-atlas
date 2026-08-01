/* ═══════════════════════════════════════════════════════════════
   DENTOVERSE — CENTRAL DATA LAYER
   Academic Resource Hub · Data-driven configuration
   Designed & Produced by Abdel Rahman Teba © ®
   ───────────────────────────────────────────────────────────────
   HOW TO ADD CONTENT LATER
   -----------------------------------------------------------------
   Every resource lives inside the RESOURCES array below. To add a
   new PDF, video, link, note, quiz, flashcard deck or download, just
   push a new object with these fields:

     {
       id:          "unique-string",           // required, unique
       title:       "Human readable title",     // required
       type:        "pdf" | "video" | "telegram" | "link"
                    | "note" | "flashcard" | "quiz" | "download",
       section:     "anatomy" | "pdf" | "video" | "telegram"
                    | "links" | "notes" | "flashcards" | "quizzes"
                    | "downloads",              // which hub section it belongs to
       category:    "Operative" | "Prosthodontics" | ...,  // free text group
       description: "Short summary shown on the card",
       link:        "https://...",              // destination (or "" if coming soon)
       thumbnail:   "assets/img/xyz.jpg" | "",  // optional image
       tags:        ["tag1", "tag2"],           // for filtering / search
       status:      "available" | "coming-soon",
       featured:    true | false,               // show on home featured row
       level:       "Level 1" | "Level 2" | ""  // optional academic level
     }

   Nothing else in the codebase needs to change. The grid, search,
   filters, favorites and section pages all read from this array.
   ═══════════════════════════════════════════════════════════════ */

/* ───────── SITE CONFIG ───────── */
const SITE = {
  name: "DentoVerse",
  tagline: "The All-In-One Dental Academic Hub",
  author: "Abdel Rahman Teba",
  year: 2026,
  university: "Al Ryada University — Faculty of Oral & Dental Medicine",
  contact: {
    telegramHelp1: "https://t.me/U_s_ef",
    telegramHelp2: "https://t.me/yousefabdelhamed0",
    telegramGroup: "https://t.me/+ZTCS_yHcAWkwNjA0",
    bot1: "https://t.me/RST2727_BOT",
    bot2: "https://t.me/RST_Dental_Bot"
  }
};

/* ───────── SECTION DEFINITIONS ─────────
   These build the navigation, the home category grid and the
   individual section pages. Add a section here and it appears
   everywhere automatically. */
const SECTIONS = [
  { id: "home",       label: "Home",              icon: "🏠", tagline: "Your gateway to the DentoVerse", hidden: false, external: null },
  { id: "anatomy",    label: "Dental Anatomy",    icon: "🦷", tagline: "Interactive cosmic tooth atlas — all 32 teeth", external: "dental_anatomy/index.html" },
  { id: "pdf",        label: "PDF Library",       icon: "📚", tagline: "Lecture notes, sheets & reference books" },
  { id: "video",      label: "Video Library",     icon: "🎬", tagline: "Recorded lectures & clinical demonstrations" },
  { id: "telegram",   label: "Telegram Hub",      icon: "✈️", tagline: "Channels, groups & smart bots" },
  { id: "links",      label: "Useful Links",      icon: "🔗", tagline: "Curated external academic resources" },
  { id: "notes",      label: "Study Notes",       icon: "📝", tagline: "Summaries, high-yield points & mnemonics" },
  { id: "flashcards", label: "Flashcards",        icon: "🃏", tagline: "Active-recall decks for fast revision" },
  { id: "quizzes",    label: "Quizzes",           icon: "🧠", tagline: "Self-assessment & exam practice" },
  { id: "downloads",  label: "Downloads",         icon: "⬇️", tagline: "Instrument lists, templates & files" },
  { id: "favorites",  label: "Saved",             icon: "⭐", tagline: "Your bookmarked resources" },
  { id: "search",     label: "Search",            icon: "🔍", tagline: "Find anything across the hub" },
  { id: "about",      label: "About",             icon: "🛰️", tagline: "About the project & contact" }
];

/* ───────── CATEGORY SHELLS ─────────
   Academic categories used across sections. Ready to receive
   hundreds of resources later. */
const CATEGORIES = [
  "Dental Anatomy",
  "Operative Dentistry",
  "Removable Prosthodontics",
  "Fixed Prosthodontics",
  "Oral Biology & Histology",
  "Oral Physiology",
  "Dental Materials",
  "Occlusion",
  "General Chemistry",
  "Instrument Lists",
  "General"
];

/* ───────── RESOURCES ─────────
   The single source of truth. Extend freely. */
const RESOURCES = [

  /* ══════════ TELEGRAM HUB (LIVE NOW) ══════════ */
  {
    id: "tg-group-main",
    title: "Main Study Group",
    type: "telegram",
    section: "telegram",
    category: "General",
    description: "The primary Telegram community for announcements, resources and discussion. Join to stay in the loop with the whole batch.",
    link: SITE.contact.telegramGroup,
    thumbnail: "",
    tags: ["group", "community", "announcements"],
    status: "available",
    featured: true,
    level: ""
  },
  {
    id: "tg-bot-1",
    title: "RST Dental Bot",
    type: "telegram",
    section: "telegram",
    category: "General",
    description: "Smart assistant bot for quick resource access and study help. Tap start inside Telegram to explore its commands.",
    link: SITE.contact.bot1,
    thumbnail: "",
    tags: ["bot", "assistant", "automation"],
    status: "available",
    featured: true,
    level: ""
  },
  {
    id: "tg-bot-2",
    title: "RST Dental Bot II",
    type: "telegram",
    section: "telegram",
    category: "General",
    description: "Secondary helper bot with additional resource shortcuts and study tools for the faculty.",
    link: SITE.contact.bot2,
    thumbnail: "",
    tags: ["bot", "assistant", "tools"],
    status: "available",
    featured: false,
    level: ""
  },
  {
    id: "tg-help-1",
    title: "Support — @U_s_ef",
    type: "telegram",
    section: "telegram",
    category: "General",
    description: "Need help? Contact the admin directly on Telegram for support, requests and technical questions.",
    link: SITE.contact.telegramHelp1,
    thumbnail: "",
    tags: ["support", "help", "contact"],
    status: "available",
    featured: false,
    level: ""
  },
  {
    id: "tg-help-2",
    title: "Support — @yousefabdelhamed0",
    type: "telegram",
    section: "telegram",
    category: "General",
    description: "Alternative support contact on Telegram for help, feedback and resource submissions.",
    link: SITE.contact.telegramHelp2,
    thumbnail: "",
    tags: ["support", "help", "contact"],
    status: "available",
    featured: false,
    level: ""
  },

  /* ══════════ USEFUL LINKS (LIVE NOW) ══════════ */
  {
    id: "link-drive-main",
    title: "Shared Google Drive Library",
    type: "link",
    section: "links",
    category: "General",
    description: "The central Google Drive folder containing shared lectures, sheets and reference material for the batch. Bookmarked for one-tap access.",
    link: "https://drive.google.com/drive/mobile/folders/1zimhx-1yLMwKl1WAI_cqUYlEra8Y0h4T",
    thumbnail: "",
    tags: ["drive", "cloud", "library", "shared"],
    status: "available",
    featured: true,
    level: ""
  },
  {
    id: "link-kenhub",
    title: "Kenhub — Dental Anatomy",
    type: "link",
    section: "links",
    category: "Dental Anatomy",
    description: "Illustrated anatomy library covering incisors, canines, premolars and molars with clear diagrams.",
    link: "https://www.kenhub.com/en/library/anatomy/incisors-structure-and-function",
    thumbnail: "",
    tags: ["anatomy", "reference", "external"],
    status: "available",
    featured: false,
    level: ""
  },
  {
    id: "link-anatomyapp",
    title: "Anatomy.app — Teeth",
    type: "link",
    section: "links",
    category: "Dental Anatomy",
    description: "Interactive 3D anatomy platform with detailed articles on each maxillary and mandibular tooth.",
    link: "https://anatomy.app/article/incisors/maxillary-central-incisor",
    thumbnail: "",
    tags: ["anatomy", "3d", "external"],
    status: "available",
    featured: false,
    level: ""
  },
  {
    id: "link-pocketdentistry",
    title: "Pocket Dentistry",
    type: "link",
    section: "links",
    category: "Dental Anatomy",
    description: "Free online dental textbook chapters covering permanent dentition and clinical topics.",
    link: "https://pocketdentistry.com/6-the-permanent-maxillary-incisors/",
    thumbnail: "",
    tags: ["textbook", "reference", "external"],
    status: "available",
    featured: false,
    level: ""
  },
  {
    id: "link-sketchfab",
    title: "Sketchfab — 3D Dental Models",
    type: "link",
    section: "links",
    category: "Dental Anatomy",
    description: "A curated collection of interactive 3D dental anatomy models you can rotate and inspect.",
    link: "https://sketchfab.com/Ebers/collections/dental-anatomy-f4398642fbf944689a23c3a10647bfb7",
    thumbnail: "",
    tags: ["3d", "models", "external"],
    status: "available",
    featured: false,
    level: ""
  },

  /* ══════════ DENTAL ANATOMY MODULE (LIVE) ══════════ */
  {
    id: "anatomy-atlas",
    title: "Interactive Tooth Atlas",
    type: "link",
    section: "anatomy",
    category: "Dental Anatomy",
    description: "Explore all 32 permanent teeth with full chronology, surfaces, numbering systems and clinical notes in the cosmic atlas.",
    link: "dental_anatomy/index.html",
    thumbnail: "",
    tags: ["atlas", "teeth", "interactive", "anatomy"],
    status: "available",
    featured: true,
    level: "Level 1"
  },

  /* ══════════ DOWNLOADS — INSTRUMENT LISTS (from uploaded PDFs) ══════════
     These describe the official instrument/material lists. Attach the
     real PDF/Drive link later by filling the `link` field & flipping
     status to "available". */
  {
    id: "dl-lv1-anatomy-instruments",
    title: "Level 1 — Dental Anatomy Instruments",
    type: "download",
    section: "downloads",
    category: "Instrument Lists",
    description: "Required kit: Lab coat, wax knife (small recommended), carver, blue wax blocks, napkin, graph paper. Full checklist for the Dental Anatomy lab.",
    link: "",
    thumbnail: "",
    tags: ["instruments", "level 1", "anatomy", "checklist"],
    status: "coming-soon",
    featured: true,
    level: "Level 1"
  },
  {
    id: "dl-lv1-chemistry-instruments",
    title: "Level 1 — Chemistry Lab Requirements",
    type: "download",
    section: "downloads",
    category: "General Chemistry",
    description: "Required kit: 5 test tubes, holder, rack, eye goggles, gloves. Complete checklist for the general chemistry lab sessions.",
    link: "",
    thumbnail: "",
    tags: ["instruments", "level 1", "chemistry", "checklist"],
    status: "coming-soon",
    featured: false,
    level: "Level 1"
  },
  {
    id: "dl-lv2-removable-instruments",
    title: "Level 2 — Removable Prosthodontics Kit",
    type: "download",
    section: "downloads",
    category: "Removable Prosthodontics",
    description: "Official illustrated reference kit for Removable Prosthodontics & Occlusion: waxes, casting materials, PKT carving instruments, mean-value articulator and more.",
    link: "",
    thumbnail: "",
    tags: ["instruments", "level 2", "prosthodontics", "occlusion"],
    status: "coming-soon",
    featured: true,
    level: "Level 2"
  },
  {
    id: "dl-operative-instruments",
    title: "Operative Dentistry Instruments",
    type: "download",
    section: "downloads",
    category: "Operative Dentistry",
    description: "Burs, handpieces, liners, glass slab, matrix, mirror/probe/tweezer set and disposable items list for the operative course.",
    link: "",
    thumbnail: "",
    tags: ["instruments", "operative", "burs", "checklist"],
    status: "coming-soon",
    featured: false,
    level: "Level 2"
  },
  {
    id: "dl-fixed-instruments",
    title: "Fixed Prosthodontics Tech-I Kit",
    type: "download",
    section: "downloads",
    category: "Fixed Prosthodontics",
    description: "Diamond stones (colour coded), handpieces and materials list for the Fixed Prosthodontics Tech-I course (Fall 2025/2026).",
    link: "",
    thumbnail: "",
    tags: ["instruments", "fixed", "prosthodontics", "checklist"],
    status: "coming-soon",
    featured: false,
    level: "Level 2"
  },

  /* ══════════ PDF LIBRARY (placeholders — add links later) ══════════ */
  {
    id: "pdf-anatomy-lectures",
    title: "Dental Anatomy — Lecture Notes",
    type: "pdf",
    section: "pdf",
    category: "Dental Anatomy",
    description: "Full lecture note set for the Dental Anatomy course. PDF will be attached here soon.",
    link: "",
    thumbnail: "",
    tags: ["anatomy", "lectures", "notes"],
    status: "coming-soon",
    featured: false,
    level: "Level 1"
  },
  {
    id: "pdf-prostho-sheets",
    title: "Removable Prosthodontics — Sheets",
    type: "pdf",
    section: "pdf",
    category: "Removable Prosthodontics",
    description: "Summarised sheets for the removable prosthodontics & occlusion module. Coming soon.",
    link: "",
    thumbnail: "",
    tags: ["prosthodontics", "sheets"],
    status: "coming-soon",
    featured: false,
    level: "Level 2"
  },
  {
    id: "pdf-materials",
    title: "Dental Materials — Reference",
    type: "pdf",
    section: "pdf",
    category: "Dental Materials",
    description: "Reference material covering waxes, casting materials and impression materials. Coming soon.",
    link: "",
    thumbnail: "",
    tags: ["materials", "reference"],
    status: "coming-soon",
    featured: false,
    level: ""
  },

  /* ══════════ VIDEO LIBRARY (placeholders) ══════════ */
  {
    id: "vid-carving",
    title: "Wax Carving Technique",
    type: "video",
    section: "video",
    category: "Dental Anatomy",
    description: "Step-by-step demonstration of tooth wax carving. Video will be embedded here soon.",
    link: "",
    thumbnail: "",
    tags: ["carving", "technique", "demo"],
    status: "coming-soon",
    featured: false,
    level: "Level 1"
  },
  {
    id: "vid-articulator",
    title: "Mounting on the Articulator",
    type: "video",
    section: "video",
    category: "Occlusion",
    description: "Clinical demonstration of mounting casts on a mean-value articulator. Coming soon.",
    link: "",
    thumbnail: "",
    tags: ["articulator", "occlusion", "demo"],
    status: "coming-soon",
    featured: false,
    level: "Level 2"
  },

  /* ══════════ STUDY NOTES (placeholders) ══════════ */
  {
    id: "note-tooth-morphology",
    title: "Tooth Morphology — High-Yield",
    type: "note",
    section: "notes",
    category: "Dental Anatomy",
    description: "Condensed high-yield summary of tooth morphology and identification cues. Content coming soon.",
    link: "",
    thumbnail: "",
    tags: ["morphology", "high-yield", "summary"],
    status: "coming-soon",
    featured: false,
    level: "Level 1"
  },
  {
    id: "note-numbering",
    title: "Numbering Systems Cheat-Sheet",
    type: "note",
    section: "notes",
    category: "Dental Anatomy",
    description: "Universal, FDI and Palmer notation compared side by side. Content coming soon.",
    link: "",
    thumbnail: "",
    tags: ["numbering", "cheatsheet"],
    status: "coming-soon",
    featured: false,
    level: "Level 1"
  },

  /* ══════════ FLASHCARDS (placeholders) ══════════ */
  {
    id: "fc-anatomy-deck",
    title: "Dental Anatomy Deck",
    type: "flashcard",
    section: "flashcards",
    category: "Dental Anatomy",
    description: "Active-recall flashcard deck for tooth identification and features. Deck will be added soon.",
    link: "",
    thumbnail: "",
    tags: ["flashcards", "recall", "anatomy"],
    status: "coming-soon",
    featured: false,
    level: "Level 1"
  },
  {
    id: "fc-materials-deck",
    title: "Dental Materials Deck",
    type: "flashcard",
    section: "flashcards",
    category: "Dental Materials",
    description: "Flashcards covering key dental materials properties and uses. Coming soon.",
    link: "",
    thumbnail: "",
    tags: ["flashcards", "materials"],
    status: "coming-soon",
    featured: false,
    level: ""
  },

  /* ══════════ QUIZZES (placeholders) ══════════ */
  {
    id: "quiz-anatomy-mcq",
    title: "Dental Anatomy MCQ",
    type: "quiz",
    section: "quizzes",
    category: "Dental Anatomy",
    description: "Self-assessment multiple-choice quiz on permanent dentition. Interactive quiz coming soon.",
    link: "",
    thumbnail: "",
    tags: ["quiz", "mcq", "anatomy"],
    status: "coming-soon",
    featured: false,
    level: "Level 1"
  },
  {
    id: "quiz-prostho-mcq",
    title: "Prosthodontics MCQ",
    type: "quiz",
    section: "quizzes",
    category: "Removable Prosthodontics",
    description: "Exam-style practice questions for removable prosthodontics. Coming soon.",
    link: "",
    thumbnail: "",
    tags: ["quiz", "mcq", "prosthodontics"],
    status: "coming-soon",
    featured: false,
    level: "Level 2"
  }
];

/* ───────── DERIVED HELPERS ─────────
   Small pure helpers used by the UI layer. */
const DataAPI = {
  all() { return RESOURCES.slice(); },
  bySection(sec) { return RESOURCES.filter(r => r.section === sec); },
  byId(id) { return RESOURCES.find(r => r.id === id); },
  featured() { return RESOURCES.filter(r => r.featured); },
  categories(sec) {
    const set = new Set(RESOURCES.filter(r => !sec || r.section === sec).map(r => r.category));
    return Array.from(set).sort();
  },
  types(sec) {
    const set = new Set(RESOURCES.filter(r => !sec || r.section === sec).map(r => r.type));
    return Array.from(set).sort();
  },
  tags(sec) {
    const set = new Set();
    RESOURCES.filter(r => !sec || r.section === sec).forEach(r => (r.tags || []).forEach(t => set.add(t)));
    return Array.from(set).sort();
  },
  counts() {
    const c = {};
    SECTIONS.forEach(s => { c[s.id] = 0; });
    RESOURCES.forEach(r => { c[r.section] = (c[r.section] || 0) + 1; });
    return c;
  }
};

/* Expose to window for non-module usage */
window.SITE = SITE;
window.SECTIONS = SECTIONS;
window.CATEGORIES = CATEGORIES;
window.RESOURCES = RESOURCES;
window.DataAPI = DataAPI;
