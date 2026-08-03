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
                    | "note" | "flashcard" | "quiz" | "download"
                    | "playlist" | "drive",     // media / resource kind
       section:     "anatomy" | "pdf" | "video" | "telegram"
                    | "links" | "notes" | "flashcards" | "quizzes"
                    | "downloads" | "prothesis",// which hub section it belongs to
       category:    "Operative" | "Prosthodontics" | ...,  // free text group
       subcategory: "Practical Prothesis Demonstrations" | ...,
                    // the exact group a resource is filed under inside a
                    // section (used to build the categorised Stage 2 area)
       description: "Short summary shown on the card",
       link:        "https://...",              // external destination ("" if pending)
       file:        "assets/media/video/xyz.mp4",// local media file ("" if none)
       thumbnail:   "assets/img/xyz.jpg" | "",  // optional image
       tags:        ["tag1", "tag2"],           // for filtering / search
       status:      "available" | "coming-soon" | "pending-review",
       featured:    true | false,               // show on home featured row
       level:       "Level 1" | "Level 2" | ""  // optional academic level
     }

   Nothing else in the codebase needs to change. The grid, search,
   filters, favorites and section pages all read from this array.
   ═══════════════════════════════════════════════════════════════ */

/* ───────── SITE CONFIG ─────────
   Contact details below belong to the site owner only. Do not add any
   third-party contact information here. */
