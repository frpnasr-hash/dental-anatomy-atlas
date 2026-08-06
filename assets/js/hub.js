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
    if (sec === "biomaterials2") return renderBiomaterials2(root);
    if (sec === "bm2practical") return renderBM2Practical(root);
    if (sec === "oralbio") return renderOralBio(root);

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

    // NOTE: The former "⭐ Highlights" (Featured) section was removed to keep
    // the homepage short, clean and easy to navigate. The homepage now flows
    // straight from the DentoVerse hero into the "Explore the Hub → All
    // Libraries" grid, with no long trailing block.
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

  /* ───────── DENTAL BIOMATERIALS 2 · SEMESTER 1 (premium landing) ───────── */
  function renderBiomaterials2(root) {
    const meta = window.BIOMATERIALS2_META || {};
    const groups = window.BIOMATERIALS2_GROUPS || [];
    const all = DataAPI.bySection("biomaterials2");
    const available = all.filter(r => r.status === "available").length;
    const pending = all.filter(r => r.status !== "available").length;
    const total = all.length;
    const pct = total ? Math.round((available / total) * 100) : 0;

    // Only show groups that actually contain resources (plus keep the
    // scalable definition list intact for future additions).
    const activeGroups = groups.filter(g => all.some(r => r.category === g.key));
    const contact = (window.SITE && SITE.contact) || {};

    const wrap = el("section", "section bm2");
    wrap.innerHTML = `
      <!-- Hero banner -->
      <header class="bm2-hero glass-panel">
        <div class="bm2-hero-glow"></div>
        <div class="bm2-hero-content">
          <div class="bm2-badges">
            <span class="bm2-badge primary">🧪 ${escapeHtml(meta.courseCode || "DBM 2")}</span>
            <span class="bm2-badge">${escapeHtml(meta.semester || "Semester 1")}</span>
            <span class="bm2-badge">${escapeHtml(meta.year || "Second Year")}</span>
          </div>
          <h1 class="bm2-hero-title">${escapeHtml(meta.courseName || "Dental Biomaterials 2")}</h1>
          <p class="bm2-hero-sub">${escapeHtml(meta.intro || "")}</p>
          <div class="bm2-chips">
            <span class="bm2-chip"><span class="chip-num">${total}</span> Lectures</span>
            <span class="bm2-chip avail"><span class="chip-num">${available}</span> Available</span>
            <span class="bm2-chip"><span class="chip-num">${activeGroups.length}</span> Topics</span>
            ${pending ? `<span class="bm2-chip pending"><span class="chip-num">${pending}</span> Pending</span>` : ""}
          </div>
          <div class="bm2-progress">
            <div class="bm2-progress-head">
              <span>Course Materials Uploaded</span><span>${pct}%</span>
            </div>
            <div class="bm2-progress-track"><div class="bm2-progress-fill" style="width:${pct}%"></div></div>
          </div>
          <div class="bm2-hero-actions">
            <button class="btn btn-primary" data-scroll="bm2-lectures"><span>📚 Browse Lectures</span></button>
            <button class="btn btn-secondary" data-scroll="bm2-contact"><span>✉️ Request Materials</span></button>
          </div>
        </div>
      </header>

      <!-- Controls: search + category tabs -->
      <div id="bm2-lectures" class="bm2-controls">
        <div class="bm2-search">
          <span class="fs-icon">🔍</span>
          <input type="text" id="bm2-q" placeholder="Search lectures by title, topic, tag or description…" />
        </div>
        <div class="bm2-filter-row">
          <select class="filter-select" id="bm2-status">
            <option value="">Any status</option>
            <option value="available">Available</option>
            <option value="coming-soon">Coming Soon</option>
            <option value="pending-review">Pending Review</option>
          </select>
          <select class="filter-select" id="bm2-sort">
            <option value="num">Lecture order</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>
        </div>
      </div>
      <div class="bm2-tabs" id="bm2-tabs"></div>

      <!-- Grouped lecture grid -->
      <div class="bm2-groups" id="bm2-groups"></div>

      <!-- Contact / request materials -->
      <div id="bm2-contact" class="bm2-contact glass-panel">
        <div class="bm2-contact-icon">✉️</div>
        <div class="bm2-contact-text">
          <h3>Need a Lecture or Missing a File?</h3>
          <p>Reach out directly to request course materials, report a broken file or ask a question about ${escapeHtml(meta.courseName || "Dental Biomaterials 2")}.</p>
        </div>
        <div class="bm2-contact-actions">
          ${contact.telegram ? `<a class="contact-btn tg" href="${escapeHtml(contact.telegram)}" target="_blank" rel="noopener">✈️ Telegram${contact.telegramUser ? " " + escapeHtml(contact.telegramUser) : ""}</a>` : ""}
          ${contact.whatsapp ? `<a class="contact-btn grp" href="${escapeHtml(contact.whatsapp)}" target="_blank" rel="noopener">💬 WhatsApp${contact.phoneDisplay ? " " + escapeHtml(contact.phoneDisplay) : ""}</a>` : ""}
        </div>
      </div>`;
    root.appendChild(wrap);

    const tabsHolder = wrap.querySelector("#bm2-tabs");
    const groupsHolder = wrap.querySelector("#bm2-groups");

    const b2state = { cat: "all", q: "", status: "", sort: "num" };

    // Build category tabs (All + one per active group, with counts).
    const buildTabs = () => {
      tabsHolder.innerHTML = "";
      const mkTab = (key, icon, label, count) => {
        const t = el("button", "bm2-tab" + (b2state.cat === key ? " active" : ""));
        t.dataset.cat = key;
        t.innerHTML = `${icon ? `<span class="bm2-tab-icon">${icon}</span>` : ""}<span>${escapeHtml(label)}</span><span class="bm2-tab-count">${count}</span>`;
        t.addEventListener("click", () => { b2state.cat = key; buildTabs(); paint(); });
        tabsHolder.appendChild(t);
      };
      mkTab("all", "✦", "All", all.length);
      activeGroups.forEach(g => {
        const c = all.filter(r => r.category === g.key).length;
        mkTab(g.key, g.icon, g.title, c);
      });
    };

    const filterList = (list) => {
      let out = list.filter(r => {
        if (b2state.cat !== "all" && r.category !== b2state.cat) return false;
        if (b2state.status && r.status !== b2state.status) return false;
        if (b2state.q) {
          const hay = (r.title + " " + r.description + " " + r.category + " " +
            (r.tags || []).join(" ")).toLowerCase();
          if (!hay.includes(b2state.q)) return false;
        }
        return true;
      });
      if (b2state.sort === "az") out.sort((a, b) => a.title.localeCompare(b.title));
      else if (b2state.sort === "za") out.sort((a, b) => b.title.localeCompare(a.title));
      else out.sort((a, b) => (a.lectureNumber || 0) - (b.lectureNumber || 0));
      return out;
    };

    const paint = () => {
      const filtered = filterList(all);
      groupsHolder.innerHTML = "";

      if (!filtered.length) {
        groupsHolder.appendChild(emptyState("No lectures match your search",
          "Try clearing the search box, choosing a different topic tab, or resetting the status filter."));
        return;
      }

      // When a single category tab is selected, render one flat grid.
      // On "All", render grouped blocks in curated order.
      const renderGroupsOrder = b2state.cat === "all"
        ? activeGroups
        : activeGroups.filter(g => g.key === b2state.cat);

      renderGroupsOrder.forEach(g => {
        const items = filtered.filter(r => r.category === g.key);
        if (!items.length) return;
        const block = el("div", "bm2-group");
        block.innerHTML = `
          <div class="bm2-group-head">
            <span class="bm2-group-icon">${g.icon || "📦"}</span>
            <div class="bm2-group-titles">
              <h3>${escapeHtml(g.title)}</h3>
              <p>${escapeHtml(g.blurb || "")}</p>
            </div>
            <span class="bm2-group-count">${items.length}</span>
          </div>
          <div class="bm2-group-grid"></div>`;
        const grid = block.querySelector(".bm2-group-grid");
        items.forEach(r => grid.appendChild(biomatCard(r)));
        groupsHolder.appendChild(block);
      });
    };

    // Wire controls
    wrap.querySelector("#bm2-q").addEventListener("input", (e) => {
      b2state.q = e.target.value.trim().toLowerCase(); paint();
    });
    wrap.querySelector("#bm2-status").addEventListener("change", (e) => {
      b2state.status = e.target.value; paint();
    });
    wrap.querySelector("#bm2-sort").addEventListener("change", (e) => {
      b2state.sort = e.target.value; paint();
    });

    // Smooth-scroll hero buttons (avoid changing the route hash).
    wrap.querySelectorAll("[data-scroll]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const target = wrap.querySelector("#" + btn.dataset.scroll);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    buildTabs();
    paint();
  }

  /* ───────── ORAL BIOLOGY · SEMESTER 1 (premium landing) ─────────
     A dedicated, premium academic landing page for the second-year Oral
     Biology theoretical lectures. Fully data-driven — reads the oralbio
     resources and the ORALBIO_* meta/group definitions from data.js, and
     reuses the shared biomatCard, favorites store and media modal. */
  function renderOralBio(root) {
    const meta = window.ORALBIO_META || {};
    const groups = window.ORALBIO_GROUPS || [];
    const all = DataAPI.bySection("oralbio");
    const available = all.filter(r => r.status === "available").length;
    const pending = all.filter(r => r.status !== "available").length;
    const total = all.length;
    const pct = total ? Math.round((available / total) * 100) : 0;

    // Only show groups that actually contain resources (keeping the scalable
    // definition list intact for future additions).
    const activeGroups = groups.filter(g => all.some(r => r.category === g.key));
    const contact = (window.SITE && SITE.contact) || {};

    const wrap = el("section", "section bm2 oralbio");
    wrap.innerHTML = `
      <!-- Hero banner -->
      <header class="bm2-hero glass-panel">
        <div class="bm2-hero-glow"></div>
        <div class="bm2-hero-content">
          <div class="bm2-badges">
            <span class="bm2-badge primary">🔬 ${escapeHtml(meta.courseCode || "Oral Biology")}</span>
            <span class="bm2-badge">${escapeHtml(meta.semester || "Semester 1")}</span>
            <span class="bm2-badge">${escapeHtml(meta.year || "Second Year")}</span>
          </div>
          <h1 class="bm2-hero-title">${escapeHtml(meta.courseName || "Oral Biology")}</h1>
          <p class="bm2-hero-sub">${escapeHtml(meta.intro || "")}</p>
          <div class="bm2-chips">
            <span class="bm2-chip"><span class="chip-num">${total}</span> Lectures</span>
            <span class="bm2-chip avail"><span class="chip-num">${available}</span> Available</span>
            <span class="bm2-chip"><span class="chip-num">${activeGroups.length}</span> Topics</span>
            ${pending ? `<span class="bm2-chip pending"><span class="chip-num">${pending}</span> Pending</span>` : ""}
          </div>
          <div class="bm2-progress">
            <div class="bm2-progress-head">
              <span>Course Materials Uploaded</span><span>${pct}%</span>
            </div>
            <div class="bm2-progress-track"><div class="bm2-progress-fill" style="width:${pct}%"></div></div>
          </div>
          <div class="bm2-hero-actions">
            <button class="btn btn-primary" data-scroll="ob-lectures"><span>📚 Browse Lectures</span></button>
            <button class="btn btn-secondary" data-scroll="ob-contact"><span>✉️ Request Materials</span></button>
          </div>
        </div>
      </header>

      <!-- Controls: search + category tabs -->
      <div id="ob-lectures" class="bm2-controls">
        <div class="bm2-search">
          <span class="fs-icon">🔍</span>
          <input type="text" id="ob-q" placeholder="Search lectures by title, topic, tag or description…" />
        </div>
        <div class="bm2-filter-row">
          <select class="filter-select" id="ob-status">
            <option value="">Any status</option>
            <option value="available">Available</option>
            <option value="coming-soon">Coming Soon</option>
            <option value="pending-review">Pending Review</option>
          </select>
          <select class="filter-select" id="ob-sort">
            <option value="num">Lecture order</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>
        </div>
      </div>
      <div class="bm2-tabs" id="ob-tabs"></div>

      <!-- Grouped lecture grid -->
      <div class="bm2-groups" id="ob-groups"></div>

      <!-- Contact / request materials -->
      <div id="ob-contact" class="bm2-contact glass-panel">
        <div class="bm2-contact-icon">✉️</div>
        <div class="bm2-contact-text">
          <h3>Need a Lecture or Missing a File?</h3>
          <p>Reach out directly to request course materials, report a broken file or ask a question about ${escapeHtml(meta.courseName || "Oral Biology")}.</p>
        </div>
        <div class="bm2-contact-actions">
          ${contact.telegram ? `<a class="contact-btn tg" href="${escapeHtml(contact.telegram)}" target="_blank" rel="noopener">✈️ Telegram${contact.telegramUser ? " " + escapeHtml(contact.telegramUser) : ""}</a>` : ""}
          ${contact.whatsapp ? `<a class="contact-btn grp" href="${escapeHtml(contact.whatsapp)}" target="_blank" rel="noopener">💬 WhatsApp${contact.phoneDisplay ? " " + escapeHtml(contact.phoneDisplay) : ""}</a>` : ""}
        </div>
      </div>`;
    root.appendChild(wrap);

    const tabsHolder = wrap.querySelector("#ob-tabs");
    const groupsHolder = wrap.querySelector("#ob-groups");

    const obstate = { cat: "all", q: "", status: "", sort: "num" };

    // Build category tabs (All + one per active group, with counts).
    const buildTabs = () => {
      tabsHolder.innerHTML = "";
      const mkTab = (key, icon, label, count) => {
        const t = el("button", "bm2-tab" + (obstate.cat === key ? " active" : ""));
        t.dataset.cat = key;
        t.innerHTML = `${icon ? `<span class="bm2-tab-icon">${icon}</span>` : ""}<span>${escapeHtml(label)}</span><span class="bm2-tab-count">${count}</span>`;
        t.addEventListener("click", () => { obstate.cat = key; buildTabs(); paint(); });
        tabsHolder.appendChild(t);
      };
      mkTab("all", "✦", "All", all.length);
      activeGroups.forEach(g => {
        const c = all.filter(r => r.category === g.key).length;
        mkTab(g.key, g.icon, g.title, c);
      });
    };

    const filterList = (list) => {
      let out = list.filter(r => {
        if (obstate.cat !== "all" && r.category !== obstate.cat) return false;
        if (obstate.status && r.status !== obstate.status) return false;
        if (obstate.q) {
          const hay = (r.title + " " + r.description + " " + r.category + " " +
            (r.tags || []).join(" ")).toLowerCase();
          if (!hay.includes(obstate.q)) return false;
        }
        return true;
      });
      if (obstate.sort === "az") out.sort((a, b) => a.title.localeCompare(b.title));
      else if (obstate.sort === "za") out.sort((a, b) => b.title.localeCompare(a.title));
      else out.sort((a, b) => (a.lectureNumber || 0) - (b.lectureNumber || 0));
      return out;
    };

    const paint = () => {
      const filtered = filterList(all);
      groupsHolder.innerHTML = "";

      if (!filtered.length) {
        groupsHolder.appendChild(emptyState("No lectures match your search",
          "Try clearing the search box, choosing a different topic tab, or resetting the status filter."));
        return;
      }

      // On "All", render grouped blocks in curated order. When a single
      // category tab is selected, render just that group.
      const renderGroupsOrder = obstate.cat === "all"
        ? activeGroups
        : activeGroups.filter(g => g.key === obstate.cat);

      renderGroupsOrder.forEach(g => {
        const items = filtered.filter(r => r.category === g.key);
        if (!items.length) return;
        const block = el("div", "bm2-group");
        block.innerHTML = `
          <div class="bm2-group-head">
            <span class="bm2-group-icon">${g.icon || "📦"}</span>
            <div class="bm2-group-titles">
              <h3>${escapeHtml(g.title)}</h3>
              <p>${escapeHtml(g.blurb || "")}</p>
            </div>
            <span class="bm2-group-count">${items.length}</span>
          </div>
          <div class="bm2-group-grid"></div>`;
        const grid = block.querySelector(".bm2-group-grid");
        items.forEach(r => grid.appendChild(biomatCard(r)));
        groupsHolder.appendChild(block);
      });
    };

    // Wire controls
    wrap.querySelector("#ob-q").addEventListener("input", (e) => {
      obstate.q = e.target.value.trim().toLowerCase(); paint();
    });
    wrap.querySelector("#ob-status").addEventListener("change", (e) => {
      obstate.status = e.target.value; paint();
    });
    wrap.querySelector("#ob-sort").addEventListener("change", (e) => {
      obstate.sort = e.target.value; paint();
    });

    // Smooth-scroll hero buttons (avoid changing the route hash).
    wrap.querySelectorAll("[data-scroll]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const target = wrap.querySelector("#" + btn.dataset.scroll);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    buildTabs();
    paint();
  }

  /* Premium lecture card for the Biomaterials 2 section. Reuses the
     favorites store and media modal but has a richer academic layout. */
  function biomatCard(r, kind) {
    const isQuestion = kind === "question";
    const card = el("article", `bm2-card status-${r.status}${isQuestion ? " bm2-card-q" : ""}`);
    card.dataset.id = r.id;

    const src = r.file || r.link || "";
    const isReady = r.status === "available";
    const isAvailable = isReady && !!src;
    const fav = Favorites.has(r.id);
    const isLocalPdf = isAvailable && r.type === "pdf" && !/^https?:/i.test(src);

    const statusBadge = r.status === "available"
      ? `<span class="rc-status avail">● Available</span>`
      : r.status === "pending-review"
        ? `<span class="rc-status pending">🕵️ Pending Review</span>`
        : `<span class="rc-status soon">◔ Coming Soon</span>`;

    const tags = (r.tags || []).slice(0, 3)
      .map(t => `<span class="rc-tag">#${escapeHtml(t)}</span>`).join("");

    const num = r.lectureNumber ? String(r.lectureNumber).padStart(2, "0") : "•";
    const pendingLabel = r.status === "pending-review" ? "Pending Review" : "Coming Soon";
    const openLabel = isQuestion ? "🧠 Open" : "📖 Open";
    const previewLabel = isQuestion ? "👁️ Preview" : openLabel;

    const openBtn = !isAvailable
      ? `<button class="rc-btn disabled" disabled>${pendingLabel}</button>`
      : isLocalPdf
        ? `<button class="rc-btn" data-view="${escapeHtml(r.id)}">${previewLabel}</button>`
        : `<a class="rc-btn" href="${escapeHtml(src)}" ${/^https?:/i.test(src) ? 'target="_blank" rel="noopener"' : ""}>${openLabel}</a>`;

    const downloadBtn = isAvailable
      ? `<a class="rc-btn ghost" href="${escapeHtml(src)}" download title="Download PDF">⬇️ Download</a>`
      : "";

    const typePill = isQuestion
      ? `<span class="bm2-card-type q">🧠 Question File</span>`
      : `<span class="bm2-card-type">📄 PDF</span>`;

    card.innerHTML = `
      <div class="bm2-card-top">
        <span class="bm2-card-num">${num}</span>
        <div class="bm2-card-badges">
          ${typePill}
          ${statusBadge}
        </div>
      </div>
      <h3 class="bm2-card-title">${escapeHtml(r.title)}</h3>
      <div class="bm2-card-meta">
        <span class="bm2-meta-pill">${escapeHtml(r.category)}</span>
        <span class="bm2-meta-pill sem">${escapeHtml(r.semester || "Semester 1")}</span>
      </div>
      <p class="bm2-card-desc">${escapeHtml(r.description)}</p>
      <div class="bm2-card-tags">${tags}</div>
      <div class="bm2-card-actions">
        ${openBtn}
        ${downloadBtn}
        <button class="rc-fav ${fav ? "active" : ""}" data-fav="${escapeHtml(r.id)}" title="Save to favorites" aria-label="Save">
          ${fav ? "★" : "☆"}
        </button>
      </div>`;

    card.querySelector("[data-fav]").addEventListener("click", (e) => {
      e.preventDefault();
      const now = Favorites.toggle(r.id);
      const btn = e.currentTarget;
      btn.classList.toggle("active", now);
      btn.textContent = now ? "★" : "☆";
      if (state.section === "favorites") renderSection("favorites");
    });

    const viewBtn = card.querySelector("[data-view]");
    if (viewBtn) viewBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openMediaModal(r);
    });

    return card;
  }

  /* ───────── DENTAL BIOMATERIAL 2 · SEMESTER 1 — PRACTICAL (premium landing) ─────────
     Two clearly labelled sub-sections on one page: Practical Lectures and a
     Question Bank. Fully data-driven — reads bm2practical resources and the
     BM2P_* group/meta definitions from data.js. */
  function renderBM2Practical(root) {
    const meta = window.BM2P_META || {};
    const lecGroups = window.BM2P_LECTURE_GROUPS || [];
    const qGroups = window.BM2P_QUESTION_GROUPS || [];
    const all = DataAPI.bySection("bm2practical");
    const lectures = all.filter(r => r.subsection === "lectures");
    const questions = all.filter(r => r.subsection === "questions");
    const available = all.filter(r => r.status === "available").length;
    const pending = all.filter(r => r.status !== "available").length;
    const total = all.length;
    const pct = total ? Math.round((available / total) * 100) : 0;
    const contact = (window.SITE && SITE.contact) || {};

    const wrap = el("section", "section bm2 bm2p");
    wrap.innerHTML = `
      <!-- Hero banner -->
      <header class="bm2-hero glass-panel">
        <div class="bm2-hero-glow"></div>
        <div class="bm2-hero-content">
          <div class="bm2-badges">
            <span class="bm2-badge primary">🔬 ${escapeHtml(meta.courseCode || "DBM 2")} · Practical</span>
            <span class="bm2-badge">${escapeHtml(meta.semester || "Semester 1")}</span>
            <span class="bm2-badge">${escapeHtml(meta.year || "Second Year")}</span>
          </div>
          <h1 class="bm2-hero-title">${escapeHtml(meta.courseName || "Dental Biomaterial 2 — Practical")}</h1>
          <p class="bm2-hero-sub">${escapeHtml(meta.intro || "")}</p>
          <div class="bm2-chips">
            <span class="bm2-chip"><span class="chip-num">${lectures.length}</span> Practical Lectures</span>
            <span class="bm2-chip"><span class="chip-num">${questions.length}</span> Question Files</span>
            <span class="bm2-chip avail"><span class="chip-num">${available}</span> Available</span>
            ${pending ? `<span class="bm2-chip pending"><span class="chip-num">${pending}</span> Pending</span>` : ""}
          </div>
          <div class="bm2-progress">
            <div class="bm2-progress-head">
              <span>Course Materials Uploaded</span><span>${pct}%</span>
            </div>
            <div class="bm2-progress-track"><div class="bm2-progress-fill" style="width:${pct}%"></div></div>
          </div>
          <div class="bm2-hero-actions">
            <button class="btn btn-primary" data-scroll="bm2p-lectures"><span>🔬 Practical Lectures</span></button>
            <button class="btn btn-secondary" data-scroll="bm2p-questions"><span>🧠 Question Bank</span></button>
            <button class="btn btn-secondary" data-scroll="bm2p-contact"><span>✉️ Request Materials</span></button>
          </div>
        </div>
      </header>

      <!-- Global search across both sub-sections -->
      <div class="bm2-controls">
        <div class="bm2-search">
          <span class="fs-icon">🔍</span>
          <input type="text" id="bm2p-q" placeholder="Search lectures & questions by title, topic, tag or description…" />
        </div>
        <div class="bm2-filter-row">
          <select class="filter-select" id="bm2p-status">
            <option value="">Any status</option>
            <option value="available">Available</option>
            <option value="coming-soon">Coming Soon</option>
            <option value="pending-review">Pending Review</option>
          </select>
          <select class="filter-select" id="bm2p-sort">
            <option value="num">Lecture order</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>
        </div>
      </div>

      <!-- ══ PRACTICAL LECTURES ══ -->
      <div id="bm2p-lectures" class="bm2p-subsection">
        <div class="bm2p-sub-head">
          <div class="bm2p-sub-head-left">
            <span class="bm2p-sub-icon">🔬</span>
            <div>
              <h2 class="bm2p-sub-title">Practical Lectures</h2>
              <p class="bm2p-sub-blurb">The official second-year practical lecture files, grouped by academic theme.</p>
            </div>
          </div>
          <span class="bm2p-sub-count">${lectures.length} files</span>
        </div>
        <div class="bm2-tabs" id="bm2p-lec-tabs"></div>
        <div class="bm2-groups" id="bm2p-lec-groups"></div>
      </div>

      <!-- ══ QUESTION BANK ══ -->
      <div id="bm2p-questions" class="bm2p-subsection bm2p-qb">
        <div class="bm2p-sub-head">
          <div class="bm2p-sub-head-left">
            <span class="bm2p-sub-icon">🧠</span>
            <div>
              <h2 class="bm2p-sub-title">Question Bank</h2>
              <p class="bm2p-sub-blurb">Exam-preparation question sets — MCQs and short questions grouped for focused revision.</p>
            </div>
          </div>
          <span class="bm2p-sub-count">${questions.length} files</span>
        </div>
        <div class="bm2-tabs" id="bm2p-q-tabs"></div>
        <div class="bm2-groups" id="bm2p-q-groups"></div>
      </div>

      <!-- Contact / request materials -->
      <div id="bm2p-contact" class="bm2-contact glass-panel">
        <div class="bm2-contact-icon">✉️</div>
        <div class="bm2-contact-text">
          <h3>Need a Lecture or Missing a File?</h3>
          <p>Reach out directly to request course materials, report a broken file or ask a question about ${escapeHtml(meta.courseName || "Dental Biomaterial 2 — Practical")}.</p>
        </div>
        <div class="bm2-contact-actions">
          ${contact.telegram ? `<a class="contact-btn tg" href="${escapeHtml(contact.telegram)}" target="_blank" rel="noopener">✈️ Telegram${contact.telegramUser ? " " + escapeHtml(contact.telegramUser) : ""}</a>` : ""}
          ${contact.whatsapp ? `<a class="contact-btn grp" href="${escapeHtml(contact.whatsapp)}" target="_blank" rel="noopener">💬 WhatsApp${contact.phoneDisplay ? " " + escapeHtml(contact.phoneDisplay) : ""}</a>` : ""}
        </div>
      </div>`;
    root.appendChild(wrap);

    // Shared filter state across both sub-sections.
    const st = { q: "", status: "", sort: "num", lecCat: "all", qCat: "all" };

    const filterList = (list) => {
      let out = list.filter(r => {
        if (st.status && r.status !== st.status) return false;
        if (st.q) {
          const hay = (r.title + " " + r.description + " " + r.category + " " +
            (r.tags || []).join(" ")).toLowerCase();
          if (!hay.includes(st.q)) return false;
        }
        return true;
      });
      if (st.sort === "az") out.sort((a, b) => a.title.localeCompare(b.title));
      else if (st.sort === "za") out.sort((a, b) => b.title.localeCompare(a.title));
      else out.sort((a, b) => (a.lectureNumber || 0) - (b.lectureNumber || 0));
      return out;
    };

    // Generic renderer for one sub-section (lectures or questions).
    function renderBlock(cfg) {
      const items = cfg.items;
      const groups = cfg.groups;
      const tabsHolder = wrap.querySelector(cfg.tabsSel);
      const groupsHolder = wrap.querySelector(cfg.groupsSel);
      const activeGroups = groups.filter(g => items.some(r => r.category === g.key));

      const buildTabs = () => {
        tabsHolder.innerHTML = "";
        const mkTab = (key, icon, label, count) => {
          const t = el("button", "bm2-tab" + (cfg.getCat() === key ? " active" : ""));
          t.innerHTML = `${icon ? `<span class="bm2-tab-icon">${icon}</span>` : ""}<span>${escapeHtml(label)}</span><span class="bm2-tab-count">${count}</span>`;
          t.addEventListener("click", () => { cfg.setCat(key); buildTabs(); paint(); });
          tabsHolder.appendChild(t);
        };
        mkTab("all", "✦", "All", items.length);
        activeGroups.forEach(g => {
          const c = items.filter(r => r.category === g.key).length;
          mkTab(g.key, g.icon, g.title, c);
        });
      };

      const paint = () => {
        const filtered = filterList(items);
        groupsHolder.innerHTML = "";
        if (!filtered.length) {
          groupsHolder.appendChild(emptyState("No files match your search",
            "Try clearing the search box, choosing a different tab, or resetting the status filter."));
          return;
        }
        const order = cfg.getCat() === "all"
          ? activeGroups
          : activeGroups.filter(g => g.key === cfg.getCat());
        order.forEach(g => {
          const gi = filtered.filter(r => r.category === g.key);
          if (!gi.length) return;
          const block = el("div", "bm2-group");
          block.innerHTML = `
            <div class="bm2-group-head">
              <span class="bm2-group-icon">${g.icon || "📦"}</span>
              <div class="bm2-group-titles">
                <h3>${escapeHtml(g.title)}</h3>
                <p>${escapeHtml(g.blurb || "")}</p>
              </div>
              <span class="bm2-group-count">${gi.length}</span>
            </div>
            <div class="bm2-group-grid"></div>`;
          const grid = block.querySelector(".bm2-group-grid");
          gi.forEach(r => grid.appendChild(biomatCard(r, cfg.kind)));
          groupsHolder.appendChild(block);
        });
      };

      cfg.buildTabs = buildTabs;
      cfg.paint = paint;
      buildTabs();
      paint();
      return cfg;
    }

    const lecCfg = renderBlock({
      kind: "lecture",
      items: lectures,
      groups: lecGroups,
      tabsSel: "#bm2p-lec-tabs",
      groupsSel: "#bm2p-lec-groups",
      getCat: () => st.lecCat,
      setCat: (v) => { st.lecCat = v; }
    });
    const qCfg = renderBlock({
      kind: "question",
      items: questions,
      groups: qGroups,
      tabsSel: "#bm2p-q-tabs",
      groupsSel: "#bm2p-q-groups",
      getCat: () => st.qCat,
      setCat: (v) => { st.qCat = v; }
    });

    const repaintAll = () => { lecCfg.paint(); qCfg.paint(); };

    wrap.querySelector("#bm2p-q").addEventListener("input", (e) => {
      st.q = e.target.value.trim().toLowerCase(); repaintAll();
    });
    wrap.querySelector("#bm2p-status").addEventListener("change", (e) => {
      st.status = e.target.value; repaintAll();
    });
    wrap.querySelector("#bm2p-sort").addEventListener("change", (e) => {
      st.sort = e.target.value; repaintAll();
    });

    wrap.querySelectorAll("[data-scroll]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const target = wrap.querySelector("#" + btn.dataset.scroll);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
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
