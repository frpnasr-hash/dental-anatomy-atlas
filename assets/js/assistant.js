/* ═══════════════════════════════════════════════════════════════
   DENTOVERSE — AI ASSISTANT (NOVA)
   A premium, futuristic, fully-local academic guide for the hub.
   ───────────────────────────────────────────────────────────────
   Additive & non-destructive: this module reads the existing data
   layer (RESOURCES / SECTIONS / DataAPI …) and drives the existing
   router (window.DentoVerse.navigate) + favorites store. It never
   modifies hub.js / enhance.js / data.js. If any hook is missing it
   degrades gracefully and the base site keeps working exactly as is.

   Intelligence model (100% free, offline-first):
     • Intent detection  (where / open / find / recommend / saved / help …)
     • Smart multi-field scoring search across title, description,
       category, subcategory, section, type, tags, level, semester.
     • Fuzzy tolerance (typos, partial words, synonyms).
     • Direct navigation + resource opening + save + copy-link actions.
     • Contextual recommendations & "what to study next".
   Optional external AI can be layered on later via ASSISTANT_AI hook.
   Designed & Produced by Abdel Rahman Teba © ®
   ═══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  /* Bail out gracefully if the core data layer failed to load. */
  if (!window.RESOURCES || !window.SECTIONS) return;

  const ASSISTANT = {
    name: "Nova",
    role: "DentoVerse AI Guide",
    version: "1.0"
  };
  const LS_HISTORY = "dentoverse_assistant_history_v1";
  const LS_SEEN    = "dentoverse_assistant_seen_v1";

  /* ───────── tiny DOM + text helpers ───────── */
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const norm = (s) => String(s || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = (s) => norm(s).split(" ").filter(w => w.length > 1);

  const TYPE_ICON = {
    pdf: "📄", video: "🎬", telegram: "✈️", link: "🔗", note: "📝",
    flashcard: "🃏", quiz: "🧠", download: "⬇️", playlist: "▶️", drive: "📂"
  };
  const TYPE_LABEL = {
    pdf: "PDF", video: "Video", telegram: "Telegram", link: "Link", note: "Note",
    flashcard: "Flashcards", quiz: "Quiz", download: "Download", playlist: "Playlist", drive: "Drive"
  };

  /* ───────── stop words (ignored when scoring) ───────── */
  const STOP = new Set(("a an the of for to in on at is are be am can could would " +
    "please show me find open take go i want need where whats what which how do you " +
    "give get see look about all any my your this that with and or the best some only " +
    "list link file files section page here there help hi hey hello thanks thank").split(" "));

  /* ───────── synonym / concept expansion ─────────
     Maps user vocabulary → canonical tokens found in the data so the
     assistant understands natural, varied phrasing. */
  const SYNONYMS = {
    pdf: ["pdf", "pdfs", "document", "documents", "sheet", "sheets", "notes", "lecture", "lectures", "book", "reading"],
    video: ["video", "videos", "clip", "clips", "watch", "recording", "demonstration", "demo", "film"],
    quiz: ["quiz", "quizzes", "mcq", "mcqs", "question", "questions", "exam", "test", "practice", "questionbank"],
    telegram: ["telegram", "channel", "group", "bot", "contact"],
    download: ["download", "downloads", "instrument", "instruments", "kit", "checklist", "list", "template"],
    flashcard: ["flashcard", "flashcards", "deck", "recall", "cards"],
    note: ["note", "notes", "summary", "summaries", "highyield", "mnemonic"],
    playlist: ["playlist", "playlists", "youtube"],
    drive: ["drive", "google", "cloud", "folder"],

    anatomy: ["anatomy", "tooth", "teeth", "atlas", "morphology", "dentition", "molar", "incisor", "canine", "premolar"],
    prothesis: ["prothesis", "prosthesis", "prosthodontic", "prosthodontics", "removable", "denture", "waxup", "wax"],
    biomaterials2: ["biomaterial", "biomaterials", "impression", "ceramic", "ceramics", "cement", "cements", "composite", "resin", "elastomer", "gypsum", "alloy", "polymer"],
    bm2practical: ["practical", "casting", "investment", "manipulation", "labwork"],
    stage2: ["stage", "stage2", "second", "year", "level2", "buy", "buying"],
    downloads: ["instrument", "instruments", "kit", "tools", "checklist"],
    exam: ["exam", "revision", "revise", "study", "prepare", "final"],
    favorites: ["saved", "favorite", "favorites", "favourite", "favourites", "bookmark", "bookmarks", "star", "starred"]
  };

  /* Build reverse map: token -> set of concepts */
  const TOKEN_CONCEPT = {};
  Object.keys(SYNONYMS).forEach(concept => {
    SYNONYMS[concept].forEach(tok => {
      (TOKEN_CONCEPT[tok] = TOKEN_CONCEPT[tok] || new Set()).add(concept);
    });
  });

  /* ───────── favorites bridge (reuse the site's store) ───────── */
  const Fav = {
    has(id) { try { return window.DentoVerse.Favorites.has(id); } catch (e) { return false; } },
    toggle(id) { try { return window.DentoVerse.Favorites.toggle(id); } catch (e) { return false; } }
  };

  function navigate(section) {
    try {
      if (window.DentoVerse && typeof window.DentoVerse.navigate === "function"
          && SECTIONS.some(s => s.id === section)) {
        window.DentoVerse.navigate(section);
        return true;
      }
    } catch (e) {}
    location.hash = "#" + section;
    return true;
  }

  /* ───────── resource helpers ───────── */
  const sectionLabel = (id) => {
    const s = SECTIONS.find(x => x.id === id);
    return s ? s.label : id;
  };
  const sectionIcon = (id) => {
    const s = SECTIONS.find(x => x.id === id);
    return s ? s.icon : "📦";
  };
  const isOpenable = (r) => r.status === "available" && !!(r.file || r.link);
  const srcOf = (r) => r.file || r.link || "";
  const isLocalMedia = (r) => {
    const s = srcOf(r);
    return isOpenable(r) && (r.type === "video" || r.type === "pdf") && !/^https?:/i.test(s);
  };

  /* Try to reuse the hub's media modal by clicking the real card button.
     Fallback: navigate to the section, or open the src directly. */
  function openResource(r) {
    if (!isOpenable(r)) { navigate(r.section); return; }
    if (isLocalMedia(r)) {
      // Navigate to the section, then click the matching card's view button.
      navigate(r.section);
      closePanel(true);
      setTimeout(() => triggerCardOpen(r), 420);
      setTimeout(() => triggerCardOpen(r), 850);
      return;
    }
    const s = srcOf(r);
    if (/^https?:/i.test(s)) { window.open(s, "_blank", "noopener"); }
    else { window.open(s, "_blank"); }
  }

  function triggerCardOpen(r) {
    const btn = document.querySelector(
      `[data-id="${cssId(r.id)}"] [data-view="${cssId(r.id)}"], [data-view="${cssId(r.id)}"]`
    );
    if (btn) { btn.click(); return true; }
    return false;
  }
  const cssId = (s) => String(s).replace(/["\\]/g, "\\$&");

  /* Navigate to a section and briefly highlight the resource card. */
  function goToResource(r) {
    navigate(r.section);
    closePanel(true);
    const flash = () => {
      const card = document.querySelector(`[data-id="${cssId(r.id)}"]`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.add("nova-flash");
        setTimeout(() => card.classList.remove("nova-flash"), 2600);
        return true;
      }
      return false;
    };
    setTimeout(flash, 450);
    setTimeout(flash, 900);
  }

  function copyLink(r) {
    const s = srcOf(r);
    let url = s;
    if (s && !/^https?:/i.test(s)) {
      url = location.origin + location.pathname.replace(/[^/]*$/, "") + s;
    }
    const done = () => toast("Link copied to clipboard", "🔗");
    try {
      if (navigator.clipboard && url) { navigator.clipboard.writeText(url).then(done, () => fallbackCopy(url, done)); }
      else fallbackCopy(url, done);
    } catch (e) { fallbackCopy(url, done); }
  }
  function fallbackCopy(text, done) {
    try {
      const t = document.createElement("textarea");
      t.value = text; document.body.appendChild(t); t.select();
      document.execCommand("copy"); t.remove(); done && done();
    } catch (e) {}
  }

  /* ───────── lightweight toast (self-contained) ───────── */
  let toastWrap;
  function toast(msg, emoji) {
    if (window.DentoVerseEnhance && typeof window.DentoVerseEnhance.toast === "function") {
      try { window.DentoVerseEnhance.toast(msg, emoji); return; } catch (e) {}
    }
    if (!toastWrap) { toastWrap = el("div", "nova-toast-wrap"); document.body.appendChild(toastWrap); }
    const t = el("div", "nova-toast", `<span>${emoji || "✓"}</span><span>${esc(msg)}</span>`);
    toastWrap.appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, 2200);
  }

  /* ═══════════════════════════════════════════════════════════════
     SEARCH ENGINE — multi-field weighted scoring with fuzzy tolerance
     ═══════════════════════════════════════════════════════════════ */

  /* Pre-index each resource once for fast repeat searches. */
  const INDEX = RESOURCES.map(r => {
    const fields = {
      title: norm(r.title),
      description: norm(r.description),
      category: norm(r.category),
      subcategory: norm(r.subcategory),
      section: norm(r.section) + " " + norm(sectionLabel(r.section)),
      type: norm(r.type) + " " + norm(TYPE_LABEL[r.type]),
      tags: norm((r.tags || []).join(" ")),
      level: norm(r.level),
      semester: norm(r.semester)
    };
    const blob = Object.values(fields).join(" ");
    return { r, fields, blob, tokens: new Set(words(blob)) };
  });

  /* Field weights — a hit in the title matters far more than a tag. */
  const W = { title: 12, tags: 7, category: 6, subcategory: 6, type: 5, section: 4, description: 4, level: 3, semester: 2 };

  /* Simple Levenshtein (bounded) for typo tolerance on short tokens. */
  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 2) return 3;
    const dp = Array.from({ length: m + 1 }, (_, i) => i);
    for (let j = 1; j <= n; j++) {
      let prev = dp[0]; dp[0] = j;
      for (let i = 1; i <= m; i++) {
        const tmp = dp[i];
        dp[i] = Math.min(
          dp[i] + 1, dp[i - 1] + 1,
          prev + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
        prev = tmp;
      }
    }
    return dp[m];
  }
  const fuzzyEq = (a, b) => {
    if (a === b) return true;
    if (a.length < 4 || b.length < 4) return false;
    return lev(a, b) <= (a.length > 7 ? 2 : 1);
  };

  /* Expand query words into (word + concept) tokens. */
  function analyze(query) {
    const qWords = words(query).filter(w => !STOP.has(w));
    const concepts = new Set();
    qWords.forEach(w => {
      (TOKEN_CONCEPT[w] || new Set()).forEach(c => concepts.add(c));
      // also match concept via fuzzy for near-miss synonyms
      Object.keys(TOKEN_CONCEPT).forEach(tok => {
        if (tok.length > 4 && fuzzyEq(w, tok)) TOKEN_CONCEPT[tok].forEach(c => concepts.add(c));
      });
    });
    return { qWords, concepts: Array.from(concepts) };
  }

  function scoreResource(entry, qWords, concepts) {
    let score = 0;
    const matched = [];

    qWords.forEach(w => {
      let best = 0, bestField = null;
      for (const f in entry.fields) {
        const fv = entry.fields[f];
        if (!fv) continue;
        const weight = W[f] || 1;
        if (fv.includes(w)) {
          // full substring hit; bonus if it starts a word
          const wordStart = new RegExp("\\b" + w).test(fv);
          const s = weight * (wordStart ? 1 : 0.7);
          if (s > best) { best = s; bestField = f; }
        } else {
          // token-level fuzzy fallback
          for (const tok of entry.tokens) {
            if (fuzzyEq(w, tok)) { const s = weight * 0.5; if (s > best) { best = s; bestField = f; } break; }
          }
        }
      }
      if (best > 0) { score += best; if (bestField) matched.push(bestField); }
    });

    // Concept alignment: reward resources whose section/type match a concept.
    concepts.forEach(c => {
      if (entry.r.section === c) score += 6;
      if (entry.r.type === c) score += 6;
      if (c === "favorites" && Fav.has(entry.r.id)) score += 4;
      if (c === "exam" && (entry.r.type === "quiz" || (entry.r.tags || []).some(t => /exam|revision|mcq/i.test(t)))) score += 5;
    });

    // Prefer available + featured resources on ties.
    if (entry.r.status === "available") score += 1.5;
    if (entry.r.featured) score += 1;

    return { score, matched: Array.from(new Set(matched)) };
  }

  function search(query, opts) {
    opts = opts || {};
    const { qWords, concepts } = analyze(query);
    if (!qWords.length && !concepts.length) return { results: [], concepts, qWords };

    let scored = INDEX.map(entry => {
      const { score, matched } = scoreResource(entry, qWords, concepts);
      return { r: entry.r, score, matched };
    }).filter(x => x.score > 0);

    // Optional hard filters
    if (opts.type) scored = scored.filter(x => x.r.type === opts.type);
    if (opts.section) scored = scored.filter(x => x.r.section === opts.section);
    if (opts.availableOnly) scored = scored.filter(x => x.r.status === "available");

    scored.sort((a, b) => b.score - a.score);
    return { results: scored.slice(0, opts.limit || 6), concepts, qWords };
  }

  /* Detect the single dominant section a query targets (for navigation). */
  function detectSection(concepts, qWords) {
    // direct section-id concept
    const secConcepts = concepts.filter(c => SECTIONS.some(s => s.id === c));
    if (secConcepts.length) return secConcepts[0];
    // match a section label directly
    for (const s of SECTIONS) {
      const lbl = norm(s.label);
      if (qWords.some(w => lbl.includes(w) && w.length > 3)) return s.id;
    }
    return null;
  }

  /* ═══════════════════════════════════════════════════════════════
     INTENT ENGINE
     ═══════════════════════════════════════════════════════════════ */
  const RX = {
    greet:     /\b(hi|hey|hello|yo|salam|good (morning|evening|afternoon))\b/i,
    thanks:    /\b(thanks|thank you|thx|appreciate|shukran)\b/i,
    help:      /\b(help|what can you do|who are you|how (do|does) (this|you)|guide|capabilities|features)\b/i,
    where:     /\b(where|locate|which (section|page|part)|find (the )?(section|page)|how do i (get|go) to)\b/i,
    open:      /\b(open|launch|play|watch|start|view|read|show me the)\b/i,
    saved:     /\b(saved|favou?rites?|bookmark|starred|my (list|stuff))\b/i,
    recommend: /\b(recommend|suggest|what should i (study|read|do|learn)|study next|where (should|do) i start|study plan|study before)\b/i,
    important: /\b(important|high[- ]?yield|key|essential|most useful|best (for|to)|priority)\b/i,
    exam:      /\b(exam|revision|revise|final|prepare|before (the|my) exam|last minute)\b/i,
    count:     /\b(how many|count|number of|total)\b/i,
    listAll:   /\b(list|show( me)? all|everything|what('?s| is) (available|here)|what do you have)\b/i
  };

  /* ═══════════════════════════════════════════════════════════════
     RESPONSE BUILDER — returns { text, chips, cards, action }
     ═══════════════════════════════════════════════════════════════ */
  function respond(rawQuery) {
    const q = rawQuery.trim();
    const lower = q.toLowerCase();
    const { qWords, concepts } = analyze(q);

    /* — Greeting — */
    if (RX.greet.test(lower) && qWords.length <= 3 && !concepts.length) {
      return {
        text: `Hi! I'm <strong>${ASSISTANT.name}</strong>, your DentoVerse guide. I can find any PDF, video, question bank or section, take you straight there, and recommend what to study next. What are you looking for?`,
        chips: starterChips()
      };
    }

    /* — Thanks — */
    if (RX.thanks.test(lower) && qWords.length <= 4) {
      return { text: "You're very welcome — happy studying! 🦷 Ask me anytime to find a resource or open a section.", chips: starterChips() };
    }

    /* — Help / capabilities — */
    if (RX.help.test(lower)) {
      return {
        text: `I'm your built-in academic guide for DentoVerse. Here's how I can help:` +
          `<ul class="nova-list">` +
          `<li>🔎 <strong>Find</strong> any PDF, video, question file, note or link</li>` +
          `<li>🧭 <strong>Navigate</strong> you to the right section or page</li>` +
          `<li>📂 <strong>Open</strong> resources and highlight them for you</li>` +
          `<li>⭐ Show your <strong>saved</strong> favourites & save new ones</li>` +
          `<li>🎯 <strong>Recommend</strong> what to study next & exam-ready material</li>` +
          `<li>📊 Summarise a section and answer questions about the site</li>` +
          `</ul>Try one of the prompts below 👇`,
        chips: starterChips()
      };
    }

    /* — Saved / favourites — */
    if (RX.saved.test(lower)) {
      const ids = safeFavList();
      const list = ids.map(id => RESOURCES.find(r => r.id === id)).filter(Boolean);
      if (!list.length) {
        return {
          text: "You haven't saved any resources yet. Tap the ★ on any card — or on my result cards — to keep it here for quick access.",
          chips: [{ label: "⭐ Open Saved page", act: "nav:favorites" }, ...starterChips().slice(0, 2)]
        };
      }
      return {
        text: `You have <strong>${list.length}</strong> saved resource${list.length === 1 ? "" : "s"}. Here ${list.length === 1 ? "it is" : "are the latest"}:`,
        cards: list.slice(0, 5),
        chips: [{ label: "⭐ Open full Saved page", act: "nav:favorites" }]
      };
    }

    /* — Recommend / study next — */
    if (RX.recommend.test(lower)) {
      return recommendResponse(concepts, qWords, lower);
    }

    /* — Exam prep — */
    if (RX.exam.test(lower) && !RX.open.test(lower)) {
      return examResponse();
    }

    /* — Count — */
    if (RX.count.test(lower)) {
      const sec = detectSection(concepts, qWords);
      if (sec) {
        const n = RESOURCES.filter(r => r.section === sec).length;
        return { text: `The <strong>${esc(sectionLabel(sec))}</strong> section currently has <strong>${n}</strong> resource${n === 1 ? "" : "s"}.`,
          chips: [{ label: `${sectionIcon(sec)} Open ${sectionLabel(sec)}`, act: "nav:" + sec }] };
      }
      const avail = RESOURCES.filter(r => r.status === "available").length;
      return { text: `DentoVerse currently holds <strong>${RESOURCES.length}</strong> resources across <strong>${SECTIONS.filter(s=>!["home","search","about","favorites"].includes(s.id)).length}</strong> libraries — <strong>${avail}</strong> are available to open right now.`, chips: starterChips() };
    }

    /* — Where is X? (locate + navigate) — */
    if (RX.where.test(lower)) {
      const { results } = search(q, { limit: 4 });
      const sec = detectSection(concepts, qWords);
      if (results.length) {
        const top = results[0].r;
        const secId = sec || top.section;
        return {
          text: `That's in the <strong>${sectionIcon(secId)} ${esc(sectionLabel(secId))}</strong> section. ` +
            (results.length > 1 ? `Here are the closest matches — tap “Go to” and I'll highlight it for you:` : `Here it is — tap “Go to” and I'll take you straight there:`),
          cards: results.map(x => x.r).slice(0, 4),
          chips: [{ label: `${sectionIcon(secId)} Open ${sectionLabel(secId)}`, act: "nav:" + secId }]
        };
      }
      if (sec) {
        return { text: `You'll find that under <strong>${sectionIcon(sec)} ${esc(sectionLabel(sec))}</strong>. Want me to take you there?`,
          chips: [{ label: `${sectionIcon(sec)} Go to ${sectionLabel(sec)}`, act: "nav:" + sec }] };
      }
      return noMatch(q, concepts);
    }

    /* — Open Y (open the top match) — */
    if (RX.open.test(lower)) {
      const opts = {};
      const conceptTypes = concepts.filter(c => TYPE_LABEL[c]);
      if (conceptTypes.length === 1) opts.type = conceptTypes[0];
      const { results } = search(q, opts);
      if (results.length) {
        const top = results[0].r;
        if (isOpenable(top)) {
          return {
            text: `Opening <strong>${esc(top.title)}</strong> for you${isLocalMedia(top) ? " in the viewer" : ""}. ` +
              (results.length > 1 ? `If that's not the one, pick from these:` : ``),
            cards: results.map(x => x.r).slice(0, results.length > 1 ? 4 : 1),
            action: { kind: "open", id: top.id }
          };
        }
        return {
          text: `<strong>${esc(top.title)}</strong> is <em>${top.status === "pending-review" ? "pending review" : "coming soon"}</em>, so it can't be opened yet. Here's what I found — the available ones are ready to open:`,
          cards: results.map(x => x.r).slice(0, 4)
        };
      }
      // Maybe they mean a section (e.g. "open the question bank")
      const sec = detectSection(concepts, qWords);
      if (sec) return { text: `Taking you to <strong>${sectionIcon(sec)} ${esc(sectionLabel(sec))}</strong>…`, action: { kind: "nav", section: sec } };
      return noMatch(q, concepts);
    }

    /* — List all in a section — */
    if (RX.listAll.test(lower)) {
      const sec = detectSection(concepts, qWords);
      if (sec) {
        const list = RESOURCES.filter(r => r.section === sec);
        return {
          text: `Here's what's in <strong>${sectionIcon(sec)} ${esc(sectionLabel(sec))}</strong> (${list.length} item${list.length === 1 ? "" : "s"}):`,
          cards: list.slice(0, 6),
          chips: list.length > 6 ? [{ label: `Open all in ${sectionLabel(sec)}`, act: "nav:" + sec }] : []
        };
      }
    }

    /* — Default: smart search across everything — */
    const secGuess = detectSection(concepts, qWords);
    const { results } = search(q, { limit: 6 });

    if (results.length) {
      const top = results[0].r;
      const strong = results[0].score >= 10;
      const secId = secGuess || top.section;
      const lead = strong
        ? `Here's the best match for “${esc(q)}” — plus a few related resources:`
        : `I couldn't find an exact match for “${esc(q)}”, but these are the closest results:`;
      return {
        text: lead,
        cards: results.map(x => x.r),
        chips: secId ? [{ label: `${sectionIcon(secId)} Browse ${sectionLabel(secId)}`, act: "nav:" + secId }] : []
      };
    }

    /* — Only a section was recognised — */
    if (secGuess) {
      const list = RESOURCES.filter(r => r.section === secGuess);
      return {
        text: `I think you mean the <strong>${sectionIcon(secGuess)} ${esc(sectionLabel(secGuess))}</strong> section${list.length ? ` — it has ${list.length} resource${list.length === 1 ? "" : "s"}` : ""}:`,
        cards: list.slice(0, 5),
        chips: [{ label: `${sectionIcon(secGuess)} Open ${sectionLabel(secGuess)}`, act: "nav:" + secGuess }]
      };
    }

    return noMatch(q, concepts);
  }

  /* — recommend response — */
  function recommendResponse(concepts, qWords, lower) {
    // Contextual: if a section/topic is named, recommend from it.
    const sec = detectSection(concepts, qWords);
    let pool = RESOURCES.filter(r => r.status === "available");
    if (sec) pool = pool.filter(r => r.section === sec);
    else if (concepts.length) {
      const { results } = search(qWords.join(" ") + " " + concepts.join(" "), { limit: 20, availableOnly: true });
      if (results.length) pool = results.map(x => x.r);
    }
    // Rank: featured + question banks + pinned first.
    const pinned = new Set(window.PINNED_IDS || []);
    const rank = (r) => (pinned.has(r.id) ? 4 : 0) + (r.featured ? 2 : 0) +
      ((r.type === "quiz" || /mcq|exam|question/i.test((r.tags || []).join(" "))) ? 2 : 0) +
      (r.type === "pdf" ? 1 : 0);
    pool = pool.slice().sort((a, b) => rank(b) - rank(a));
    const picks = pool.slice(0, 5);

    if (!picks.length) {
      return { text: "I couldn't find available material for that yet. Try a broad topic like “biomaterials”, “anatomy” or “prothesis”, and I'll recommend the best resources.", chips: starterChips() };
    }
    const focus = sec ? ` for <strong>${esc(sectionLabel(sec))}</strong>` : (concepts.length ? "" : " across the hub");
    return {
      text: `Here's a smart study set${focus} — I've prioritised high-yield, featured and exam-ready material. Start from the top:`,
      cards: picks,
      chips: [{ label: "🚨 Open Exam Prep", act: "nav:exam" }, { label: "🎓 Stage 2 Guide", act: "nav:stage2" }]
    };
  }

  /* — exam response — */
  function examResponse() {
    const cfg = window.EXAM_ZONE || {};
    const priority = (cfg.priorityIds || []).map(id => RESOURCES.find(r => r.id === id)).filter(Boolean);
    const qbank = RESOURCES.filter(r => (r.type === "quiz" || /mcq|exam|question|revision/i.test((r.tags || []).join(" "))) && r.status === "available");
    const seen = new Set();
    const picks = [];
    [...priority, ...qbank, ...RESOURCES.filter(r => r.featured && r.status === "available")].forEach(r => {
      if (r && !seen.has(r.id)) { seen.add(r.id); picks.push(r); }
    });
    return {
      text: "Exam mode 🚨 — here's your fast-revision set: question banks and high-yield files first. I can also open the dedicated <strong>Exam Prep</strong> command centre with Study Mode.",
      cards: picks.slice(0, 5),
      chips: [{ label: "🚨 Open Exam Prep", act: "nav:exam" }, { label: "🧠 Question Bank", act: "nav:bm2practical" }]
    };
  }

  /* — no match — */
  function noMatch(q, concepts) {
    // Offer closest resources anyway, plus navigation.
    const { results } = search(q, { limit: 4 });
    if (results.length) {
      return {
        text: `I couldn't find an exact match for “${esc(q)}”. Here are the closest relevant resources — or browse a section below:`,
        cards: results.map(x => x.r),
        chips: sectionChips()
      };
    }
    return {
      text: `I couldn't find an exact match for “${esc(q)}” in the hub yet. Try a topic like a subject name, resource type (PDF, video, questions), or pick a section to explore:`,
      chips: sectionChips()
    };
  }

  function safeFavList() {
    try {
      if (window.DentoVerse && window.DentoVerse.Favorites) return window.DentoVerse.Favorites.list();
    } catch (e) {}
    return [];
  }

  /* ───────── suggested prompt chips ───────── */
  function starterChips() {
    return [
      { label: "🧪 Find biomaterials PDFs", q: "Find all PDFs about biomaterials" },
      { label: "🧠 Open the question bank", q: "Open the question bank" },
      { label: "🎯 What should I study?", q: "What should I study before the exam?" },
      { label: "🦷 Take me to anatomy", q: "Take me to the dental anatomy atlas" },
      { label: "⭐ Show my saved", q: "Show me my saved resources" }
    ];
  }
  function sectionChips() {
    return SECTIONS.filter(s => !["home", "search", "about"].includes(s.id))
      .slice(0, 7)
      .map(s => ({ label: `${s.icon} ${s.label}`, act: "nav:" + s.id }));
  }

  /* ═══════════════════════════════════════════════════════════════
     UI LAYER — floating button + drawer + chat
     ═══════════════════════════════════════════════════════════════ */
  let panelOpen = false;
  let fab, panel, thread, input, form;

  function buildUI() {
    /* Floating Action Button */
    fab = el("button", "nova-fab", `
      <span class="nova-fab-core">
        <span class="nova-fab-orb"></span>
        <span class="nova-fab-icon">🤖</span>
      </span>
      <span class="nova-fab-ring"></span>
      <span class="nova-fab-label">Ask Nova</span>`);
    fab.type = "button";
    fab.setAttribute("aria-label", "Open AI Assistant");
    fab.addEventListener("click", togglePanel);
    document.body.appendChild(fab);

    /* Panel / drawer */
    panel = el("aside", "nova-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "DentoVerse AI Assistant");
    panel.innerHTML = `
      <div class="nova-glow-edge"></div>
      <header class="nova-head">
        <div class="nova-head-id">
          <div class="nova-avatar"><span>🤖</span><i class="nova-pulse"></i></div>
          <div class="nova-head-txt">
            <h3>${esc(ASSISTANT.name)} <span class="nova-tag">AI Guide</span></h3>
            <p class="nova-status"><i></i> Online · knows this entire hub</p>
          </div>
        </div>
        <div class="nova-head-actions">
          <button class="nova-icon-btn" data-nova="clear" title="Clear chat" aria-label="Clear chat">🧹</button>
          <button class="nova-icon-btn" data-nova="close" title="Close" aria-label="Close assistant">✕</button>
        </div>
      </header>
      <div class="nova-thread" id="nova-thread" aria-live="polite"></div>
      <div class="nova-quick" id="nova-quick"></div>
      <form class="nova-input" id="nova-form" autocomplete="off">
        <input type="text" id="nova-q" placeholder="Ask me to find, open or recommend anything…" aria-label="Message the assistant" />
        <button type="submit" class="nova-send" aria-label="Send">
          <span>➤</span>
        </button>
      </form>
      <div class="nova-foot">Powered by DentoVerse • local smart search — no data leaves your device</div>`;
    document.body.appendChild(panel);

    /* Scrim (mobile) */
    const scrim = el("div", "nova-scrim");
    scrim.addEventListener("click", () => closePanel());
    document.body.appendChild(scrim);
    panel._scrim = scrim;

    thread = panel.querySelector("#nova-thread");
    input = panel.querySelector("#nova-q");
    form  = panel.querySelector("#nova-form");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (!v) return;
      handleUserMessage(v);
      input.value = "";
    });

    panel.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-nova]");
      if (!btn) return;
      const act = btn.dataset.nova;
      if (act === "close") closePanel();
      else if (act === "clear") clearThread();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && panelOpen) closePanel();
    });

    renderQuickChips(starterChips());
    restoreHistory();
  }

  function togglePanel() { panelOpen ? closePanel() : openPanel(); }

  function openPanel() {
    panelOpen = true;
    panel.classList.add("open");
    panel._scrim.classList.add("show");
    fab.classList.add("active");
    document.body.classList.add("nova-open");
    setTimeout(() => input && input.focus(), 260);
    if (!thread.children.length) greet();
    markSeen();
  }
  function closePanel(silent) {
    panelOpen = false;
    panel.classList.remove("open");
    panel._scrim.classList.remove("show");
    fab.classList.remove("active");
    document.body.classList.remove("nova-open");
  }

  /* ───────── message rendering ───────── */
  function pushMessage(role, node) {
    const row = el("div", `nova-msg ${role}`);
    if (role === "bot") {
      row.appendChild(el("div", "nova-msg-avatar", "🤖"));
    }
    const bubble = el("div", "nova-bubble");
    if (typeof node === "string") bubble.innerHTML = node;
    else bubble.appendChild(node);
    row.appendChild(bubble);
    thread.appendChild(row);
    scrollThread();
    return row;
  }
  function scrollThread() { thread.scrollTop = thread.scrollHeight; }

  function typingIndicator() {
    const row = el("div", "nova-msg bot typing");
    row.appendChild(el("div", "nova-msg-avatar", "🤖"));
    row.appendChild(el("div", "nova-bubble", `<span class="nova-dots"><i></i><i></i><i></i></span>`));
    thread.appendChild(row);
    scrollThread();
    return row;
  }

  function greet() {
    const seen = localStorage.getItem(LS_SEEN);
    const hi = seen
      ? `Welcome back! What can I find for you in DentoVerse today?`
      : `Hi! I'm <strong>${ASSISTANT.name}</strong> — your DentoVerse AI guide. I know every PDF, video, question bank and section here. Ask me to <em>find</em>, <em>open</em> or <em>recommend</em> anything, or tap a suggestion below.`;
    pushMessage("bot", hi);
    renderQuickChips(starterChips());
    persistHistory();
  }

  /* ───────── the core turn handler ───────── */
  function handleUserMessage(text) {
    pushMessage("user", esc(text));
    persistHistory();
    const typing = typingIndicator();

    // Small human-like delay; response is computed locally & instantly.
    const delay = 260 + Math.min(700, text.length * 12);
    setTimeout(() => {
      let reply;
      try { reply = respond(text); }
      catch (err) {
        reply = { text: "Something went wrong while searching — but the hub is fine. Try rephrasing, or pick a section below.", chips: sectionChips() };
      }
      typing.remove();
      renderReply(reply);
      persistHistory();
    }, delay);
  }

  function renderReply(reply) {
    const wrap = el("div", "nova-reply");
    if (reply.text) wrap.appendChild(el("div", "nova-reply-text", reply.text));

    if (reply.cards && reply.cards.length) {
      const list = el("div", "nova-cards");
      reply.cards.forEach(r => list.appendChild(resultCard(r)));
      wrap.appendChild(list);
    }
    pushMessage("bot", wrap);

    // Suggested chips below the message (quick bar).
    if (reply.chips && reply.chips.length) renderQuickChips(reply.chips);
    else renderQuickChips(starterChips());

    // Perform any action (open / navigate) after render.
    if (reply.action) {
      if (reply.action.kind === "open") {
        const r = RESOURCES.find(x => x.id === reply.action.id);
        if (r) setTimeout(() => openResource(r), 250);
      } else if (reply.action.kind === "nav") {
        setTimeout(() => { navigate(reply.action.section); closePanel(true); }, 250);
      }
    }
  }

  /* ───────── a rich result card inside chat ───────── */
  function resultCard(r) {
    const card = el("article", "nova-card");
    card.dataset.id = r.id;
    const openable = isOpenable(r);
    const fav = Fav.has(r.id);
    const statusCls = r.status === "available" ? "avail" : (r.status === "pending-review" ? "pending" : "soon");
    const statusTxt = r.status === "available" ? "Available" : (r.status === "pending-review" ? "Pending" : "Coming soon");

    card.innerHTML = `
      <div class="nova-card-top">
        <span class="nova-card-icon">${TYPE_ICON[r.type] || "📦"}</span>
        <div class="nova-card-head">
          <h4>${esc(r.title)}</h4>
          <div class="nova-card-meta">
            <span class="nc-pill">${esc(sectionLabel(r.section))}</span>
            <span class="nc-pill soft">${esc(r.category || TYPE_LABEL[r.type] || "")}</span>
            <span class="nc-status ${statusCls}">${statusTxt}</span>
          </div>
        </div>
      </div>
      <p class="nova-card-desc">${esc(trim(r.description, 130))}</p>
      <div class="nova-card-actions">
        ${openable ? `<button class="nc-btn primary" data-act="open">▸ Open</button>` : `<button class="nc-btn primary" data-act="go">Go to section</button>`}
        <button class="nc-btn" data-act="go">📍 Go to</button>
        <button class="nc-btn ${fav ? "on" : ""}" data-act="fav">${fav ? "★ Saved" : "☆ Save"}</button>
        ${srcOf(r) ? `<button class="nc-btn" data-act="copy" title="Copy link">🔗</button>` : ""}
      </div>`;

    card.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const act = b.dataset.act;
      if (act === "open") openResource(r);
      else if (act === "go") goToResource(r);
      else if (act === "fav") {
        const now = Fav.toggle(r.id);
        b.classList.toggle("on", now);
        b.textContent = now ? "★ Saved" : "☆ Save";
        toast(now ? "Saved to favourites" : "Removed from favourites", now ? "★" : "☆");
      } else if (act === "copy") copyLink(r);
    });
    return card;
  }
  const trim = (s, n) => { s = String(s || ""); return s.length > n ? s.slice(0, n - 1).trim() + "…" : s; };

  /* ───────── quick chip bar ───────── */
  function renderQuickChips(chips) {
    const bar = panel.querySelector("#nova-quick");
    bar.innerHTML = "";
    (chips || []).forEach(c => {
      const chip = el("button", "nova-chip", esc(c.label));
      chip.type = "button";
      chip.addEventListener("click", () => {
        if (c.q) { handleUserMessage(c.q); }
        else if (c.act && c.act.startsWith("nav:")) {
          const sec = c.act.slice(4);
          pushMessage("user", esc(c.label.replace(/^[^\w]+/, "").trim()));
          const t = typingIndicator();
          setTimeout(() => {
            t.remove();
            pushMessage("bot", `Taking you to <strong>${sectionIcon(sec)} ${esc(sectionLabel(sec))}</strong> now. 🚀`);
            renderQuickChips(starterChips());
            persistHistory();
            setTimeout(() => { navigate(sec); closePanel(true); }, 300);
          }, 300);
        }
      });
      bar.appendChild(chip);
    });
  }

  /* ───────── clear + persistence ───────── */
  function clearThread() {
    thread.innerHTML = "";
    localStorage.removeItem(LS_HISTORY);
    greet();
    toast("Conversation cleared", "🧹");
  }

  function persistHistory() {
    try {
      // Persist a lightweight snapshot of the rendered HTML (cards excluded
      // to keep it small — they re-render fresh from live data on restore).
      const msgs = Array.from(thread.querySelectorAll(".nova-msg")).slice(-30).map(m => ({
        role: m.classList.contains("user") ? "user" : "bot",
        html: m.querySelector(".nova-bubble") ? m.querySelector(".nova-bubble").innerHTML : ""
      })).filter(m => m.html && !m.html.includes("nova-dots"));
      localStorage.setItem(LS_HISTORY, JSON.stringify(msgs));
    } catch (e) {}
  }
  function restoreHistory() {
    let msgs = [];
    try { msgs = JSON.parse(localStorage.getItem(LS_HISTORY)) || []; } catch (e) {}
    if (!msgs.length) return;
    msgs.forEach(m => {
      const row = el("div", `nova-msg ${m.role}`);
      if (m.role === "bot") row.appendChild(el("div", "nova-msg-avatar", "🤖"));
      row.appendChild(el("div", "nova-bubble", m.html));
      thread.appendChild(row);
    });
    scrollThread();
  }
  function markSeen() { try { localStorage.setItem(LS_SEEN, "1"); } catch (e) {} }

  /* ═══════════════════════════════════════════════════════════════
     BOOT
     ═══════════════════════════════════════════════════════════════ */
  function boot() {
    buildUI();
    // gentle attention pulse the first time only
    if (!localStorage.getItem(LS_SEEN)) {
      setTimeout(() => fab && fab.classList.add("nudge"), 1400);
      setTimeout(() => fab && fab.classList.remove("nudge"), 6000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  /* Public hook (for future external-AI integration or programmatic use). */
  window.NovaAssistant = {
    open: openPanel,
    close: closePanel,
    ask: (q) => { openPanel(); setTimeout(() => handleUserMessage(q), 200); },
    search
  };
})();
