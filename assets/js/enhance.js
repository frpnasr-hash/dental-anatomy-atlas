/* ═══════════════════════════════════════════════════════════════
   DENTOVERSE — PREMIUM ENHANCEMENT LAYER (ENGINE)
   Additive, non-destructive upgrades that sit on top of the existing
   hub.js router without modifying it. Adds:
     1) Smart Top Navigation Bar   2) Featured Today
     3) Study Mode                 4) Quick Access Tiles
     5) Smart Filters              6) Progress / Completion
     7) Pinned Resources           8) Student Tools
     9) Exam Zone                 10) Daily Tip Card
   Everything is wrapped defensively — if any DataAPI/DentoVerse hook is
   missing the layer degrades gracefully and the base site keeps working.
   Designed & Produced by Abdel Rahman Teba © ®
   ═══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  /* Bail out gracefully if the core hub failed to load. */
  if (!window.DataAPI || !window.SECTIONS) return;

  const LS = {
    study:      "dentoverse_studymode_v1",
    important:  "dentoverse_important_v1",
    tipIndex:   "dentoverse_tip_v1"
  };

  /* ───────── tiny helpers ───────── */
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const readJSON = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; } catch (e) { return fb; } };
  const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const $ = (sel, root) => (root || document).querySelector(sel);
  const cssEscape = (s) => String(s).replace(/["\\]/g, "\\$&");

  const SECTION_MAP = Object.fromEntries((window.SECTIONS || []).map(s => [s.id, s]));
  const isRealSection = (id) => !!SECTION_MAP[id];

  /* Navigate through the existing router when possible. Supports the
     virtual "exam" view handled by this layer. */
  function go(section) {
    if (section === "exam") { location.hash = "#exam"; renderExamZone(); return; }
    if (window.DentoVerse && typeof window.DentoVerse.navigate === "function" && isRealSection(section)) {
      window.DentoVerse.navigate(section);
    } else {
      location.hash = "#" + section;
    }
  }

  /* ═══════ TOAST ═══════ */
  let toastWrap;
  function toast(msg, emoji, orange) {
    if (!toastWrap) {
      toastWrap = el("div", "enh-toast-wrap");
      document.body.appendChild(toastWrap);
    }
    const t = el("div", "enh-toast" + (orange ? " orange" : ""),
      `<span class="et-emoji">${emoji || "✓"}</span><span>${esc(msg)}</span>`);
    toastWrap.appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 320); }, 2200);
  }

  /* ═══════ IMPORTANT (mark) store ═══════ */
  const Important = {
    list: () => readJSON(LS.important, []),
    has: (id) => Important.list().includes(id),
    toggle(id) {
      const a = Important.list();
      const i = a.indexOf(id);
      if (i >= 0) a.splice(i, 1); else a.push(id);
      writeJSON(LS.important, a);
      return a.includes(id);
    }
  };

  const PINNED = new Set(window.PINNED_IDS || []);

  const TIPS = window.DAILY_TIPS || [];

  function miniIcon(type) {
    return ({ pdf: "📄", video: "🎬", telegram: "✈️", link: "🔗", playlist: "▶️", drive: "📂", download: "⬇️", quiz: "🧠", note: "📝", flashcard: "🃏" })[type] || "📦";
  }

  /* ═══════ 1) SMART TOP NAVIGATION BAR ═══════ */
  function buildTopBar() {
    if ($(".enh-topbar")) return;
    const bar = el("div", "enh-topbar");

    const jumpSections = (window.SECTIONS || []).filter(s =>
      !["home", "search", "about", "favorites"].includes(s.id));

    bar.innerHTML = `
      <div class="enh-topbar-brand" data-enh-go="home">
        🦷 <span>Dento<span class="etb-dot">Verse</span></span>
      </div>
      <div class="enh-topbar-actions">
        <div class="enh-act" data-enh-go="search"><span class="ea-ico">🔍</span><span class="ea-label">Search</span></div>
        <div class="enh-act" data-enh-go="favorites"><span class="ea-ico">⭐</span><span class="ea-label">Favorites</span><span class="ea-badge" data-enh-fav>0</span></div>
        <div class="enh-act" data-enh-go="downloads"><span class="ea-ico">⬇️</span><span class="ea-label">Downloads</span></div>
        <div class="enh-act" data-enh-go="exam"><span class="ea-ico">🚨</span><span class="ea-label">Exam Zone</span></div>
        <div class="enh-act" data-enh-go="about"><span class="ea-ico">✉️</span><span class="ea-label">Contact</span></div>
        <div class="enh-jump-wrap">
          <div class="enh-act" data-enh-jump><span class="ea-ico">⚡</span><span class="ea-label">Quick Jump</span> ▾</div>
          <div class="enh-jump-menu" id="enh-jump-menu">
            ${jumpSections.map(s => `<div class="enh-jump-item" data-enh-go="${esc(s.id)}"><span class="eji-ico">${s.icon || "•"}</span><span>${esc(s.label)}</span></div>`).join("")}
          </div>
        </div>
      </div>
      <div class="enh-study-toggle" data-enh-study title="Toggle focused Study Mode">
        <span class="est-label">Study Mode</span>
        <span class="enh-switch"></span>
      </div>`;

    document.body.insertBefore(bar, document.body.firstChild);
    document.body.classList.add("enh-ready");

    const jumpBtn = bar.querySelector("[data-enh-jump]");
    const jumpMenu = bar.querySelector("#enh-jump-menu");
    jumpBtn.addEventListener("click", (e) => { e.stopPropagation(); jumpMenu.classList.toggle("open"); });
    document.addEventListener("click", () => jumpMenu.classList.remove("open"));

    bar.addEventListener("click", (e) => {
      const goEl = e.target.closest("[data-enh-go]");
      if (goEl) { jumpMenu.classList.remove("open"); go(goEl.dataset.enhGo); return; }
      if (e.target.closest("[data-enh-study]")) toggleStudyMode();
    });

    syncFavBadge();
  }

  function syncFavBadge() {
    const n = (window.DentoVerse && window.DentoVerse.Favorites)
      ? window.DentoVerse.Favorites.list().length : 0;
    document.querySelectorAll("[data-enh-fav]").forEach(b => {
      b.textContent = n; b.style.display = n ? "inline-flex" : "none";
    });
  }
  function syncSavedStat() {
    const n = (window.DentoVerse && window.DentoVerse.Favorites) ? window.DentoVerse.Favorites.list().length : 0;
    document.querySelectorAll("[data-enh-saved]").forEach(x => x.textContent = n);
  }

  /* ═══════ 3) STUDY MODE ═══════ */
  function applyStudyMode(on) { document.body.classList.toggle("study-mode", on); }
  function toggleStudyMode() {
    const on = !document.body.classList.contains("study-mode");
    applyStudyMode(on);
    writeJSON(LS.study, on);
    toast(on ? "Study Mode on — distractions dimmed" : "Study Mode off", on ? "📖" : "✨", on);
  }
  function initStudyMode() { if (readJSON(LS.study, false) === true) applyStudyMode(true); }

  /* ═══════ 10) DAILY TIP CARD ═══════ */
  function dayIndex() {
    const day = Math.floor(Date.now() / 86400000);
    const offset = readJSON(LS.tipIndex, 0);
    return TIPS.length ? (((day + offset) % TIPS.length) + TIPS.length) % TIPS.length : 0;
  }
  function tipCard() {
    if (!TIPS.length) return null;
    const wrap = el("section", "enh-tip enh-block");
    const render = () => {
      const t = TIPS[dayIndex()];
      wrap.innerHTML = `
        <div class="enh-panel enh-tip-card">
          <div class="enh-tip-ico">${t.icon || "💡"}</div>
          <div class="enh-tip-body">
            <div class="enh-tip-tag">Daily ${esc(t.tag || "Tip")}</div>
            <div class="enh-tip-text">${esc(t.text)}</div>
          </div>
          <button class="enh-tip-next" type="button">↻ Another</button>
        </div>`;
      wrap.querySelector(".enh-tip-next").addEventListener("click", () => {
        writeJSON(LS.tipIndex, readJSON(LS.tipIndex, 0) + 1);
        render();
      });
    };
    render();
    return wrap;
  }

  /* ═══════ 2) FEATURED TODAY ═══════ */
  function pickFeaturedPool() {
    const all = DataAPI.all().filter(r => r.status === "available" && (r.file || r.link));
    const cfg = window.FEATURED_TODAY || {};
    const prefer = cfg.preferSections || [];
    const scored = all.map(r => {
      let score = 0;
      if (r.featured) score += 3;
      const pi = prefer.indexOf(r.section);
      if (pi >= 0) score += (prefer.length - pi);
      if (PINNED.has(r.id)) score += 2;
      return { r, score };
    }).sort((a, b) => b.score - a.score);
    return scored.map(s => s.r);
  }
  let ftRotation = 0;
  function featuredTodaySection() {
    const pool = pickFeaturedPool();
    if (!pool.length) return null;
    const wrap = el("section", "enh-featured-today enh-block");

    const paint = () => {
      const day = Math.floor(Date.now() / 86400000);
      const base = (day + ftRotation) % pool.length;
      const pickAt = (i) => pool[(base + i) % pool.length];
      const hero = pickAt(0);
      const m1 = pool.length > 1 ? pickAt(1) : null;

      const tip = TIPS.length ? TIPS[(day + ftRotation) % TIPS.length] : null;
      const typeLabel = { pdf: "PDF Resource", video: "Video Lecture", telegram: "Telegram", link: "Resource", playlist: "Playlist", drive: "Drive", download: "Download", quiz: "Quiz", note: "Note", flashcard: "Flashcards" };

      wrap.innerHTML = `
        <div class="enh-ft-head">
          <div class="enh-ft-title">
            <span class="eft-ico">✨</span>
            <div>
              <div class="enh-eyebrow">Featured Today</div>
              <h2 class="enh-h2">Fresh picks for your session</h2>
            </div>
          </div>
          <button class="enh-ft-refresh" type="button"><span class="eftr-ico">↻</span> Shuffle</button>
        </div>
        <div class="enh-ft-grid">
          <div class="enh-ft-hero" data-enh-open="${esc(hero.id)}">
            <span class="enh-ft-kicker">🔥 Top Pick</span>
            <div class="enh-ft-type">${esc(typeLabel[hero.type] || "Resource")}${hero.level ? " · " + esc(hero.level) : ""}</div>
            <h3>${esc(hero.title)}</h3>
            <p>${esc((hero.description || "").slice(0, 160))}${(hero.description || "").length > 160 ? "…" : ""}</p>
            <span class="enh-ft-cta">Open now →</span>
          </div>
          <div class="enh-ft-side">
            ${m1 ? `
            <div class="enh-ft-mini" data-enh-open="${esc(m1.id)}">
              <div class="eftm-top"><span class="eftm-ico">${miniIcon(m1.type)}</span><span class="eftm-tag">Also worth opening</span></div>
              <h4>${esc(m1.title)}</h4>
              <p>${esc((m1.description || "").slice(0, 90))}${(m1.description || "").length > 90 ? "…" : ""}</p>
            </div>` : ""}
            ${tip ? `
            <div class="enh-ft-mini" data-enh-tipjump>
              <div class="eftm-top"><span class="eftm-ico">${tip.icon || "💡"}</span><span class="eftm-tag">Quick ${esc(tip.tag || "Tip")}</span></div>
              <p>${esc(tip.text.slice(0, 130))}${tip.text.length > 130 ? "…" : ""}</p>
            </div>` : ""}
          </div>
        </div>`;

      wrap.querySelector(".enh-ft-refresh").addEventListener("click", () => { ftRotation++; paint(); });
      wrap.querySelectorAll("[data-enh-open]").forEach(node =>
        node.addEventListener("click", () => openResourceById(node.dataset.enhOpen)));
      const tj = wrap.querySelector("[data-enh-tipjump]");
      if (tj) tj.addEventListener("click", () => {
        const tc = $(".enh-tip");
        if (tc) tc.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    };
    paint();
    return wrap;
  }

  /* Open a resource: local media → its own card modal; external → new tab. */
  function openResourceById(id) {
    const r = DataAPI.byId(id);
    if (!r) return;
    const src = r.file || r.link || "";
    if (!src) { toast("This resource is coming soon", "🕵️", true); return; }
    const isLocalMedia = (r.type === "video" || r.type === "pdf") && !/^https?:/i.test(src);
    if (isLocalMedia) {
      go(r.section);
      setTimeout(() => {
        const btn = document.querySelector(`[data-view="${cssEscape(id)}"]`);
        if (btn) btn.click();
        else window.open(src, "_blank", "noopener");
      }, 280);
    } else {
      window.open(src, "_blank", "noopener");
    }
  }

  /* ═══════ 6) PROGRESS / COMPLETION PANEL ═══════ */
  function progressSection() {
    const all = DataAPI.all();
    const total = all.length;
    const available = all.filter(r => r.status === "available").length;
    const coming = all.filter(r => r.status !== "available").length;
    const saved = (window.DentoVerse && window.DentoVerse.Favorites) ? window.DentoVerse.Favorites.list().length : 0;
    const libraries = (window.SECTIONS || []).filter(s => !["home", "search", "about", "favorites"].includes(s.id)).length;
    let completed = 0;
    (window.SECTIONS || []).forEach(s => {
      if (["home", "search", "about", "favorites"].includes(s.id)) return;
      const secItems = all.filter(r => r.section === s.id);
      if (secItems.length && secItems.every(r => r.status === "available")) completed++;
    });
    const pct = total ? Math.round((available / total) * 100) : 0;

    const wrap = el("section", "enh-progress enh-block");
    wrap.innerHTML = `
      <div class="enh-panel enh-prog-inner">
        <div class="enh-prog-head">
          <h3>📊 Your DentoVerse at a glance</h3>
          <span class="enh-prog-live"><span class="epl-dot"></span> Live &amp; growing</span>
        </div>
        <div class="enh-prog-grid">
          <div class="enh-stat"><span class="es-num">${total}</span><span class="es-label">Total Resources</span></div>
          <div class="enh-stat orange"><span class="es-num">${available}</span><span class="es-label">Ready Now</span></div>
          <div class="enh-stat"><span class="es-num">${coming}</span><span class="es-label">Coming Soon</span></div>
          <div class="enh-stat"><span class="es-num">${libraries}</span><span class="es-label">Libraries</span></div>
          <div class="enh-stat"><span class="es-num">${completed}</span><span class="es-label">Sections Complete</span></div>
          <div class="enh-stat orange"><span class="es-num" data-enh-saved>${saved}</span><span class="es-label">Saved by You</span></div>
        </div>
        <div class="enh-prog-bar-wrap">
          <div class="enh-prog-bar-top"><span>Overall availability</span><span>${pct}%</span></div>
          <div class="enh-prog-track"><div class="enh-prog-fill" style="width:0%"></div></div>
        </div>
      </div>`;
    requestAnimationFrame(() => {
      const fill = wrap.querySelector(".enh-prog-fill");
      if (fill) setTimeout(() => { fill.style.width = pct + "%"; }, 120);
    });
    return wrap;
  }

  /* ═══════ 4) QUICK ACCESS TILES ═══════ */
  function tilesSection() {
    const tiles = window.QUICK_TILES || [];
    if (!tiles.length) return null;
    const counts = DataAPI.counts();
    const wrap = el("section", "enh-tiles enh-block");
    const head = el("div", "enh-ft-head");
    head.innerHTML = `
      <div class="enh-ft-title">
        <span class="eft-ico">⚡</span>
        <div>
          <div class="enh-eyebrow">Quick Access</div>
          <h2 class="enh-h2">Jump straight to what you need</h2>
        </div>
      </div>`;
    const grid = el("div", "enh-tiles-grid");
    tiles.forEach(t => {
      const isVirtual = t.section === "exam";
      const c = isVirtual ? null : (counts[t.section] || 0);
      const tile = el("button", "enh-tile" + (t.accent === "orange" ? " orange" : ""));
      tile.type = "button";
      tile.dataset.enhGo = t.section;
      tile.innerHTML = `
        <span class="et-ico">${t.icon || "•"}</span>
        <span class="et-label">${esc(t.label)}</span>
        <span class="et-count">${isVirtual ? "Revision" : (c + " item" + (c === 1 ? "" : "s"))}</span>`;
      tile.addEventListener("click", () => go(t.section));
      grid.appendChild(tile);
    });
    wrap.appendChild(head);
    wrap.appendChild(grid);
    return wrap;
  }

  /* ═══════ HOME INJECTION ═══════
     After hub.js renders home, we prepend the premium blocks in order:
     Featured Today → Quick Tiles → Progress → Daily Tip. We insert them
     right after the hero so the original "All Libraries" grid stays intact. */
  function enhanceHome() {
    const viewRoot = document.getElementById("view");
    if (!viewRoot) return;
    const hero = viewRoot.querySelector(".hub-hero");
    if (!hero || viewRoot.querySelector(".enh-featured-today")) return; // already enhanced

    const frag = document.createDocumentFragment();
    const ft = featuredTodaySection(); if (ft) frag.appendChild(ft);
    const tiles = tilesSection(); if (tiles) frag.appendChild(tiles);
    const prog = progressSection(); if (prog) frag.appendChild(prog);
    const tip = tipCard(); if (tip) frag.appendChild(tip);

    hero.after(frag);
  }

  /* ═══════ 5) SMART FILTERS + 7) PINNED + 8) STUDENT TOOLS ═══════ */
  const CARD_SELECTOR = ".res-card, .bm2-card";

  function resourceSrc(r) {
    const src = r.file || r.link || "";
    if (!src) return "";
    if (/^https?:/i.test(src)) return src;
    try { return new URL(src, location.href).href; } catch (e) { return src; }
  }

  function decorateCard(card) {
    if (!card || card.dataset.enhDone === "1") return;
    const id = card.dataset.id;
    if (!id) return;
    const r = DataAPI.byId(id);
    if (!r) return;
    card.dataset.enhDone = "1";

    if (PINNED.has(id)) {
      card.classList.add("enh-pinned");
      if (!card.querySelector(".enh-pin-badge")) {
        card.insertBefore(el("span", "enh-pin-badge", "📌 Pinned"), card.firstChild);
      }
    }

    const host = card.querySelector(".rc-body") || card;
    if (host.querySelector(".enh-tools")) return;
    const src = resourceSrc(r);
    const important = Important.has(id);
    const tools = el("div", "enh-tools");
    tools.innerHTML = `
      ${src ? `<button class="enh-tool" data-etool="copy" title="Copy link"><span>🔗</span><span class="etl-txt">Copy</span></button>` : ""}
      ${src ? `<button class="enh-tool" data-etool="tab" title="Open in new tab"><span>↗</span><span class="etl-txt">New tab</span></button>` : ""}
      <button class="enh-tool" data-etool="save" title="Save to favorites"><span>⭐</span><span class="etl-txt">Save</span></button>
      ${src ? `<button class="enh-tool" data-etool="share" title="Share"><span>📤</span><span class="etl-txt">Share</span></button>` : ""}
      ${src ? `<button class="enh-tool" data-etool="download" title="Download"><span>⬇️</span><span class="etl-txt">Download</span></button>` : ""}
      <button class="enh-tool important ${important ? "on" : ""}" data-etool="important" title="Mark as important"><span>🔥</span><span class="etl-txt">Important</span></button>`;

    tools.addEventListener("click", (e) => {
      const b = e.target.closest("[data-etool]");
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      const action = b.dataset.etool;
      if (action === "copy") {
        copyText(src).then(() => toast("Link copied to clipboard", "🔗"));
      } else if (action === "tab") {
        window.open(src, "_blank", "noopener");
      } else if (action === "save") {
        if (window.DentoVerse && window.DentoVerse.Favorites) {
          const now = window.DentoVerse.Favorites.toggle(id);
          syncFavBadge(); syncSavedStat();
          const star = card.querySelector(`[data-fav="${cssEscape(id)}"]`);
          if (star) { star.classList.toggle("active", now); star.textContent = now ? "★" : "☆"; }
          toast(now ? "Saved to favorites" : "Removed from favorites", now ? "⭐" : "☆", now);
        }
      } else if (action === "share") {
        shareResource(r, src);
      } else if (action === "download") {
        const a = document.createElement("a");
        a.href = src; a.download = ""; document.body.appendChild(a); a.click(); a.remove();
        toast("Download started", "⬇️");
      } else if (action === "important") {
        const on = Important.toggle(id);
        b.classList.toggle("on", on);
        toast(on ? "Marked as important" : "Unmarked", on ? "🔥" : "✓", on);
      }
    });

    host.appendChild(tools);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise((res) => {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      ta.remove(); res();
    });
  }
  function shareResource(r, src) {
    if (navigator.share) {
      navigator.share({ title: r.title, text: r.description || r.title, url: src }).catch(() => {});
    } else {
      copyText(src).then(() => toast("Link copied — ready to share", "📤"));
    }
  }

  function floatPinned(scope) {
    (scope || document).querySelectorAll(".res-grid, .bm2-group-grid").forEach(grid => {
      const pinned = Array.from(grid.querySelectorAll(".enh-pinned"));
      pinned.reverse().forEach(card => grid.insertBefore(card, grid.firstChild));
    });
  }

  function injectSmartFilters(sectionId) {
    const viewRoot = document.getElementById("view");
    if (!viewRoot) return;
    if (viewRoot.querySelector(".enh-smartfilters")) return;

    const firstGrid = viewRoot.querySelector(".res-grid, .bm2-groups, .results, .pro-groups");
    if (!firstGrid) return;

    const list = DataAPI.bySection(sectionId);
    if (list.length < 4) return;

    const count = (pred) => list.filter(pred).length;
    const favs = (window.DentoVerse && window.DentoVerse.Favorites) ? window.DentoVerse.Favorites.list() : [];

    const chips = [
      { key: "all",       label: "All",         test: () => true,                                     n: list.length },
      { key: "available", label: "Available",   test: r => r.status === "available",                  n: count(r => r.status === "available"), orange: true },
      { key: "soon",      label: "Coming Soon", test: r => r.status !== "available",                  n: count(r => r.status !== "available") },
      { key: "pdf",       label: "PDF",         test: r => r.type === "pdf",                          n: count(r => r.type === "pdf") },
      { key: "video",     label: "Video",       test: r => r.type === "video",                        n: count(r => r.type === "video") },
      { key: "link",      label: "Links",       test: r => ["link","telegram","drive","playlist"].includes(r.type), n: count(r => ["link","telegram","drive","playlist"].includes(r.type)) },
      { key: "question",  label: "Questions",   test: r => (r.subsection === "questions") || /question|mcq/i.test((r.tags||[]).join(" ")+r.title), n: count(r => (r.subsection === "questions") || /question|mcq/i.test((r.tags||[]).join(" ")+r.title)) },
      { key: "l1",        label: "Level 1",     test: r => r.level === "Level 1",                     n: count(r => r.level === "Level 1") },
      { key: "l2",        label: "Level 2",     test: r => r.level === "Level 2",                     n: count(r => r.level === "Level 2") },
      { key: "featured",  label: "Featured",    test: r => r.featured,                                n: count(r => r.featured), orange: true },
      { key: "saved",     label: "Saved",       test: r => favs.includes(r.id),                       n: count(r => favs.includes(r.id)) },
      { key: "important", label: "Important",   test: r => Important.has(r.id),                        n: count(r => Important.has(r.id)) }
    ].filter(c => c.key === "all" || c.n > 0);

    const bar = el("div", "enh-smartfilters");
    bar.innerHTML = `<span class="enh-sf-label">🎛️ Smart Filters</span>` +
      chips.map(c => `<button class="enh-chip ${c.orange ? "orange" : ""} ${c.key === "all" ? "active" : ""}" data-chip="${c.key}">${esc(c.label)} <span class="ec-count">${c.n}</span></button>`).join("");

    const applyChip = (key) => {
      const chip = chips.find(c => c.key === key) || chips[0];
      viewRoot.querySelectorAll(CARD_SELECTOR).forEach(card => {
        const r = DataAPI.byId(card.dataset.id);
        card.style.display = (r && chip.test(r)) ? "" : "none";
      });
      viewRoot.querySelectorAll(".bm2-group, .pro-group").forEach(g => {
        const anyVisible = Array.from(g.querySelectorAll(CARD_SELECTOR)).some(c => c.style.display !== "none");
        g.style.display = anyVisible ? "" : "none";
      });
    };

    bar.addEventListener("click", (e) => {
      const b = e.target.closest("[data-chip]");
      if (!b) return;
      bar.querySelectorAll(".enh-chip").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      applyChip(b.dataset.chip);
    });

    const anchor = viewRoot.querySelector(".filter-bar, .bm2-controls, .bm2-tabs, .results, .res-grid, .bm2-groups, .pro-groups");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(bar, anchor);
  }

  function enhanceCards(scope) {
    (scope || document).querySelectorAll(CARD_SELECTOR).forEach(decorateCard);
    floatPinned(scope);
  }

  /* ═══════ 9) EXAM ZONE (virtual view) ═══════ */
  function collectExamResources() {
    const cfg = window.EXAM_ZONE || {};
    const all = DataAPI.all().filter(r => r.status === "available" && (r.file || r.link));
    const priority = (cfg.priorityIds || []).map(id => DataAPI.byId(id)).filter(r => r && r.status === "available");
    const examSecs = cfg.examSections || ["bm2practical", "biomaterials2", "pdf", "quizzes"];

    const questions = all.filter(r => (r.subsection === "questions") || /question|mcq/i.test((r.tags||[]).join(" ") + r.title));
    const highYield = all.filter(r => examSecs.includes(r.section) && (r.featured || PINNED.has(r.id)));
    const quickLinks = all.filter(r => ["telegram", "link", "playlist", "drive"].includes(r.type) && examSecs.includes(r.section));

    const seen = new Set();
    const uniq = (arr) => arr.filter(r => (r && !seen.has(r.id)) ? (seen.add(r.id), true) : false);

    return {
      priority: uniq(priority),
      questions: uniq(questions),
      highYield: uniq(highYield),
      quickLinks: uniq(quickLinks),
      total: new Set([...priority, ...questions, ...highYield, ...quickLinks].map(r => r.id)).size
    };
  }

  function renderExamZone() {
    const viewRoot = document.getElementById("view");
    if (!viewRoot) return;
    document.querySelectorAll("[data-nav]").forEach(a => a.classList.remove("active"));
    window.scrollTo({ top: 0, behavior: "smooth" });

    const cfg = window.EXAM_ZONE || {};
    const data = collectExamResources();
    const qCount = data.questions.length;

    viewRoot.innerHTML = "";
    const wrap = el("section", "section");
    wrap.innerHTML = `
      <div class="enh-exam-hero">
        <span class="enh-exam-badge">🚨 Exam Zone · Urgent Revision</span>
        <h1>Last-Minute Command Centre</h1>
        <p>${esc(cfg.intro || "")}</p>
        <div class="enh-exam-actions">
          <a class="btn btn-primary" data-enh-studybtn><span>📖 Enter Study Mode</span></a>
          <a class="btn btn-secondary" data-enh-go="favorites"><span>⭐ My Saved</span></a>
        </div>
        <div class="enh-exam-metrics">
          <div class="enh-exam-metric"><span class="eem-num">${data.total}</span><span class="eem-label">Fast-Review Items</span></div>
          <div class="enh-exam-metric"><span class="eem-num">${qCount}</span><span class="eem-label">Question Files</span></div>
          <div class="enh-exam-metric"><span class="eem-num">${data.highYield.length}</span><span class="eem-label">High-Yield</span></div>
        </div>
      </div>
      <div id="enh-exam-body"></div>`;
    viewRoot.appendChild(wrap);

    const body = wrap.querySelector("#enh-exam-body");
    const groups = [
      { title: "⭐ Top Priority — Start Here", items: data.priority },
      { title: "🧠 Question Bank & MCQs",       items: data.questions },
      { title: "📚 High-Yield Materials",       items: data.highYield },
      { title: "🔗 Quick Links & Playlists",    items: data.quickLinks }
    ];

    let painted = false;
    groups.forEach(g => {
      if (!g.items.length) return;
      painted = true;
      const title = el("div", "enh-exam-group-title", `<span>${esc(g.title)}</span><span class="eegt-line"></span>`);
      const grid = el("div", "res-grid");
      g.items.forEach(r => grid.appendChild(examCard(r)));
      body.appendChild(title);
      body.appendChild(grid);
    });

    if (!painted) {
      body.appendChild(el("div", "empty-state",
        `<div class="empty-orbit">🛰️</div><h3>Exam material is being prepared</h3>
         <p>As soon as question banks and high-yield files are available, they will appear here for fast revision.</p>`));
    }

    wrap.querySelectorAll("[data-enh-go]").forEach(n => n.addEventListener("click", (e) => { e.preventDefault(); go(n.dataset.enhGo); }));
    const sb = wrap.querySelector("[data-enh-studybtn]");
    if (sb) sb.addEventListener("click", (e) => { e.preventDefault(); if (!document.body.classList.contains("study-mode")) toggleStudyMode(); });

    enhanceCards(body);
  }

  function examCard(r) {
    const card = el("article", `res-card status-${r.status}`);
    card.dataset.id = r.id;
    const src = r.file || r.link || "";
    const fav = (window.DentoVerse && window.DentoVerse.Favorites) ? window.DentoVerse.Favorites.has(r.id) : false;
    const isLocalMedia = (r.type === "video" || r.type === "pdf") && !/^https?:/i.test(src);
    const icon = miniIcon(r.type);

    const action = isLocalMedia
      ? `<button class="rc-btn" data-enh-openbtn="${esc(r.id)}">Open →</button>`
      : `<a class="rc-btn" href="${esc(src)}" ${/^https?:/i.test(src) ? 'target="_blank" rel="noopener"' : ""}>Open →</a>`;

    card.innerHTML = `
      <div class="rc-thumb rc-thumb-icon"><span>${icon}</span></div>
      <div class="rc-body">
        <div class="rc-top">
          <span class="rc-type">${icon} ${esc(String(r.type).toUpperCase())}</span>
          <span class="rc-status avail">● Available</span>
        </div>
        <h3 class="rc-title">${esc(r.title)}</h3>
        <div class="rc-cat">${esc(r.category || "")}${r.level ? ` · ${esc(r.level)}` : ""}</div>
        <p class="rc-desc">${esc((r.description || "").slice(0, 130))}${(r.description||"").length>130?"…":""}</p>
        <div class="rc-actions">
          ${action}
          <button class="rc-fav ${fav ? "active" : ""}" data-fav="${esc(r.id)}" title="Save">${fav ? "★" : "☆"}</button>
        </div>
      </div>`;

    const openBtn = card.querySelector("[data-enh-openbtn]");
    if (openBtn) openBtn.addEventListener("click", () => openResourceById(r.id));
    const star = card.querySelector("[data-fav]");
    if (star) star.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.DentoVerse && window.DentoVerse.Favorites) {
        const now = window.DentoVerse.Favorites.toggle(r.id);
        star.classList.toggle("active", now); star.textContent = now ? "★" : "☆";
        syncFavBadge(); syncSavedStat();
      }
    });
    return card;
  }

  /* ═══════ ROUTER HOOK ═══════
     hub.js re-renders #view on every navigation. We watch #view with a
     MutationObserver and, after each render settles, apply the matching
     enhancement for the current section. This never modifies hub.js. */
  function currentSection() {
    return (location.hash || "#home").slice(1) || "home";
  }

  let enhanceScheduled = false;
  function scheduleEnhance() {
    if (enhanceScheduled) return;
    enhanceScheduled = true;
    requestAnimationFrame(() => {
      enhanceScheduled = false;
      runEnhanceForCurrentView();
    });
  }

  function runEnhanceForCurrentView() {
    const sec = currentSection();

    if (sec === "exam") {
      if (!document.querySelector(".enh-exam-hero")) renderExamZone();
      return;
    }

    if (sec === "home") { enhanceHome(); return; }

    const dataDriven = ["pdf", "video", "telegram", "links", "notes", "flashcards",
      "quizzes", "downloads", "prothesis", "biomaterials2", "bm2practical", "anatomy", "stage2"];
    if (dataDriven.includes(sec)) {
      injectSmartFilters(sec);
    }
    enhanceCards(document.getElementById("view"));
    syncFavBadge();
    syncSavedStat();
  }

  function observeView() {
    const target = document.getElementById("view");
    if (!target) return;
    const obs = new MutationObserver(() => scheduleEnhance());
    obs.observe(target, { childList: true, subtree: false });
  }

  window.addEventListener("hashchange", () => {
    if (currentSection() === "exam") renderExamZone();
    else scheduleEnhance();
  });

  /* ═══════ BOOT ═══════ */
  function boot() {
    buildTopBar();
    initStudyMode();
    observeView();
    if (currentSection() === "exam") renderExamZone();
    else scheduleEnhance();
    setTimeout(scheduleEnhance, 300);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.DentoVerseEnhance = { toggleStudyMode, renderExamZone, toast };
})();
