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
      stPreparing: "Preparing prompt",
      stRequesting: "Contacting image engine",
      stRendering: "Rendering your image",
      stDone: "Done",
      genFailed: "Generation didn't complete this time. Your prompt is safe — retry, or copy it into any image model.",
      genFailedTimeout: "The image engine took too long to respond. Your prompt is safe — retry in a moment.",
      genFailedNetwork: "Couldn't reach the image engine (network issue). Your prompt is safe — check your connection and retry.",
      retry: "↻ Retry",
      download: "⬇ Download",
      openFull: "⤢ Open",
      variation: "✦ New variation",
      copyFinal: "⧉ Copy prompt",
      downloaded: "Image downloaded ✓",
      viaFallback: "delivered via automatic fallback",
      metaProvider: "Engine",
      metaModel: "Model",
      metaSize: "Size",
      metaSeed: "Seed",
      metaTime: "Time",
      finalPromptUsed: "Final prompt used",
      history: "History",
      library: "Templates",
      savedTab: "Saved",
      imagesTab: "Images",
      emptyGens: "Images you generate will appear here.",
      reuse: "Reuse",
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
      openStudio: "🎨 Image Studio",
      understanding: "Nova is understanding your request…",
      planApplied: "✓ Nova understood your request and built a faithful prompt.",
      planLocal: "Nova prepared your prompt locally (deep planner offline).",
      validating: "Checking the prompt matches your request…",
      validated: "✓ Prompt aligned to your request",
      clarifyLead: "Quick question to get it right:",
      clarifyIgnore: "Generate anyway",
      mismatch: "🎯 Doesn't match my request",
      mismatchPh: "Tell Nova what was wrong (e.g. “it drew the wrong tooth”, “not academic enough”)…",
      diagnosing: "Nova is analysing what went wrong…",
      diagnosed: "✓ Nova corrected the prompt — regenerating.",
      refining: "Refining while staying faithful to your request…",
      confLow: "Nova isn't fully sure — review the prompt below before generating.",
      qualityCheck: "Accuracy check"
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
      stPreparing: "تجهيز البرومبت",
      stRequesting: "الاتصال بمحرك الصور",
      stRendering: "جاري رسم الصورة",
      stDone: "تم",
      genFailed: "التوليد ما كملش المرة دي. البرومبت محفوظ — جرّب تاني أو انسخه لأي موديل صور.",
      genFailedTimeout: "محرك الصور اتأخر في الرد. البرومبت محفوظ — جرّب تاني بعد شوية.",
      genFailedNetwork: "مش قادرين نوصل لمحرك الصور (مشكلة شبكة). البرومبت محفوظ — اتأكد من النت وجرّب تاني.",
      retry: "↻ إعادة المحاولة",
      download: "⬇ تحميل",
      openFull: "⤢ فتح",
      variation: "✦ نسخة جديدة",
      copyFinal: "⧉ نسخ البرومبت",
      downloaded: "تم تحميل الصورة ✓",
      viaFallback: "اتولّدت عن طريق البديل التلقائي",
      metaProvider: "المحرك",
      metaModel: "الموديل",
      metaSize: "المقاس",
      metaSeed: "البذرة",
      metaTime: "الوقت",
      finalPromptUsed: "البرومبت النهائي المستخدم",
      history: "السجل",
      library: "قوالب",
      savedTab: "المحفوظ",
      imagesTab: "الصور",
      emptyGens: "الصور اللي بتولّدها هتظهر هنا.",
      reuse: "استخدم",
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
      openStudio: "🎨 استوديو الصور",
      understanding: "نوفا بيفهم طلبك…",
      planApplied: "✓ نوفا فهم طلبك وجهّز برومبت مطابق لطلبك.",
      planLocal: "نوفا جهّز البرومبت محلياً (المحلّل الذكي غير متاح دلوقتي).",
      validating: "بنتأكد إن البرومبت مطابق لطلبك…",
      validated: "✓ البرومبت متطابق مع طلبك",
      clarifyLead: "سؤال سريع عشان نظبطها صح:",
      clarifyIgnore: "ولّد على أي حال",
      mismatch: "🎯 مش مطابقة لطلبي",
      mismatchPh: "قول لنوفا إيه اللي غلط (مثلاً «رسم سن غلط»، «مش أكاديمي كفاية»)…",
      diagnosing: "نوفا بيحلّل إيه اللي حصل غلط…",
      diagnosed: "✓ نوفا صحّح البرومبت — بيعيد التوليد.",
      refining: "بنحسّن مع الحفاظ على مطابقة طلبك…",
      confLow: "نوفا مش متأكد تماماً — راجع البرومبت تحت قبل التوليد.",
      qualityCheck: "فحص الدقة"
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
    generating: false,
    lastGen: null,       // last successful generation result (for variations)
    lastGenPayload: null, // payload used for the last attempt (for retry)
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

          <!-- side: history / templates / saved / generated images -->
          <aside class="nis-side">
            <div class="nis-side-tabs">
              <button class="nis-side-tab active" data-nis-tab="history" data-nis="history"></button>
              <button class="nis-side-tab" data-nis-tab="library" data-nis="library"></button>
              <button class="nis-side-tab" data-nis-tab="saved" data-nis="savedTab"></button>
              <button class="nis-side-tab" data-nis-tab="images" data-nis="imagesTab"></button>
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
    const o = S.el.overlay; if (!o) return;
    const b = o.querySelector("#nis-generate");
    // The generation pipeline is always available: server provider chain
    // with a built-in keyless default, plus a direct client-side fallback.
    b.textContent = S.generating ? ("⏳ " + t("generating")) : ("⚡ " + t("generate"));
    b.disabled = !!S.generating;
    b.classList.toggle("busy", !!S.generating);
    b.classList.remove("off");
  }

  /* ───────── craft flow ─────────
     Two-stage understanding:
       1. Local heuristic parse (instant, always works, translates Arabic).
       2. LLM Planner (deep request understanding) — when available it
          overrides the local spec with a FAITHFUL, tightly-anchored plan
          so the generated image matches what the user actually asked.
     The UI stays responsive: the local prompt shows immediately, then
     upgrades in place once the planner returns. */
  async function craft() {
    const NI = $img(); if (!NI) return;
    const o = S.el.overlay;
    const text = o.querySelector("#nis-request").value.trim();
    if (!text) return;

    // auto language follow
    const det = NI.detectLang(text);
    if (det.lang !== S.lang) setLang(det.lang);

    // stage 1 — instant local understanding
    let spec = NI.Understand.parse(text);
    spec = NI.Understand.personalize(spec, {});
    S.spec = spec;
    S.lastRequestText = text;
    S.variants = NI.Variants(spec);
    S.activeVariant = "detailed";
    reflectSpecInControls();
    renderSuggestions(spec);
    renderOutput();
    rememberCurrent();
    renderSide();

    // stage 2 — deep LLM planning (non-blocking; upgrades the prompt in place)
    if (NI.Planner && NI.Planner.available !== false) {
      showUnderstanding(true);
      try {
        const ctx = NI.Planner.memoryContext ? NI.Planner.memoryContext() : "";
        const plan = await NI.Planner.plan(text, ctx);
        if (plan && S.lastRequestText === text) {
          NI.Planner.applyToSpec(spec, plan);
          S.spec = spec;
          S.variants = NI.Variants(spec);
          reflectSpecInControls();
          renderSuggestions(spec);
          renderOutput();
          rememberCurrent();
          showPlanBadge(true, spec);
        } else if (NI.Planner.available === false) {
          showPlanBadge(false, spec);
        }
      } catch (e) { /* keep the local prompt */ }
      showUnderstanding(false);
    }
  }

  /* Understanding / planning status banner above the request box */
  function showUnderstanding(on) {
    const o = S.el.overlay; if (!o) return;
    let b = o.querySelector("#nis-understand");
    if (on) {
      if (!b) {
        b = el("div", "nis-understand", `<span class="nis-spinner"></span> <span></span>`);
        b.id = "nis-understand";
        const req = o.querySelector(".nis-req");
        req.parentNode.insertBefore(b, req.nextSibling);
      }
      b.querySelector("span:last-child").textContent = t("understanding");
      b.hidden = false;
    } else if (b) { b.hidden = true; }
  }
  function showPlanBadge(applied, spec) {
    const o = S.el.overlay; if (!o) return;
    const box = o.querySelector("#nis-suggest");
    if (!box || box.hidden) return;
    // clarify question takes priority when confidence is low
    const clarify = spec && spec.clarify;
    let head = box.querySelector(".nis-plan-badge");
    if (!head) { head = el("div", "nis-plan-badge"); box.insertBefore(head, box.firstChild.nextSibling); }
    const lowConf = spec && typeof spec.confidence === "number" && spec.confidence < 0.6;
    head.className = "nis-plan-badge" + (applied ? " ok" : " local");
    head.innerHTML = applied
      ? `${t("planApplied")}${lowConf ? ` <em>${t("confLow")}</em>` : ""}`
      : t("planLocal");
    // render a clarify prompt the user can answer or skip
    let cbox = box.querySelector(".nis-clarify");
    if (cbox) cbox.remove();
    if (clarify) {
      cbox = el("div", "nis-clarify",
        `<strong>❓ ${t("clarifyLead")}</strong><p dir="${S.lang === "ar" ? "rtl" : "ltr"}">${esc(clarify)}</p>
         <div class="nis-clarify-row">
           <input type="text" class="nis-input slim" id="nis-clarify-input" />
           <button class="nis-btn primary" id="nis-clarify-send">${t("improve")}</button>
           <button class="nis-btn ghost" id="nis-clarify-skip">${t("clarifyIgnore")}</button>
         </div>`);
      box.appendChild(cbox);
      cbox.querySelector("#nis-clarify-send").addEventListener("click", () => {
        const ans = cbox.querySelector("#nis-clarify-input").value.trim();
        if (!ans) return;
        // fold the answer back into the request and re-plan
        o.querySelector("#nis-request").value = S.lastRequestText + " — " + ans;
        cbox.remove();
        craft();
      });
      cbox.querySelector("#nis-clarify-input").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); cbox.querySelector("#nis-clarify-send").click(); } });
      cbox.querySelector("#nis-clarify-skip").addEventListener("click", () => cbox.remove());
    }
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

  /* ───────── generation — real backend pipeline ───────── */
  const PIPELINE_STAGES = ["preparing", "requesting", "rendering", "done"];
  function stageLabel(stage) {
    return t({ preparing: "stPreparing", requesting: "stRequesting", rendering: "stRendering", done: "stDone" }[stage] || "stPreparing");
  }
  function renderPipeline(box, activeStage, ratio) {
    const activeIdx = PIPELINE_STAGES.indexOf(activeStage);
    const steps = PIPELINE_STAGES.map((s, i) => {
      const cls = i < activeIdx ? "done" : (i === activeIdx ? "active" : "");
      return `<div class="nis-pipe-step ${cls}"><span class="nis-pipe-dot">${i < activeIdx ? "✓" : ""}</span><span class="nis-pipe-lbl">${esc(stageLabel(s))}</span></div>`;
    }).join('<span class="nis-pipe-line"></span>');
    box.innerHTML = `
      <div class="nis-pipe">${steps}</div>
      <div class="nis-ph-card generating ratio-${(ratio || "1:1").replace(":", "-")}">
        <div class="nis-ph-inner">
          <span class="nis-spinner big"></span>
          <strong>${esc(stageLabel(activeStage))}…</strong>
        </div>
      </div>`;
  }
  function failReasonText(reason) {
    if (reason === "timeout") return t("genFailedTimeout");
    if (reason === "network_error") return t("genFailedNetwork");
    return t("genFailed");
  }
  function fmtSeconds(ms) { return ms ? (Math.round(ms / 100) / 10) + "s" : ""; }

  async function runGeneration(payload) {
    const NI = $img(); if (!NI || S.generating) return;
    const o = S.el.overlay;
    const box = o.querySelector("#nis-result");
    box.hidden = false;
    S.generating = true;
    S.lastGenPayload = payload;
    updateGenerateBtn();

    const f = NI.Formats.list[payload.format] || NI.Formats.list.square;
    renderPipeline(box, "preparing", f.ratio);
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });

    let res;
    try {
      res = await NI.Backend.generate(Object.assign({}, payload), (stage) => {
        if (stage !== "error" && stage !== "done") renderPipeline(box, stage, f.ratio);
      });
    } catch (e) {
      res = { ok: false, reason: "network_error" };
    }
    S.generating = false;
    updateGenerateBtn();

    if (res && res.ok && res.images && res.images.length) {
      S.lastGen = res;
      renderGenerationResult(box, res, payload);
      // record in local generation history + learning loop
      try {
        res.images.forEach((im, i) => {
          NI.Generations.add({
            prompt: payload.prompt, negative: payload.negative,
            preset: payload.preset, format: payload.format,
            provider: res.provider, model: res.model,
            seed: im.seed || res.seed || null,
            width: im.width || res.width, height: im.height || res.height,
            url: im.url, sourceUrl: im.sourceUrl
          });
          if (i === 0 && S.lastEntry) NI.Memory.approve(S.lastEntry);
        });
      } catch (e) {}
      if (S.tab === "images") renderSide();
    } else {
      renderGenerationError(box, res && res.reason);
    }
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function renderGenerationResult(box, res, payload) {
    const seed = (res.images[0] && res.images[0].seed) || res.seed || "";
    const metaBits = [
      res.provider ? `<span class="nis-meta-item"><em>${t("metaProvider")}</em> ${esc(res.provider)}</span>` : "",
      res.model ? `<span class="nis-meta-item"><em>${t("metaModel")}</em> ${esc(res.model)}</span>` : "",
      (res.width && res.height) ? `<span class="nis-meta-item"><em>${t("metaSize")}</em> ${res.width}×${res.height}</span>` : "",
      seed ? `<span class="nis-meta-item"><em>${t("metaSeed")}</em> ${esc(String(seed))}</span>` : "",
      res.elapsedMs ? `<span class="nis-meta-item"><em>${t("metaTime")}</em> ${fmtSeconds(res.elapsedMs)}</span>` : "",
      res.fallback ? `<span class="nis-meta-item fb">↪ ${t("viaFallback")}</span>` : ""
    ].filter(Boolean).join("");

    box.innerHTML = `
      ${res.images.map((im, i) => `
        <figure class="nis-gen-img" data-idx="${i}">
          <img src="${esc(im.url)}" alt="Generated image" loading="lazy" />
        </figure>`).join("")}
      <div class="nis-gen-meta">${metaBits}</div>
      <details class="nis-final-prompt"><summary>${t("finalPromptUsed")}</summary><div class="nis-final-prompt-txt" dir="ltr">${esc(payload.prompt)}</div></details>
      <div class="nis-gen-actions">
        <button class="nis-btn" data-gen-act="download">${t("download")}</button>
        <button class="nis-btn" data-gen-act="open">${t("openFull")}</button>
        <button class="nis-btn" data-gen-act="copyPrompt">${t("copyFinal")}</button>
        <button class="nis-btn accent" data-gen-act="variation">${t("variation")}</button>
      </div>`;

    box.querySelector('[data-gen-act="download"]').addEventListener("click", () => downloadImage(res.images[0], payload));
    box.querySelector('[data-gen-act="open"]').addEventListener("click", () => {
      const im = res.images[0];
      try { window.open(im.sourceUrl || im.url, "_blank", "noopener"); } catch (e) {}
    });
    box.querySelector('[data-gen-act="copyPrompt"]').addEventListener("click", () => copyText(payload.prompt + (payload.negative ? "\n\nNegative prompt: " + payload.negative : "")));
    box.querySelector('[data-gen-act="variation"]').addEventListener("click", () => {
      // fresh seed → true new variation of the same prompt
      const p = Object.assign({}, payload); delete p.seed;
      runGeneration(p);
    });
  }

  function renderGenerationError(box, reason) {
    box.innerHTML = `
      <div class="nis-ph-note warn">⚠️ ${failReasonText(reason)}</div>
      <div class="nis-gen-actions">
        <button class="nis-btn accent" data-gen-act="retry">${t("retry")}</button>
        <button class="nis-btn" data-gen-act="copyPrompt">${t("copyFinal")}</button>
      </div>`;
    box.querySelector('[data-gen-act="retry"]').addEventListener("click", () => {
      if (S.lastGenPayload) { const p = Object.assign({}, S.lastGenPayload); delete p.seed; runGeneration(p); }
    });
    box.querySelector('[data-gen-act="copyPrompt"]').addEventListener("click", () => {
      const p = S.lastGenPayload;
      if (p) copyText(p.prompt + (p.negative ? "\n\nNegative prompt: " + p.negative : ""));
    });
  }

  function copyText(txt) {
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(
      () => toast(t("copied"), "⧉"),
      () => { const ta = el("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); toast(t("copied"), "⧉"); } catch (e) {} ta.remove(); }
    );
  }

  async function downloadImage(im, payload) {
    try {
      const name = "nova-image-" + (payload.preset || "art") + "-" + Date.now() + ".png";
      let href = im.url;
      if (!/^data:/i.test(href)) {
        // fetch → blob so cross-origin images download instead of navigating
        const r = await fetch(href, { mode: "cors" });
        if (r.ok) href = URL.createObjectURL(await r.blob());
      }
      const a = el("a"); a.href = href; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      if (href.startsWith("blob:")) setTimeout(() => URL.revokeObjectURL(href), 4000);
      toast(t("downloaded"), "⬇");
    } catch (e) {
      try { window.open(im.sourceUrl || im.url, "_blank", "noopener"); } catch (e2) {}
    }
  }

  function generateImage() {
    const NI = $img(); const entry = currentPromptEntry(); if (!NI || !entry) return;
    runGeneration({
      prompt: entry.prompt, negative: entry.negative,
      format: entry.format, preset: entry.preset, count: 1
    });
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

    if (S.tab === "images") {
      const gens = NI.Generations ? NI.Generations.list() : [];
      body.innerHTML = gens.length ? "" : `<div class="nis-side-empty">${t("emptyGens")}</div>`;
      gens.forEach(g => {
        const card = el("div", "nis-side-card gen",
          `${g.url ? `<div class="nis-gen-thumb"><img src="${esc(g.url)}" alt="" loading="lazy" /></div>` : ""}
           <div class="nis-side-card-head">🖼 <strong>${esc((g.prompt || "").slice(0, 46))}</strong></div>
           <div class="nis-side-card-sub">${esc(g.provider || "")}${g.model ? " · " + esc(g.model) : ""}${g.width ? " · " + g.width + "×" + g.height : ""}</div>
           <div class="nis-side-card-actions">
             <button class="nis-mini-btn" data-a="reuse">${t("reuse")}</button>
             <button class="nis-mini-btn ghost" data-a="del">✕</button>
           </div>`);
        card.querySelector('[data-a="reuse"]').addEventListener("click", () => {
          // restore the prompt + settings, then regenerate with the same seed
          const o2 = S.el.overlay;
          const spec = NI.Understand.parse(g.prompt || "");
          spec.preset = g.preset || spec.preset;
          spec.format = g.format || spec.format;
          S.spec = spec;
          S.variants = NI.Variants(spec);
          S.activeVariant = "detailed";
          o2.querySelector("#nis-request").value = (g.prompt || "").slice(0, 220);
          reflectSpecInControls();
          renderOutput();
          o2.querySelector("#nis-prompt").textContent = g.prompt || "";
          if (g.negative) o2.querySelector("#nis-negative").textContent = g.negative;
          runGeneration({
            prompt: g.prompt, negative: g.negative || "",
            format: g.format || "square", preset: g.preset || "", count: 1,
            seed: g.seed || undefined
          });
        });
        card.querySelector('[data-a="del"]').addEventListener("click", () => { NI.Generations.remove(g.id); renderSide(); });
        body.appendChild(card);
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
