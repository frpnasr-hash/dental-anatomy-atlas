/* ═══════════════════════════════════════════════════════════════
   DENTOVERSE — HUB ENGINE
   Client-side router · resource rendering · search · filters ·
   favorites (localStorage). Fully data-driven from data.js.
   Designed & Produced by Abdel Rahman Teba © ®
   ═══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  const FAV_KEY = "dentoverse_favorites_v1";

  /* ───────── Favorites store ───────── */
  const Favorites = {
    _read() {
      try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; }
      catch (e) { return []; }
    },
    _write(arr) {
      try { localStorage.setItem(FAV_KEY, JSON.stringify(arr)); } catch (e) {}
    },
    list() { return this._read(); },
    has(id) { return this._read().includes(id); },
    toggle(id) {
      const arr = this._read();
      const i = arr.indexOf(id);
      if (i >= 0) arr.splice(i, 1); else arr.push(id);
      this._write(arr);
      updateFavBadge();
      return arr.includes(id);
    }
  };

  /* ───────── Icons per type ───────── */
  const TYPE_ICON = {
    pdf: "📄", video: "🎬", telegram: "✈️", link: "🔗",
    note: "📝", flashcard: "🃏", quiz: "🧠", download: "⬇️",
    playlist: "▶️", drive: "📂"
  };
  const TYPE_LABEL = {
    pdf: "PDF", video: "Video", telegram: "Telegram", link: "Link",
    note: "Note", flashcard: "Flashcards", quiz: "Quiz", download: "Download",
    playlist: "Playlist", drive: "Drive"
  };

  /* ───────── Utility ───────── */
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const escapeHtml = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* ═══════ RESOURCE CARD (reusable) ═══════ */
  function resourceCard(r) {
    const card = el("article", `res-card status-${r.status}`);
    card.dataset.id = r.id;

    // A resource is openable if it has a usable local file OR external link,
    // and it is not explicitly pending/coming-soon.
    const src = r.file || r.link || "";
    const isReady = r.status === "available";
    const isAvailable = isReady && !!src;
    const fav = Favorites.has(r.id);

    const thumb = r.thumbnail
      ? `<div class="rc-thumb" style="background-image:url('${escapeHtml(r.thumbnail)}')"></div>`
      : `<div class="rc-thumb rc-thumb-icon"><span>${TYPE_ICON[r.type] || "📦"}</span></div>`;

    const statusBadge = r.status === "available"
      ? `<span class="rc-status avail">● Available</span>`
      : r.status === "pending-review"
        ? `<span class="rc-status pending">🕵️ Pending Review</span>`
        : `<span class="rc-status soon">◔ Coming Soon</span>`;

    const tags = (r.tags || []).slice(0, 4)
      .map(t => `<span class="rc-tag">#${escapeHtml(t)}</span>`).join("");

    const levelBadge = r.level ? `<span class="rc-level">${escapeHtml(r.level)}</span>` : "";

    const actionLabel = {
      pdf: "Open PDF", video: "Watch", telegram: "Open in Telegram",
      link: "Open Link", note: "Read", flashcard: "Study", quiz: "Start Quiz",
      download: "Download", playlist: "Open Playlist", drive: "Open in Drive"
    }[r.type] || "Open";

    const pendingLabel = r.status === "pending-review" ? "Pending Review" : "Coming Soon";
    // Local media (video / pdf served from our own assets) opens in the modal.
    const isLocalMedia = isAvailable && (r.type === "video" || r.type === "pdf") && !/^https?:/i.test(src);
    const action = !isAvailable
      ? `<button class="rc-btn disabled" disabled>${pendingLabel}</button>`
      : isLocalMedia
        ? `<button class="rc-btn" data-view="${escapeHtml(r.id)}">${actionLabel} →</button>`
        : `<a class="rc-btn" href="${escapeHtml(src)}" ${/^https?:/i.test(src) ? 'target="_blank" rel="noopener"' : ""}>${actionLabel} →</a>`;

    card.innerHTML = `
      ${thumb}
      <div class="rc-body">
        <div class="rc-top">
          <span class="rc-type">${TYPE_ICON[r.type] || "📦"} ${TYPE_LABEL[r.type] || r.type}</span>
          ${statusBadge}
        </div>
        <h3 class="rc-title">${escapeHtml(r.title)}</h3>
        <div class="rc-cat">${escapeHtml(r.category)} ${levelBadge}</div>
        <p class="rc-desc">${escapeHtml(r.description)}</p>
        <div class="rc-tags">${tags}</div>
        <div class="rc-actions">
          ${action}
          <button class="rc-fav ${fav ? "active" : ""}" data-fav="${escapeHtml(r.id)}" title="Save to favorites" aria-label="Save">
            ${fav ? "★" : "☆"}
          </button>
        </div>
      </div>`;

    card.querySelector("[data-fav]").addEventListener("click", (e) => {
      e.preventDefault();
      const now = Favorites.toggle(r.id);
      const btn = e.currentTarget;
      btn.classList.toggle("active", now);
      btn.textContent = now ? "★" : "☆";
      // If we're on favorites page, re-render
      if (state.section === "favorites") renderSection("favorites");
    });

    const viewBtn = card.querySelector("[data-view]");
    if (viewBtn) viewBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openMediaModal(r);
    });

    return card;
  }

  /* ═══════ FILTER BAR (reusable) ═══════ */
  function buildFilterBar(section, onChange) {
    const bar = el("div", "filter-bar");

    const types = DataAPI.types(section === "search" ? null : section);
    const cats = DataAPI.categories(section === "search" ? null : section);

    const search = el("div", "filter-search");
    search.innerHTML = `<span class="fs-icon">🔍</span>
      <input type="text" id="f-search" placeholder="Search title, description, tags…" />`;

    const selType = el("select", "filter-select");
    selType.id = "f-type";
    selType.innerHTML = `<option value="">All types</option>` +
      types.map(t => `<option value="${t}">${TYPE_LABEL[t] || t}</option>`).join("");

    const selCat = el("select", "filter-select");
    selCat.id = "f-cat";
    selCat.innerHTML = `<option value="">All categories</option>` +
      cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");

    const selStatus = el("select", "filter-select");
    selStatus.id = "f-status";
    selStatus.innerHTML = `<option value="">Any status</option>
      <option value="available">Available</option>
      <option value="coming-soon">Coming Soon</option>`;

    const selSort = el("select", "filter-select");
    selSort.id = "f-sort";
    selSort.innerHTML = `<option value="az">A → Z</option>
      <option value="za">Z → A</option>
      <option value="status">Available first</option>`;

    bar.append(search, selType, selCat, selStatus, selSort);

    bar.querySelectorAll("input,select").forEach(node =>
      node.addEventListener("input", onChange));

    return bar;
  }

  function readFilters() {
    const g = (id) => (document.getElementById(id) || {}).value || "";
    return {
      q: g("f-search").trim().toLowerCase(),
      type: g("f-type"),
      cat: g("f-cat"),
      status: g("f-status"),
      sort: g("f-sort") || "az"
    };
  }

  function applyFilters(list, f) {
    let out = list.filter(r => {
      if (f.type && r.type !== f.type) return false;
      if (f.cat && r.category !== f.cat) return false;
      if (f.status && r.status !== f.status) return false;
      if (f.q) {
        const hay = (r.title + " " + r.description + " " + r.category + " " +
          (r.tags || []).join(" ")).toLowerCase();
        if (!hay.includes(f.q)) return false;
      }
      return true;
    });
    if (f.sort === "az") out.sort((a, b) => a.title.localeCompare(b.title));
    else if (f.sort === "za") out.sort((a, b) => b.title.localeCompare(a.title));
    else if (f.sort === "status")
      out.sort((a, b) => (a.status === b.status ? a.title.localeCompare(b.title) : a.status === "available" ? -1 : 1));
    return out;
  }

  /* ═══════ EMPTY / PLACEHOLDER STATE ═══════ */
  function emptyState(msg, sub) {
    const box = el("div", "empty-state");
    box.innerHTML = `
      <div class="empty-orbit">🛰️</div>
      <h3>${escapeHtml(msg)}</h3>
      <p>${escapeHtml(sub || "")}</p>`;
    return box;
  }

  /* ═══════ RENDER A GRID ═══════ */
  function renderGrid(container, list) {
    container.innerHTML = "";
    if (!list.length) {
      container.appendChild(emptyState("No resources match your filters",
        "Try clearing the search or choosing a different category."));
      return;
    }
    const grid = el("div", "res-grid");
    list.forEach(r => grid.appendChild(resourceCard(r)));
    container.appendChild(grid);
  }

  /* ═══════ STATE + ROUTER ═══════ */
  const state = { section: "home" };

  function setActiveNav(section) {
    document.querySelectorAll("[data-nav]").forEach(a => {
      a.classList.toggle("active", a.dataset.nav === section);
    });
  }

  function navigate(section, push = true) {
    if (!SECTIONS.some(s => s.id === section)) section = "home";
    state.section = section;
    setActiveNav(section);
    if (push) history.replaceState({ section }, "", "#" + section);
    renderSection(section);
    // close mobile menu
    document.body.classList.remove("nav-open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ═══════ SECTION RENDERERS ═══════ */
  const view = () => document.getElementById("view");

  function sectionHeader(sec) {
    const s = SECTIONS.find(x => x.id === sec) || {};
    const count = DataAPI.bySection(sec).length;
    return `
      <div class="section-header">
        <div class="section-tag">◆ ${escapeHtml((s.label || "").toUpperCase())}</div>
        <h2 class="section-title">${s.icon || ""} ${escapeHtml(s.label || "")}</h2>
        <p class="section-desc">${escapeHtml(s.tagline || "")}</p>
        ${count ? `<div class="section-count">${count} resource${count === 1 ? "" : "s"}</div>` : ""}
      </div>`;
  }

  function renderSection(sec) {
    const root = view();
    root.innerHTML = "";

    if (sec === "home") return renderHome(root);
    if (sec === "about") return renderAbout(root);
    if (sec === "favorites") return renderFavorites(root);
    if (sec === "search") return renderSearch(root);
    if (sec === "anatomy") return renderAnatomy(root);
    if (sec === "stage2") return renderStage2(root);
    if (sec === "prothesis") return renderProthesis(root);

    // Generic data-driven section
    const wrap = el("section", "section");
    wrap.innerHTML = sectionHeader(sec);
    const list = DataAPI.bySection(sec);

    if (!list.length) {
      wrap.appendChild(emptyState("This section is being prepared",
        "Resources will appear here soon. Check back shortly!"));
      root.appendChild(wrap);
      return;
    }

    const results = el("div", "results");
    const bar = buildFilterBar(sec, () => renderGrid(results, applyFilters(list, readFilters())));
    wrap.appendChild(bar);
    wrap.appendChild(results);
    root.appendChild(wrap);
    renderGrid(results, applyFilters(list, readFilters()));
  }

  /* ───────── HOME ───────── */
  function renderHome(root) {
    const counts = DataAPI.counts();

    // Hero
    const hero = el("header", "hub-hero");
    hero.innerHTML = `
      <div class="hero-orbit">
        <div class="orbit-ring r1"></div>
        <div class="orbit-ring r2"></div>
        <div class="orbit-ring r3"></div>
        <div class="tooth-center">🦷</div>
      </div>
      <div class="hero-content">
        <div class="hero-badge">🌌 ${escapeHtml(SITE.tagline)}</div>
        <h1 class="hero-title">
          <span class="title-word">Dento</span><span class="title-word gradient">Verse</span>
        </h1>
        <p class="hero-subtitle">
          ${escapeHtml(SITE.tagline)}. A premium, ever-growing digital library —
          dental anatomy, PDFs, videos, Telegram resources, notes, flashcards, quizzes and downloads,
          all in one futuristic academic portal.
        </p>
        <div class="hero-buttons">
          <a class="btn btn-primary" data-nav-btn="anatomy"><span>🦷 Explore Anatomy Atlas</span></a>
          <a class="btn btn-secondary" data-nav-btn="telegram"><span>✈️ Telegram Hub</span></a>
        </div>
        <div class="hero-stats">
          <div class="stat"><div class="stat-num">${RESOURCES.length}</div><div class="stat-label">Resources</div></div>
          <div class="stat"><div class="stat-num">${SECTIONS.filter(s=>!["home","search","about","favorites"].includes(s.id)).length}</div><div class="stat-label">Libraries</div></div>
          <div class="stat"><div class="stat-num">32</div><div class="stat-label">Teeth Atlas</div></div>
          <div class="stat"><div class="stat-num">∞</div><div class="stat-label">Scalable</div></div>
        </div>
      </div>`;
    root.appendChild(hero);

    // Category grid (explore sections)
    const catSec = el("section", "section");
    catSec.innerHTML = `
      <div class="section-header">
        <div class="section-tag">◆ EXPLORE THE HUB</div>
        <h2 class="section-title">All Libraries</h2>
        <p class="section-desc">Every section of the DentoVerse — click any card to dive in. New content is added continuously.</p>
      </div>`;
    const catGrid = el("div", "cat-grid");
    SECTIONS.filter(s => !["home", "search", "about", "favorites"].includes(s.id)).forEach(s => {
      const c = counts[s.id] || 0;
      const card = el("button", "cat-card");
      card.dataset.navBtn = s.id;
      card.innerHTML = `
        <div class="cat-icon">${s.icon}</div>
        <h3 class="cat-title">${escapeHtml(s.label)}</h3>
        <p class="cat-tagline">${escapeHtml(s.tagline)}</p>
        <div class="cat-meta">
          <span class="cat-count">${c} item${c === 1 ? "" : "s"}</span>
          <span class="cat-go">Open →</span>
        </div>`;
      catGrid.appendChild(card);
    });
    catSec.appendChild(catGrid);
    root.appendChild(catSec);

    // Featured row
    const featured = DataAPI.featured();
    if (featured.length) {
      const fSec = el("section", "section");
      fSec.innerHTML = `
        <div class="section-header">
          <div class="section-tag">◆ FEATURED</div>
          <h2 class="section-title">⭐ Highlights</h2>
          <p class="section-desc">Hand-picked resources available right now.</p>
        </div>`;
      const grid = el("div", "res-grid");
      featured.forEach(r => grid.appendChild(resourceCard(r)));
      fSec.appendChild(grid);
      root.appendChild(fSec);
    }
  }

  /* ───────── ANATOMY (bridge to sub-app) ───────── */
  function renderAnatomy(root) {
    const wrap = el("section", "section");
    wrap.innerHTML = sectionHeader("anatomy");
    const list = DataAPI.bySection("anatomy");
    const cta = el("div", "anatomy-cta");
    cta.innerHTML = `
      <div class="anatomy-cta-inner">
        <div class="ac-visual">
          <div class="ac-orbit"><span>🦷</span></div>
        </div>
        <div class="ac-text">
          <h3>Interactive Cosmic Tooth Atlas</h3>
          <p>Explore all 32 permanent teeth — chronology, surfaces, three numbering systems and clinical notes,
          in a fully interactive space-inspired experience.</p>
          <a class="btn btn-primary" href="dental_anatomy/index.html"><span>🚀 Launch The Atlas</span></a>
        </div>
      </div>`;
    wrap.appendChild(cta);
    if (list.length) {
      const grid = el("div", "res-grid");
      list.forEach(r => grid.appendChild(resourceCard(r)));
      wrap.appendChild(grid);
    }
    root.appendChild(wrap);
  }

  /* ───────── FAVORITES ───────── */
  function renderFavorites(root) {
    const wrap = el("section", "section");
    wrap.innerHTML = sectionHeader("favorites");
    const ids = Favorites.list();
    const list = ids.map(id => DataAPI.byId(id)).filter(Boolean);
    const results = el("div", "results");
    wrap.appendChild(results);
    if (!list.length) {
      results.appendChild(emptyState("No saved resources yet",
        "Tap the ☆ star on any resource card to save it here for quick access."));
    } else {
      renderGrid(results, list);
    }
    root.appendChild(wrap);
  }

  /* ───────── SEARCH (global) ───────── */
  function renderSearch(root) {
    const wrap = el("section", "section");
    wrap.innerHTML = sectionHeader("search");
    const results = el("div", "results");
    const all = DataAPI.all();
    const bar = buildFilterBar("search", () => renderGrid(results, applyFilters(all, readFilters())));
    wrap.appendChild(bar);
    wrap.appendChild(results);
    root.appendChild(wrap);
    renderGrid(results, applyFilters(all, readFilters()));
    const input = document.getElementById("f-search");
    if (input) input.focus();
  }

  /* ───────── ABOUT / CONTACT ───────── */
  function renderAbout(root) {
    const wrap = el("section", "section");
    wrap.innerHTML = `
      ${sectionHeader("about")}
      <div class="about-grid">
        <div class="about-card">
          <div class="card-icon">🛰️</div>
          <h3>The Mission</h3>
          <p>${escapeHtml(SITE.name)} is a growing, all-in-one academic hub for dental students —
          bringing anatomy, lectures, videos, notes, flashcards, quizzes and downloads together
          in one elegant, futuristic platform built to scale.</p>
        </div>
        <div class="about-card">
          <div class="card-icon">🎓</div>
          <h3>Organised by Course</h3>
          <p>Content is organised by course, level and category so it stays
          clean and easy to navigate as it grows to hundreds of resources.</p>
        </div>
        <div class="about-card">
          <div class="card-icon">🚀</div>
          <h3>Always Expanding</h3>
          <p>New PDFs, videos, Drive links, Telegram channels and interactive tools are added continuously.
          Save your favourites and check back often.</p>
        </div>
      </div>

      <div class="contact-panel">
        <h3 class="contact-title">📞 Need Help? Get in Touch</h3>
        <p class="contact-sub">Reach out directly for support, resource requests & feedback.</p>
        <div class="contact-links">
          <a class="contact-btn tg" href="${SITE.contact.telegram}" target="_blank" rel="noopener">✈️ Telegram ${escapeHtml(SITE.contact.telegramUser)}</a>
          <a class="contact-btn grp" href="${SITE.contact.whatsapp}" target="_blank" rel="noopener">💬 WhatsApp ${escapeHtml(SITE.contact.phoneDisplay)}</a>
          <a class="contact-btn bot" href="tel:${escapeHtml(SITE.contact.phone)}">📱 Call ${escapeHtml(SITE.contact.phoneDisplay)}</a>
        </div>
      </div>`;
    root.appendChild(wrap);
  }

  /* ───────── STAGE 2 DENTISTRY GUIDE ───────── */
  function renderStage2(root) {
    const wrap = el("section", "section");
    const g = window.STAGE2_GUIDE || { intro: "", buy: [], avoid: [], tips: [] };
    const stageRes = DataAPI.all().filter(r =>
      r.level === "Level 2" && r.status === "available");

    const buyItems = g.buy.map(i =>
      `<li><span class="s2-name">✓ ${escapeHtml(i.name)}</span><span class="s2-note">${escapeHtml(i.note)}</span></li>`).join("");
    const avoidItems = g.avoid.map(i =>
      `<li><span class="s2-name">✕ ${escapeHtml(i.name)}</span><span class="s2-note">${escapeHtml(i.note)}</span></li>`).join("");
    const tipItems = g.tips.map(t => `<li>💡 ${escapeHtml(t)}</li>`).join("");

    wrap.innerHTML = `
      ${sectionHeader("stage2")}
      <div class="s2-intro glass-panel">
        <div class="s2-intro-icon">🎓</div>
        <p>${escapeHtml(g.intro)}</p>
      </div>
      <div class="s2-columns">
        <div class="s2-col s2-buy glass-panel">
          <h3 class="s2-col-title buy">🛒 Worth Buying</h3>
          <ul class="s2-list">${buyItems}</ul>
        </div>
        <div class="s2-col s2-avoid glass-panel">
          <h3 class="s2-col-title avoid">⚠️ Skip / Don't Rush to Buy</h3>
          <ul class="s2-list">${avoidItems}</ul>
        </div>
      </div>
      <div class="s2-tips glass-panel">
        <h3 class="s2-col-title tips">🧭 Usage Tips & Student Advice</h3>
        <ul class="s2-tip-list">${tipItems}</ul>
      </div>
      <div class="section-header" style="margin-top:2.5rem">
        <div class="section-tag">◆ RELATED STAGE 2 RESOURCES</div>
        <h2 class="section-title">📦 Instruments, PDFs & Videos</h2>
        <p class="section-desc">The official instrument lists, guide videos and reference PDFs that back up this advice.</p>
      </div>
      <div class="s2-resources"></div>`;
    root.appendChild(wrap);

    const holder = wrap.querySelector(".s2-resources");
    if (stageRes.length) renderGrid(holder, stageRes);
    else holder.appendChild(emptyState("Stage 2 resources are on the way",
      "Instrument lists and videos will appear here soon."));
  }

  /* ───────── STAGE 2 PROTHESIS AREA (grouped, categorised) ───────── */
  function renderProthesis(root) {
    const wrap = el("section", "section");
    const groups = window.PROTHESIS_GROUPS || [];
    const all = DataAPI.bySection("prothesis");
    const available = all.filter(r => r.status === "available").length;

    wrap.innerHTML = `
      ${sectionHeader("prothesis")}
      <div class="pro-intro glass-panel">
        <div class="pro-intro-icon">🪥</div>
        <p>A dedicated, neatly organised area for <strong>practical Prothesis learning</strong> in Stage 2 Dentistry.
        Every video, Drive link and playlist is filed into a clear group below — search and filter across all of them,
        save your favourites, and open any resource with one tap. New material is added to these same groups over time.</p>
      </div>
      <div class="pro-metrics">
        <div class="pro-metric"><span class="pm-num">${all.length}</span><span class="pm-label">Resources</span></div>
        <div class="pro-metric"><span class="pm-num">${available}</span><span class="pm-label">Available</span></div>
        <div class="pro-metric"><span class="pm-num">${groups.length}</span><span class="pm-label">Groups</span></div>
      </div>
      <div class="pro-groups"></div>`;
    root.appendChild(wrap);

    const groupsHolder = wrap.querySelector(".pro-groups");

    const origIndex = new Map(all.map((r, i) => [r.id, i]));
    const paintGroups = () => {
      const f = readFilters();
      // Filter without reordering, then keep the curated data-file order.
      const filtered = applyFilters(all, f)
        .sort((a, b) => origIndex.get(a.id) - origIndex.get(b.id));
      groupsHolder.innerHTML = "";

      let anyShown = false;
      groups.forEach(g => {
        const items = filtered.filter(r => r.subcategory === g.key);
        const totalInGroup = all.filter(r => r.subcategory === g.key).length;

        // Hide a group entirely only if filters are active AND it has no matches.
        const filtersActive = f.q || f.type || f.cat || f.status;
        if (filtersActive && !items.length) return;
        anyShown = true;

        const block = el("div", "pro-group");
        block.innerHTML = `
          <div class="pro-group-head">
            <div class="pgh-left">
              <span class="pgh-icon">${g.icon || "📦"}</span>
              <div>
                <h3 class="pgh-title">${escapeHtml(g.title)}</h3>
                <p class="pgh-blurb">${escapeHtml(g.blurb || "")}</p>
              </div>
            </div>
            <span class="pgh-count">${items.length}/${totalInGroup}</span>
          </div>
          <div class="pro-group-body"></div>`;
        const body = block.querySelector(".pro-group-body");

        if (items.length) {
          const grid = el("div", "res-grid");
          items.forEach(r => grid.appendChild(resourceCard(r)));
          body.appendChild(grid);
        } else {
          // Polished empty-state / coming-soon placeholder for the group.
          const ph = el("div", "pro-empty");
          ph.innerHTML = `
            <div class="pro-empty-orbit">${g.icon || "🛰️"}</div>
            <h4>Coming Soon</h4>
            <p>No resources in <strong>${escapeHtml(g.title)}</strong> yet — this group is ready and will fill up as new material is added.</p>`;
          body.appendChild(ph);
        }
        groupsHolder.appendChild(block);
      });

      if (!anyShown) {
        groupsHolder.appendChild(emptyState("No resources match your filters",
          "Try clearing the search or choosing a different type, category or status."));
      }
    };

    const bar = buildFilterBar("prothesis", paintGroups);
    // Remove the sort control here — grouping defines the order.
    const sortSel = bar.querySelector("#f-sort");
    if (sortSel) sortSel.remove();
    wrap.insertBefore(bar, groupsHolder);
    paintGroups();
  }

  /* ───────── MEDIA MODAL (video / pdf viewer) ───────── */
  function openMediaModal(r) {
    closeMediaModal();
    const overlay = el("div", "media-modal");
    overlay.id = "media-modal";

    const mediaSrc = r.file || r.link || "";
    let body = "";
    if (r.type === "video") {
      body = `<video src="${escapeHtml(mediaSrc)}" controls autoplay playsinline preload="metadata"
                ${r.thumbnail ? `poster="${escapeHtml(r.thumbnail)}"` : ""}></video>`;
    } else {
      body = `<iframe src="${escapeHtml(mediaSrc)}" title="${escapeHtml(r.title)}"></iframe>`;
    }

    overlay.innerHTML = `
      <div class="mm-inner glass-panel">
        <div class="mm-head">
          <div class="mm-titles">
            <h3>${escapeHtml(r.title)}</h3>
            <span class="mm-cat">${escapeHtml(r.category)}${r.level ? " · " + escapeHtml(r.level) : ""}</span>
          </div>
          <div class="mm-actions">
            <a class="mm-open" href="${escapeHtml(mediaSrc)}" target="_blank" rel="noopener">↗ Open</a>
            <button class="mm-close" aria-label="Close">✕</button>
          </div>
        </div>
        <div class="mm-body">${body}</div>
        <p class="mm-desc">${escapeHtml(r.description)}</p>
      </div>`;

    document.body.appendChild(overlay);
    document.body.classList.add("modal-open");
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.closest(".mm-close")) closeMediaModal();
    });
    document.addEventListener("keydown", escCloseModal);
  }
  function escCloseModal(e) { if (e.key === "Escape") closeMediaModal(); }
  function closeMediaModal() {
    const m = document.getElementById("media-modal");
    if (m) {
      const v = m.querySelector("video");
      if (v) { try { v.pause(); } catch (e) {} }
      m.remove();
    }
    document.body.classList.remove("modal-open");
    document.removeEventListener("keydown", escCloseModal);
  }

  /* ═══════ NAV BADGE ═══════ */
  function updateFavBadge() {
    const n = Favorites.list().length;
    document.querySelectorAll("[data-fav-badge]").forEach(b => {
      b.textContent = n;
      b.style.display = n ? "inline-flex" : "none";
    });
  }

  /* ═══════ GLOBAL CLICK DELEGATION ═══════ */
  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-nav]");
    if (nav) { e.preventDefault(); navigate(nav.dataset.nav); return; }
    const navBtn = e.target.closest("[data-navBtn], [data-nav-btn]");
    if (navBtn) { e.preventDefault(); navigate(navBtn.dataset.navBtn); return; }
    if (e.target.closest(".menu-toggle")) {
      document.body.classList.toggle("nav-open");
    }
  });

  window.addEventListener("hashchange", () => {
    const sec = (location.hash || "#home").slice(1);
    if (sec !== state.section) navigate(sec, false);
  });

  /* ═══════ BOOT ═══════ */
  document.addEventListener("DOMContentLoaded", () => {
    buildNav();
    updateFavBadge();
    const sec = (location.hash || "#home").slice(1);
    navigate(SECTIONS.some(s => s.id === sec) ? sec : "home", false);
  });

  /* ═══════ BUILD NAV FROM DATA ═══════ */
  function buildNav() {
    const list = document.getElementById("nav-links");
    if (!list) return;
    list.innerHTML = "";
    SECTIONS.forEach(s => {
      const li = el("li");
      const a = el("a");
      a.href = "#" + s.id;
      a.dataset.nav = s.id;
      if (s.id === "favorites") {
        a.innerHTML = `${s.label} <span class="fav-badge" data-fav-badge>0</span>`;
      } else {
        a.textContent = s.label;
      }
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  window.DentoVerse = { navigate, Favorites };
})();
