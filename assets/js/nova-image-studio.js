/* ═══════════════════════════════════════════════════════════════
   DENTOVERSE — NOVA AI · IMAGE DESIGN STUDIO (Phase 3 UI)
   ───────────────────────────────────────────────────────────────
   Premium image-creation interface layered on top of NovaImage
   (assets/js/nova-image.js). Additive & non-destructive: nothing
   in the existing hub / assistant is modified — the studio opens
   as its own glass overlay with:

     • image request input + suggestive AI flow
     • 13 style presets · quality tiers · aspect/format control
     • composition picker
     • refined prompt output + negative prompt
     • variant tabs (short / detailed / stylized / professional /
       safe / academic)
     • improve (iterative refinement) · regenerate · copy · save
     • prompt history + saved prompt library + template library
     • image result placeholders OR real generation when the
       optional backend (/api/nova-image) is configured
     • full EN / AR (MSA + Egyptian) support with RTL

   Public API: window.NovaImageStudio = { open, close, openWith }

   Designed & Produced by Abdel Rahman Teba © ®
   ═══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";
  if (typeof window === "undefined") return;

  const $img = () => window.NovaImage;

  /* ───────── i18n ───────── */
  const I18N = {
    en: {
      dir: "ltr",
      title: "Nova · Image Design Studio",
      tag: "Prompt Intelligence",
      close: "Close",
      inputLabel: "Describe the image you want",
      inputPh: "e.g. design a dental education poster about molar anatomy…",
      craft: "Craft Prompt ✨",
      presets: "Style preset",
      quality: "Quality",
      format: "Format",
      composition: "Composition",
      promptOut: "Refined prompt",
      negOut: "Negative prompt",
      variants: "Versions",
      improvePh: "Refine it… e.g. “more cinematic”, “change colors to deep blue and orange”",
      improve: "Improve",
      regenerate: "↻ Regenerate",
      copy: "Copy",
      copied: "Prompt copied ✓",
      save: "☆ Save",
      saved: "Saved to your prompt library ✓",
      generate: "Generate Image",
      generateOff: "Generate with connected model",
      generating: "Generating…",
      noBackend: "No image backend connected yet — your prompt is production-ready. Paste it into any image model, or connect a backend to generate here.",
      genFailed: "Generation failed — the prompt is still ready to use anywhere.",
      history: "History",
      library: "Templates",
      savedTab: "Saved",
      result: "Result",
      emptyHistory: "Prompts you craft will appear here.",
      emptySaved: "Save your best prompts to reuse them.",
      useTpl: "Use",
      suggestTitle: "Nova suggests",
      gapLead: "To make it even better, tell me:",
      autoNote: "Nova auto-detected:",
      fbGood: "Good result",
      fbBad: "Needs work",
      fbThanks: "Thanks — Nova will remember what works for you.",
      learned: "★ Based on your past favorites",
      placeholderCard: "Your image will appear here once a generation backend is connected. The prompt below is ready for any professional image model.",
      openStudio: "🎨 Image Studio"
    },
    ar: {
      dir: "rtl",
      title: "نوفا · استوديو تصميم الصور",
      tag: "ذكاء البرومبت",
      close: "إغلاق",
      inputLabel: "اوصف الصورة اللي عايزها",
      inputPh: "مثال: صمّم بوستر تعليمي عن تشريح الضرس…",
      craft: "جهّز البرومبت ✨",
      presets: "الستايل",
      quality: "الجودة",
      format: "المقاس",
      composition: "التكوين",
      promptOut: "البرومبت النهائي",
      negOut: "البرومبت السلبي",
      variants: "النسخ",
      improvePh: "حسّنه… مثلاً «سينمائي أكتر» أو «غير الألوان لأزرق وبرتقالي»",
      improve: "حسّن",
      regenerate: "↻ إعادة توليد",
      copy: "نسخ",
      copied: "تم نسخ البرومبت ✓",
      save: "☆ حفظ",
      saved: "اتحفظ في مكتبتك ✓",
      generate: "توليد الصورة",
      generateOff: "التوليد بالموديل المتصل",
      generating: "جاري التوليد…",
      noBackend: "لسه مفيش موديل صور متوصّل — البرومبت جاهز للاستخدام في أي موديل احترافي، أو وصّل باكند للتوليد هنا.",
      genFailed: "التوليد فشل — البرومبت لسه جاهز تستخدمه في أي مكان.",
      history: "السجل",
      library: "قوالب",
      savedTab: "المحفوظ",
      result: "النتيجة",
      emptyHistory: "البرومبتات اللي بتعملها هتظهر هنا.",
      emptySaved: "احفظ أحسن برومبتاتك عشان تعيد استخدامها.",
      useTpl: "استخدم",
      suggestTitle: "اقتراح نوفا",
      gapLead: "عشان تبقى أحسن، قولّي:",
      autoNote: "نوفا اكتشف تلقائياً:",
      fbGood: "نتيجة حلوة",
      fbBad: "محتاجة شغل",
      fbThanks: "شكراً — نوفا هيفتكر إيه اللي بيعجبك.",
      learned: "★ مبني على اختياراتك السابقة",
      placeholderCard: "الصورة هتظهر هنا أول ما يتوصّل باكند توليد. البرومبت تحت جاهز لأي موديل صور احترافي.",
      openStudio: "🎨 استوديو الصور"
    }
  };

  const S = {
    lang: "en",
    open: false,
    spec: null,
    variants: null,
    activeVariant: "detailed",
    lastEntry: null,
    tab: "history",
    el: {}
  };
  const t = (k) => (I18N[S.lang] && I18N[S.lang][k]) || I18N.en[k] || k;
  const esc = (s) => String(s == null ? "" : s).replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };

  function toast(msg, emoji) {
    try {
      if (window.DentoVerseEnhance && typeof window.DentoVerseEnhance.toast === "function") return window.DentoVerseEnhance.toast(msg, emoji || "🎨");
      if (window.NovaAssistant && typeof window.NovaAssistant.toast === "function") return window.NovaAssistant.toast(msg, emoji || "🎨");
    } catch (e) {}
    const n = el("div", "nis-toast", `${emoji || "🎨"} ${esc(msg)}`);
    document.body.appendChild(n);
    requestAnimationFrame(() => n.classList.add("show"));
    setTimeout(() => { n.classList.remove("show"); setTimeout(() => n.remove(), 350); }, 2400);
  }

  /* ───────── build overlay ───────── */
  function buildUI() {
    if (S.el.overlay) return;
    const overlay = el("div", "nis-overlay");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Nova Image Design Studio");
    overlay.innerHTML = `
      <div class="nis-panel">
        <div class="nis-glow"></div>
        <header class="nis-head">
          <div class="nis-head-id">
            <span class="nis-orb">🎨</span>
            <div><h3 data-nis="title"></h3><p class="nis-tag" data-nis="tag"></p></div>
          </div>
          <div class="nis-head-actions">
            <button class="nis-icon-btn" data-nis-act="lang" title="العربية / English">🌐</button>
            <button class="nis-icon-btn" data-nis-act="close" data-nis-title="close">✕</button>
          </div>
        </header>

        <div class="nis-body">
          <div class="nis-main">
            <!-- request -->
            <section class="nis-block">
              <label class="nis-label" data-nis="inputLabel"></label>
              <div class="nis-req">
                <textarea class="nis-input" id="nis-request" rows="2" data-nis-ph="inputPh"></textarea>
                <button class="nis-btn primary" id="nis-craft" data-nis="craft"></button>
              </div>
              <div class="nis-suggest" id="nis-suggest" hidden></div>
            </section>

            <!-- controls -->
            <section class="nis-block nis-controls">
              <div class="nis-ctl">
                <span class="nis-label" data-nis="presets"></span>
                <div class="nis-chips" id="nis-presets"></div>
              </div>
              <div class="nis-ctl-row">
                <div class="nis-ctl">
                  <span class="nis-label" data-nis="quality"></span>
                  <div class="nis-chips small" id="nis-quality"></div>
                </div>
                <div class="nis-ctl">
                  <span class="nis-label" data-nis="format"></span>
                  <div class="nis-chips small" id="nis-formats"></div>
                </div>
              </div>
              <div class="nis-ctl">
                <span class="nis-label" data-nis="composition"></span>
                <div class="nis-chips small" id="nis-comps"></div>
              </div>
            </section>

            <!-- output -->
            <section class="nis-block nis-output" id="nis-output" hidden>
              <div class="nis-variant-tabs" id="nis-variants"></div>
              <div class="nis-prompt-wrap">
                <span class="nis-label" data-nis="promptOut"></span>
                <div class="nis-prompt" id="nis-prompt" contenteditable="true" spellcheck="false"></div>
              </div>
              <div class="nis-prompt-wrap neg">
                <span class="nis-label" data-nis="negOut"></span>
                <div class="nis-prompt neg" id="nis-negative" contenteditable="true" spellcheck="false"></div>
              </div>
              <div class="nis-actions">
                <button class="nis-btn" id="nis-copy"></button>
                <button class="nis-btn" id="nis-save"></button>
                <button class="nis-btn" id="nis-regen"></button>
                <button class="nis-btn accent" id="nis-generate"></button>
              </div>
              <div class="nis-refine">
                <input type="text" class="nis-input slim" id="nis-refine-input" data-nis-ph="improvePh" />
                <button class="nis-btn primary" id="nis-improve" data-nis="improve"></button>
              </div>
              <div class="nis-notes" id="nis-notes" hidden></div>
              <div class="nis-result" id="nis-result" hidden></div>
              <div class="nis-feedback" id="nis-feedback">
                <button class="nis-fb good" id="nis-fb-good"></button>
                <button class="nis-fb bad" id="nis-fb-bad"></button>
              </div>
            </section>
          </div>

          <!-- side: history / templates / saved -->
          <aside class="nis-side">
            <div class="nis-side-tabs">
              <button class="nis-side-tab active" data-nis-tab="history" data-nis="history"></button>
              <button class="nis-side-tab" data-nis-tab="library" data-nis="library"></button>
              <button class="nis-side-tab" data-nis-tab="saved" data-nis="savedTab"></button>
            </div>
            <div class="nis-side-body" id="nis-side-body"></div>
          </aside>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    S.el.overlay = overlay;

    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('[data-nis-act="close"]').addEventListener("click", close);
    overlay.querySelector('[data-nis-act="lang"]').addEventListener("click", () => { setLang(S.lang === "ar" ? "en" : "ar"); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && S.open) close(); });

    overlay.querySelector("#nis-craft").addEventListener("click", craft);
    overlay.querySelector("#nis-request").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); craft(); }
    });
    overlay.querySelector("#nis-copy").addEventListener("click", copyPrompt);
    overlay.querySelector("#nis-save").addEventListener("click", savePrompt);
    overlay.querySelector("#nis-regen").addEventListener("click", regenerate);
    overlay.querySelector("#nis-generate").addEventListener("click", generateImage);
    overlay.querySelector("#nis-improve").addEventListener("click", improve);
    overlay.querySelector("#nis-refine-input").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); improve(); } });
    overlay.querySelector("#nis-fb-good").addEventListener("click", () => feedback(true));
    overlay.querySelector("#nis-fb-bad").addEventListener("click", () => feedback(false));
    overlay.querySelectorAll(".nis-side-tab").forEach(b => b.addEventListener("click", () => { S.tab = b.dataset.nisTab; overlay.querySelectorAll(".nis-side-tab").forEach(x => x.classList.toggle("active", x === b)); renderSide(); }));

    // prompt edits feed the learning loop
    overlay.querySelector("#nis-prompt").addEventListener("blur", () => {
      const NI = $img(); if (!NI || !S.lastEntry) return;
      const cur = overlay.querySelector("#nis-prompt").textContent.trim();
      if (cur && cur !== S.lastEntry.prompt) { NI.Memory.noteEdit(S.lastEntry.prompt, cur); S.lastEntry.prompt = cur; }
    });

    buildControls();
    applyLang();
    renderSide();
  }

  function buildControls() {
    const NI = $img(); if (!NI) return;
    const o = S.el.overlay;

    const presets = o.querySelector("#nis-presets");
    presets.innerHTML = "";
    Object.values(NI.Presets).forEach(p => {
      const b = el("button", "nis-chip", `${p.icon} <span>${S.lang === "ar" ? esc(p.labelAr) : esc(p.label)}</span>`);
      b.dataset.preset = p.id;
      b.addEventListener("click", () => { selectChip(presets, b); if (S.spec) { S.spec.preset = p.id; regenerate(true); } });
      presets.appendChild(b);
    });

    const quality = o.querySelector("#nis-quality");
    quality.innerHTML = "";
    Object.values(NI.Quality).forEach(q => {
      const b = el("button", "nis-chip", S.lang === "ar" ? esc(q.labelAr) : esc(q.label));
      b.dataset.quality = q.id;
      b.addEventListener("click", () => { selectChip(quality, b); if (S.spec) { S.spec.quality = q.id; regenerate(true); } });
      quality.appendChild(b);
    });

    const formats = o.querySelector("#nis-formats");
    formats.innerHTML = "";
    Object.values(NI.Formats.list).forEach(f => {
      const b = el("button", "nis-chip", `${f.icon} <span>${S.lang === "ar" ? esc(f.labelAr) : esc(f.label)}</span> <em>${f.ratio}</em>`);
      b.dataset.format = f.id; b.title = f.hint;
      b.addEventListener("click", () => { selectChip(formats, b); if (S.spec) { S.spec.format = f.id; regenerate(true); } });
      formats.appendChild(b);
    });

    const comps = o.querySelector("#nis-comps");
    comps.innerHTML = "";
    Object.values(NI.Compositions).forEach(c => {
      const b = el("button", "nis-chip", S.lang === "ar" ? esc(c.labelAr) : esc(c.label));
      b.dataset.comp = c.id;
      b.addEventListener("click", () => { selectChip(comps, b); if (S.spec) { S.spec.composition = c.id; regenerate(true); } });
      comps.appendChild(b);
    });
  }
  function selectChip(container, btn) {
    container.querySelectorAll(".nis-chip").forEach(x => x.classList.toggle("active", x === btn));
  }
  function reflectSpecInControls() {
    const o = S.el.overlay; if (!o || !S.spec) return;
    [["#nis-presets", "preset", S.spec.preset], ["#nis-quality", "quality", S.spec.quality],
     ["#nis-formats", "format", S.spec.format], ["#nis-comps", "comp", S.spec.composition]].forEach(([sel, key, val]) => {
      o.querySelectorAll(sel + " .nis-chip").forEach(c => c.classList.toggle("active", c.dataset[key] === val));
    });
  }

  /* ───────── language ───────── */
  function setLang(lang) { S.lang = lang === "ar" ? "ar" : "en"; applyLang(); buildControls(); reflectSpecInControls(); renderSide(); if (S.variants) renderOutput(); }
  function applyLang() {
    const o = S.el.overlay; if (!o) return;
    const info = I18N[S.lang];
    o.querySelector(".nis-panel").setAttribute("dir", info.dir);
    o.querySelector(".nis-panel").classList.toggle("rtl", info.dir === "rtl");
    o.querySelectorAll("[data-nis]").forEach(n => { n.textContent = t(n.dataset.nis); });
    o.querySelectorAll("[data-nis-ph]").forEach(n => { n.setAttribute("placeholder", t(n.dataset.nisPh)); });
    o.querySelectorAll("[data-nis-title]").forEach(n => { n.title = t(n.dataset.nisTitle); });
    o.querySelector("#nis-copy").textContent = "⧉ " + t("copy");
    o.querySelector("#nis-save").textContent = t("save");
    o.querySelector("#nis-regen").textContent = t("regenerate");
    o.querySelector("#nis-fb-good").textContent = "👍 " + t("fbGood");
    o.querySelector("#nis-fb-bad").textContent = "👎 " + t("fbBad");
    updateGenerateBtn();
  }
  function updateGenerateBtn() {
    const NI = $img(); const o = S.el.overlay; if (!o) return;
    const b = o.querySelector("#nis-generate");
    const on = NI && NI.Backend.available;
    b.textContent = on ? ("⚡ " + t("generate")) : ("🔌 " + t("generateOff"));
    b.classList.toggle("off", !on);
  }

  /* ───────── craft flow ───────── */
  function craft() {
    const NI = $img(); if (!NI) return;
    const o = S.el.overlay;
    const text = o.querySelector("#nis-request").value.trim();
    if (!text) return;

    // auto language follow
    const det = NI.detectLang(text);
    if (det.lang !== S.lang) setLang(det.lang);

    let spec = NI.Understand.parse(text);
    spec = NI.Understand.personalize(spec, {});
    S.spec = spec;
    S.variants = NI.Variants(spec);
    S.activeVariant = "detailed";
    reflectSpecInControls();
    renderSuggestions(spec);
    renderOutput();
    rememberCurrent();
    renderSide();
  }

  function renderSuggestions(spec) {
    const NI = $img();
    const o = S.el.overlay;
    const box = o.querySelector("#nis-suggest");
    const gaps = NI.Understand.missingDetails(spec);
    const p = NI.Presets[spec.preset];
    const f = NI.Formats.list[spec.format];
    const auto = `<div class="nis-auto"><strong>${t("autoNote")}</strong> ${p.icon} ${S.lang === "ar" ? esc(p.labelAr) : esc(p.label)} · ${f.icon} ${S.lang === "ar" ? esc(f.labelAr) : esc(f.label)} (${f.ratio})${NI.Memory.preferredPreset() === spec.preset ? ` <span class="nis-learned">${t("learned")}</span>` : ""}</div>`;
    let gapHtml = "";
    if (gaps.length) {
      gapHtml = `<div class="nis-gaps"><strong>${t("gapLead")}</strong><ul>` +
        gaps.map(g => `<li>${esc(S.lang === "ar" ? g.ar : g.en)}</li>`).join("") + `</ul></div>`;
    }
    box.innerHTML = `<div class="nis-suggest-head">💡 ${t("suggestTitle")}</div>` + auto + gapHtml;
    box.hidden = false;
  }

  function renderOutput() {
    const o = S.el.overlay;
    const out = o.querySelector("#nis-output");
    out.hidden = false;

    // variant tabs
    const tabs = o.querySelector("#nis-variants");
    tabs.innerHTML = "";
    Object.values(S.variants).forEach(v => {
      const b = el("button", "nis-vtab" + (v.id === S.activeVariant ? " active" : ""), S.lang === "ar" ? esc(v.labelAr) : esc(v.label));
      b.addEventListener("click", () => { S.activeVariant = v.id; renderOutput(); rememberCurrent(); });
      tabs.appendChild(b);
    });

    const v = S.variants[S.activeVariant] || S.variants.detailed;
    o.querySelector("#nis-prompt").textContent = v.prompt;
    o.querySelector("#nis-negative").textContent = v.negative;
    o.querySelector("#nis-notes").hidden = true;
    o.querySelector("#nis-result").hidden = true;
    updateGenerateBtn();
    out.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function currentPromptEntry() {
    const o = S.el.overlay;
    const v = S.variants && (S.variants[S.activeVariant] || S.variants.detailed);
    if (!v || !S.spec) return null;
    return {
      subject: S.spec.subject,
      preset: S.spec.preset,
      format: S.spec.format,
      quality: S.spec.quality,
      composition: S.spec.composition,
      variant: S.activeVariant,
      lang: S.spec.lang,
      prompt: o.querySelector("#nis-prompt").textContent.trim() || v.prompt,
      negative: o.querySelector("#nis-negative").textContent.trim() || v.negative
    };
  }
  function rememberCurrent() {
    const NI = $img(); const entry = currentPromptEntry();
    if (NI && entry) { NI.Memory.remember(entry); S.lastEntry = entry; }
  }

  /* ───────── actions ───────── */
  function copyPrompt() {
    const entry = currentPromptEntry(); if (!entry) return;
    const txt = entry.prompt + (entry.negative ? "\n\nNegative prompt: " + entry.negative : "");
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(
      () => toast(t("copied"), "⧉"),
      () => { const ta = el("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); toast(t("copied"), "⧉"); } catch (e) {} ta.remove(); }
    );
  }
  function savePrompt() {
    const NI = $img(); const entry = currentPromptEntry(); if (!NI || !entry) return;
    NI.Memory.savePrompt(entry);
    toast(t("saved"), "☆");
    renderSide();
  }
  function regenerate(silent) {
    const NI = $img(); if (!NI || !S.spec) return;
    S.spec.id = "p" + Date.now().toString(36);
    S.variants = NI.Variants(S.spec);
    renderOutput();
    if (!silent) rememberCurrent();
  }
  function improve() {
    const NI = $img(); if (!NI || !S.spec) return;
    const o = S.el.overlay;
    const instruction = o.querySelector("#nis-refine-input").value.trim();
    if (!instruction) return;
    const { spec, notes } = NI.Refine(S.spec, instruction);
    S.spec = spec;
    S.variants = NI.Variants(spec);
    reflectSpecInControls();
    renderOutput();
    const nBox = o.querySelector("#nis-notes");
    if (notes.length) {
      nBox.innerHTML = notes.map(n => `<div class="nis-note">✦ ${esc(n)}</div>`).join("");
      nBox.hidden = false;
    }
    o.querySelector("#nis-refine-input").value = "";
    rememberCurrent();
    renderSide();
  }
  function feedback(good) {
    const NI = $img(); const entry = currentPromptEntry(); if (!NI || !entry) return;
    if (good) NI.Memory.approve(entry); else NI.Memory.reject(entry);
    toast(t("fbThanks"), good ? "👍" : "🧠");
  }

  /* ───────── generation (real backend or premium placeholder) ───────── */
  async function generateImage() {
    const NI = $img(); const entry = currentPromptEntry(); if (!NI || !entry) return;
    const o = S.el.overlay;
    const box = o.querySelector("#nis-result");
    box.hidden = false;

    if (!NI.Backend.available) {
      const f = NI.Formats.list[entry.format] || NI.Formats.list.square;
      box.innerHTML = `
        <div class="nis-ph-card ratio-${f.ratio.replace(":", "-")}">
          <div class="nis-ph-inner">
            <span class="nis-ph-icon">🖼️</span>
            <strong>${t("result")} · ${f.ratio}</strong>
            <p>${t("placeholderCard")}</p>
          </div>
        </div>
        <div class="nis-ph-note">🔌 ${t("noBackend")}</div>`;
      box.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    box.innerHTML = `<div class="nis-gen-loading"><span class="nis-spinner"></span> ${t("generating")}</div>`;
    const res = await NI.Backend.generate({
      prompt: entry.prompt, negative: entry.negative,
      format: entry.format, preset: entry.preset
    });
    if (res.ok && res.images && res.images.length) {
      box.innerHTML = res.images.map(im =>
        `<figure class="nis-gen-img"><img src="${esc(im.url)}" alt="Generated image" loading="lazy" /><figcaption>${esc(res.provider || "")}</figcaption></figure>`
      ).join("");
      NI.Memory.approve(entry);
    } else {
      box.innerHTML = `<div class="nis-ph-note warn">⚠️ ${t("genFailed")}</div>`;
    }
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ───────── side panel: history / templates / saved ───────── */
  function renderSide() {
    const NI = $img(); const o = S.el.overlay; if (!NI || !o) return;
    const body = o.querySelector("#nis-side-body");

    if (S.tab === "library") {
      body.innerHTML = "";
      const cats = {};
      NI.Library.items.forEach(item => { (cats[item.cat] = cats[item.cat] || []).push(item); });
      Object.entries(cats).forEach(([cat, items]) => {
        body.appendChild(el("div", "nis-side-cat", esc(cat)));
        items.forEach(item => {
          const card = el("div", "nis-side-card",
            `<div class="nis-side-card-head">${item.icon} <strong>${esc(S.lang === "ar" ? item.titleAr : item.title)}</strong></div>
             <button class="nis-mini-btn">${t("useTpl")}</button>`);
          card.querySelector("button").addEventListener("click", () => {
            const topic = prompt(S.lang === "ar" ? "الموضوع؟" : "Topic?") || "";
            if (!topic.trim()) return;
            const spec = NI.Library.apply(item, topic.trim());
            S.spec = spec;
            S.variants = NI.Variants(spec);
            S.activeVariant = "detailed";
            o.querySelector("#nis-request").value = spec.subject;
            reflectSpecInControls();
            renderSuggestions(spec);
            renderOutput();
            rememberCurrent();
          });
          body.appendChild(card);
        });
      });
      return;
    }

    if (S.tab === "saved") {
      const saved = NI.Memory.savedPrompts();
      body.innerHTML = saved.length ? "" : `<div class="nis-side-empty">${t("emptySaved")}</div>`;
      saved.forEach(x => {
        const card = el("div", "nis-side-card",
          `<div class="nis-side-card-head">☆ <strong>${esc((x.subject || x.prompt || "").slice(0, 50))}</strong></div>
           <div class="nis-side-card-sub">${esc(x.preset || "")} · ${esc(x.format || "")}</div>
           <div class="nis-side-card-actions"><button class="nis-mini-btn" data-a="use">${t("useTpl")}</button><button class="nis-mini-btn ghost" data-a="del">✕</button></div>`);
        card.querySelector('[data-a="use"]').addEventListener("click", () => loadEntry(x));
        card.querySelector('[data-a="del"]').addEventListener("click", () => { NI.Memory.removeSaved(x.id); renderSide(); });
        body.appendChild(card);
      });
      return;
    }

    // history
    const hist = NI.Memory.history(14);
    body.innerHTML = hist.length ? "" : `<div class="nis-side-empty">${t("emptyHistory")}</div>`;
    hist.forEach(x => {
      const card = el("div", "nis-side-card",
        `<div class="nis-side-card-head">🕘 <strong>${esc((x.subject || x.prompt || "").slice(0, 50))}</strong></div>
         <div class="nis-side-card-sub">${esc(x.preset || "")} · ${esc(x.variant || "")} · ${esc(x.format || "")}</div>
         <div class="nis-side-card-actions"><button class="nis-mini-btn" data-a="use">${t("useTpl")}</button></div>`);
      card.querySelector('[data-a="use"]').addEventListener("click", () => loadEntry(x));
      body.appendChild(card);
    });
  }

  function loadEntry(x) {
    const NI = $img(); const o = S.el.overlay; if (!NI) return;
    const spec = NI.Understand.parse(x.subject || x.prompt || "");
    spec.preset = x.preset || spec.preset;
    spec.format = x.format || spec.format;
    spec.quality = x.quality || spec.quality;
    spec.composition = x.composition || spec.composition;
    S.spec = spec;
    S.variants = NI.Variants(spec);
    S.activeVariant = x.variant && S.variants[x.variant] ? x.variant : "detailed";
    o.querySelector("#nis-request").value = spec.subjectRaw;
    reflectSpecInControls();
    renderSuggestions(spec);
    renderOutput();
    // restore the exact saved prompt text (it may include user edits)
    if (x.prompt) o.querySelector("#nis-prompt").textContent = x.prompt;
    if (x.negative) o.querySelector("#nis-negative").textContent = x.negative;
  }

  /* ───────── open / close ───────── */
  function open(initialText) {
    buildUI();
    const NI = $img();
    if (NI) NI.Backend.probe().then(updateGenerateBtn);
    S.open = true;
    S.el.overlay.classList.add("open");
    document.body.classList.add("nis-open");
    if (initialText) {
      S.el.overlay.querySelector("#nis-request").value = initialText;
      setTimeout(craft, 120);
    } else {
      setTimeout(() => S.el.overlay.querySelector("#nis-request").focus(), 200);
    }
  }
  function openWith(text) { open(text); }
  function close() {
    S.open = false;
    if (S.el.overlay) S.el.overlay.classList.remove("open");
    document.body.classList.remove("nis-open");
  }

  window.NovaImageStudio = { open, openWith, close, isOpen: () => S.open, setLang };
})();