const SITE = {
  name: "DentoVerse",
  tagline: "The All-In-One Dental Academic Hub",
  author: "Abdel Rahman Teba",
  year: 2026,
  contact: {
    telegramUser: "@Bfhve357",
    telegram:     "https://t.me/Bfhve357",
    phoneDisplay: "+20 109 187 4291",
    phone:        "+201091874291",
    whatsapp:     "https://wa.me/201091874291"
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
  { id: "stage2",     label: "Stage 2 Guide",      icon: "🎓", tagline: "Second-year instruments: what to buy, what to skip & smart tips" },
  { id: "prothesis",  label: "Stage 2 Prothesis",  icon: "🪥", tagline: "Practical Prothesis videos, Drive resources, playlists & student guidance — neatly grouped" },
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
  "Study Skills",
  "General"
];

/* ───────── STAGE 2 GUIDANCE DATA ─────────
   Structured, editable guidance for second-year dentistry students.
   Add/remove items freely — the Stage 2 page renders straight from here. */
const STAGE2_GUIDE = {
  intro: "A practical, student-tested guide for second-year (Stage 2) dentistry. It focuses on smart spending: which instruments are genuinely worth buying, which ones to skip, plus usage tips and study support based on the official course kits.",
  buy: [
    { name: "PKT wax carving kit", note: "Core of removable prosthodontics practicals — used constantly for wax-up. Buy a decent set once; it lasts for years." },
    { name: "Wax knife (small size)", note: "A small wax knife gives far better control for fine trimming than a large one. Highly recommended for anatomy carving." },
    { name: "Wax carver", note: "Essential for shaping and detailing wax. A comfortable handle matters more than a fancy brand." },
    { name: "Mean-value articulator", note: "Needed for occlusion mounting exercises. A standard mean-value model is enough at this stage." },
    { name: "Blue / inlay modelling wax", note: "You will go through a lot of it — buy in reasonable quantity from the start." },
    { name: "Mirror, probe, tweezer, periodontal probe", note: "The basic diagnostic set. Buy quality stainless — cheap ones rust and bend quickly." },
    { name: "Lab coat & basic PPE (gloves, mask, napkins)", note: "Mandatory for every lab. Stock disposables in bulk to save money over the term." }
  ],
  avoid: [
    { name: "Expensive premium-brand instruments early on", note: "For a first-year kit, mid-range instruments perform the same in practicals. Save premium spending for clinical years." },
    { name: "Oversized wax knives", note: "A large wax knife is harder to control for anatomy carving — a small size is the recommended choice." },
    { name: "Full pre-made 'complete' kits with filler items", note: "Big bundles often pad the price with tools you rarely use. Buy the required list, add extras only when a course actually needs them." },
    { name: "Buying duplicate consumables you already share", note: "Some casts, stones and disposables are shared or provided — confirm the required list before double-buying." }
  ],
  tips: [
    "Match every purchase against the official required instrument list before paying — bring the list when you shop.",
    "Label your instruments (tape / engraving) — lab kits look identical and get mixed up fast.",
    "Keep waxes away from heat and direct sun so they don't deform before class.",
    "Sharpen and dry metal instruments after each session to prevent rust.",
    "Group-buy consumables with classmates to lower the per-student price.",
    "Ask a senior which optional items are actually used before buying the 'recommended/additional' extras."
  ]
};

/* ───────── STAGE 2 PROTHESIS AREA — GROUP DEFINITIONS ─────────
   The Stage 2 Prothesis / Practical Dentistry area is rendered as a set
   of clearly ordered, categorised groups. Every resource whose
   `section` is "prothesis" is placed into ONE of the groups below by
   matching its `subcategory` field. To add a brand-new group later,
   just add an object here and start tagging resources with its `key`.
   Nothing else needs to change — empty groups render a polished
   "Coming Soon" placeholder automatically. */
const PROTHESIS_GROUPS = [
  {
    key: "Practical Prothesis Demonstrations",
    icon: "🎬",
    title: "Practical Prothesis Videos",
    blurb: "Hands-on removable prosthesis demonstrations recorded in the lab — wax-up, record bases and denture-base materials."
  },
  {
    key: "Stage 2 Student Guidance",
    icon: "🎓",
    title: "Stage 2 Student Guidance",
    blurb: "Orientation and step-by-step overviews for students moving into Stage 2 Dentistry."
  },
  {
    key: "Drive Video Resources",
    icon: "📂",
    title: "Drive Resources",
    blurb: "Shared Google Drive videos and files curated for Stage 2 prosthesis learning."
  },
  {
    key: "Playlist Resources",
    icon: "▶️",
    title: "YouTube Playlists",
    blurb: "Curated video playlists that guide you through Stage 2 Dentistry topics."
  },
  {
    key: "General Practical Dentistry Support",
    icon: "🧭",
    title: "Study Support",
    blurb: "Extra notes, tips and support material for practical Stage 2 dentistry."
  },
  {
    key: "Pending Review",
    icon: "🕵️",
    title: "Coming Soon / Pending Review",
    blurb: "Resources being verified and organised. They will move into the right group once reviewed."
  }
];

/* ───────── RESOURCES ─────────
   The single source of truth. Extend freely. */
const RESOURCES = [

  /* ══════════ STAGE 2 PROTHESIS AREA (LIVE NOW) ══════════
     Data-driven, categorised resources for the practical Prothesis /
     Stage 2 dentistry hub. Each item is filed into a PROTHESIS_GROUPS
     group via its `subcategory`. Add more videos, Drive links,
     playlists, PDFs and notes here freely — the grouped area rebuilds
     itself automatically. */

  /* ── Practical Prothesis Videos (uploaded local media) ── */
  {
    id: "pro-vid-waxup-workflow",
    title: "Complete Prosthesis Wax-Up Workflow",
    type: "video",
    section: "prothesis",
    category: "Removable Prosthodontics",
    subcategory: "Practical Prothesis Demonstrations",
    description: "A full lab walkthrough of the removable prosthesis wax-up: preparing the wax, using carving tools and the micromotor, and shaping the work step by step.",
    link: "",
    file: "assets/media/video/prothesis-complete-waxup-workflow.mp4",
    thumbnail: "assets/media/thumb/prothesis-complete-waxup-workflow.jpg",
    tags: ["prothesis", "wax-up", "removable", "practical", "demo", "stage 2"],
    status: "available",
    featured: true,
    level: "Level 2"
  },
  {
    id: "pro-vid-wax-record-base",
    title: "Wax Record Base & Occlusion Rim — Practical",
    type: "video",
    section: "prothesis",
    category: "Removable Prosthodontics",
    subcategory: "Practical Prothesis Demonstrations",
    description: "Hands-on demonstration of adapting pink wax on the cast to build a record base and occlusion rim on the glass slab.",
    link: "",
    file: "assets/media/video/prothesis-wax-record-base-rim.mp4",
    thumbnail: "assets/media/thumb/prothesis-wax-record-base-rim.jpg",
    tags: ["prothesis", "record base", "wax", "occlusion rim", "practical"],
    status: "available",
    featured: false,
    level: "Level 2"
  },
  {
    id: "pro-vid-acrylic-mixing",
    title: "Denture Base Acrylic — Mixing Demonstration",
    type: "video",
    section: "prothesis",
    category: "Dental Materials",
    subcategory: "Practical Prothesis Demonstrations",
    description: "Short practical clip showing how to mix denture-base acrylic (powder and liquid) to the right consistency for a removable prosthesis.",
    link: "",
    file: "assets/media/video/prothesis-denture-base-acrylic-mixing.mp4",
    thumbnail: "assets/media/thumb/prothesis-denture-base-acrylic-mixing.jpg",
    tags: ["prothesis", "acrylic", "materials", "mixing", "denture base"],
    status: "available",
    featured: false,
    level: "Level 2"
  },

  /* ── Stage 2 Student Guidance (uploaded local media) ── */
  {
    id: "pro-vid-clinical-lab-steps",
    title: "Prosthesis Clinical & Laboratory Steps — Overview",
    type: "video",
    section: "prothesis",
    category: "Removable Prosthodontics",
    subcategory: "Stage 2 Student Guidance",
    description: "A clear illustrated chart video mapping the clinical steps against the laboratory steps of a removable prosthesis — a great orientation for new Stage 2 students.",
    link: "",
    file: "assets/media/video/stage2-prosthesis-clinical-lab-steps.mp4",
    thumbnail: "assets/media/thumb/stage2-prosthesis-clinical-lab-steps.jpg",
    tags: ["prothesis", "stage 2", "guidance", "clinical steps", "lab steps", "overview"],
    status: "available",
    featured: true,
    level: "Level 2"
  },

  /* ── Drive Resources (external Google Drive) ── */
  {
    id: "pro-drive-stage2-move",
    title: "Moving Up to Stage 2 Dentistry — Drive Video",
    type: "drive",
    section: "prothesis",
    category: "Study Skills",
    subcategory: "Drive Video Resources",
    description: "A Google Drive video about students progressing into Stage 2 Dentistry — what to expect and how to prepare for the practical prosthesis year.",
    link: "https://drive.google.com/file/d/10EjsixlZoS1hx5c7oXwiB10tDSptLh3a/view?usp=drivesdk",
    file: "",
    thumbnail: "",
    tags: ["drive", "stage 2", "guidance", "orientation", "video"],
    status: "available",
    featured: false,
    level: "Level 2"
  },

  /* ── Playlist Resources (external YouTube) ── */
  {
    id: "pro-playlist-stage2",
    title: "Stage 2 Dentistry Guidance — YouTube Playlist",
    type: "playlist",
    section: "prothesis",
    category: "Study Skills",
    subcategory: "Playlist Resources",
    description: "A curated YouTube playlist covering Stage 2 Dentistry guidance and practical prosthesis topics, arranged for easy step-by-step viewing.",
    link: "https://youtube.com/playlist?list=PL9tmQLd9VswLvvNZ9VoQm4zpddWEIhKW8&si=8cH2MsOsE589rgX7",
    file: "",
    thumbnail: "",
    tags: ["playlist", "youtube", "stage 2", "guidance", "prothesis"],
    status: "available",
    featured: false,
    level: "Level 2"
  },

  /* ── Study Support (placeholder / future) ── */
  {
    id: "pro-support-notes",
    title: "Stage 2 Prothesis — Study Notes",
    type: "note",
    section: "prothesis",
    category: "Study Skills",
    subcategory: "General Practical Dentistry Support",
    description: "Summarised high-yield notes and quick tips for the practical prosthesis course. Content will be added here soon.",
    link: "",
    file: "",
    thumbnail: "",
    tags: ["notes", "study support", "prothesis", "stage 2"],
    status: "coming-soon",
    featured: false,
    level: "Level 2"
  },


  /* ══════════ TELEGRAM HUB (LIVE NOW) ══════════ */
  {
    id: "tg-owner",
    title: "Contact on Telegram — @Bfhve357",
    type: "telegram",
    section: "telegram",
    category: "General",
    description: "Reach the site owner directly on Telegram for support, resource requests, corrections and feedback.",
    link: SITE.contact.telegram,
    thumbnail: "",
    tags: ["support", "help", "contact", "telegram"],
    status: "available",
    featured: true,
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
    id: "dl-lv2-illustrated-reference",
    title: "Level 2 — Illustrated Instruments Reference Kit",
    type: "download",
    section: "downloads",
    category: "Removable Prosthodontics",
    description: "Fully illustrated reference for the Level 2 Removable Prosthodontics & Occlusion kit — 10 categories covering waxes, casting materials, equipment and instruments with required vs. recommended labels.",
    link: "assets/media/pdf/level2-instruments-illustrated-reference.pdf",
    thumbnail: "",
    tags: ["instruments", "level 2", "prosthodontics", "occlusion", "illustrated"],
    status: "available",
    featured: true,
    level: "Level 2"
  },
  {
    id: "dl-removable-instruments",
    title: "Removable Prosthodontics & Occlusion — Instrument List",
    type: "download",
    section: "downloads",
    category: "Removable Prosthodontics",
    description: "Concise instrument and material checklist: inlay/pink wax, plaster, PKT kit, micromotor & straight handpiece, stones/carbide burs, wax carving tools, secondary dentulous casts and mean-value articulator.",
    link: "assets/media/pdf/removable-prosthodontics-instruments.pdf",
    thumbnail: "",
    tags: ["instruments", "removable", "occlusion", "checklist", "PKT"],
    status: "available",
    featured: false,
    level: "Level 2"
  },
  {
    id: "dl-operative-fixed-instruments",
    title: "Operative & Fixed Prosthodontics — Instruments",
    type: "download",
    section: "downloads",
    category: "Operative Dentistry",
    description: "Combined list for Operative Dentistry (burs #330/#245, handpieces, liners, glass slab, mirror/probe/tweezer, disposables) and Fixed Prosthodontics Tech-I diamond stones (colour coded) for Fall 2025/2026.",
    link: "assets/media/pdf/operative-fixed-prosthodontics-instruments.pdf",
    thumbnail: "",
    tags: ["instruments", "operative", "fixed", "burs", "diamond stones"],
    status: "available",
    featured: false,
    level: "Level 2"
  },

  /* ══════════ PDF LIBRARY (real uploaded files) ══════════ */
  {
    id: "pdf-lv2-illustrated-reference",
    title: "Level 2 Instruments — Illustrated Reference Kit",
    type: "pdf",
    section: "pdf",
    category: "Removable Prosthodontics",
    description: "The complete illustrated instrument and materials reference for Removable Prosthodontics & Occlusion, organised into 10 categories with required and recommended items clearly marked.",
    link: "assets/media/pdf/level2-instruments-illustrated-reference.pdf",
    thumbnail: "",
    tags: ["instruments", "illustrated", "level 2", "prosthodontics", "occlusion"],
    status: "available",
    featured: true,
    level: "Level 2"
  },
  {
    id: "pdf-removable-instruments",
    title: "Removable Prosthodontics & Occlusion — Instrument List",
    type: "pdf",
    section: "pdf",
    category: "Removable Prosthodontics",
    description: "Quick-reference instrument and material checklist for the removable prosthodontics and occlusion lab, including the PKT kit, waxes, casts and mean-value articulator.",
    link: "assets/media/pdf/removable-prosthodontics-instruments.pdf",
    thumbnail: "",
    tags: ["instruments", "checklist", "PKT", "occlusion"],
    status: "available",
    featured: false,
    level: "Level 2"
  },
  {
    id: "pdf-operative-fixed-instruments",
    title: "Operative & Fixed Prosthodontics — Instruments",
    type: "pdf",
    section: "pdf",
    category: "Operative Dentistry",
    description: "Instrument and material list covering operative dentistry burs and diagnostic set plus the Fixed Prosthodontics Tech-I diamond stones and handpieces.",
    link: "assets/media/pdf/operative-fixed-prosthodontics-instruments.pdf",
    thumbnail: "",
    tags: ["operative", "fixed", "burs", "diamond stones", "instruments"],
    status: "available",
    featured: false,
    level: "Level 2"
  },

  /* ══════════ VIDEO LIBRARY (real uploaded files) ══════════ */
  {
    id: "vid-removable-preclinical",
    title: "Removable Prosthodontics Instruments — Preclinical",
    type: "video",
    section: "video",
    category: "Removable Prosthodontics",
    description: "A walkthrough of the removable prosthodontics instruments for preclinical students, showing each tool and how it is used in the lab.",
    link: "assets/media/video/removable-prostho-instruments-preclinical.mp4",
    thumbnail: "assets/media/thumb/removable-prostho-instruments-preclinical.jpg",
    tags: ["removable", "instruments", "preclinical", "demo"],
    status: "available",
    featured: true,
    level: "Level 2"
  },
  {
    id: "vid-instruments-guide",
    title: "Dental Instruments — Overview Guide",
    type: "video",
    section: "video",
    category: "Instrument Lists",
    description: "A general overview video introducing common dental instruments and their purpose — a helpful primer before buying your kit.",
    link: "assets/media/video/dental-instruments-guide.mp4",
    thumbnail: "assets/media/thumb/dental-instruments-guide.jpg",
    tags: ["instruments", "overview", "guide"],
    status: "available",
    featured: false,
    level: "Level 2"
  },
  {
    id: "vid-stage2-tools",
    title: "Stage 2 Prosthodontics & Dental Materials — Practical Tools",
    type: "video",
    section: "video",
    category: "Dental Materials",
    description: "Second-year practical session covering the prosthodontics and dental materials tools you use in the lab, with hands-on demonstration.",
    link: "assets/media/video/stage2-prostho-dental-materials-tools.mp4",
    thumbnail: "assets/media/thumb/stage2-prostho-dental-materials-tools.jpg",
    tags: ["stage 2", "prosthodontics", "materials", "tools", "practical"],
    status: "available",
    featured: true,
    level: "Level 2"
  },
  {
    id: "vid-stage2-study-gpa",
    title: "Stage 2 Subjects — Study Plan & GPA Tips",
    type: "video",
    section: "video",
    category: "Study Skills",
    description: "A student-focused guide to the second-year dentistry subjects: how to study effectively, organise the course load and raise your GPA.",
    link: "assets/media/video/stage2-subjects-study-guide-gpa.mp4",
    thumbnail: "assets/media/thumb/stage2-subjects-study-guide-gpa.jpg",
    tags: ["stage 2", "study skills", "GPA", "subjects", "advice"],
    status: "available",
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
  bySubcategory(sub, sec) {
    return RESOURCES.filter(r => r.subcategory === sub && (!sec || r.section === sec));
  },
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
window.STAGE2_GUIDE = STAGE2_GUIDE;
window.PROTHESIS_GROUPS = PROTHESIS_GROUPS;
window.RESOURCES = RESOURCES;
window.DataAPI = DataAPI;
