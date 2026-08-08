/* ═══════════════════════════════════════════════════════════════
   DENTOVERSE — NOVA AI · IMAGE DESIGN INTELLIGENCE ENGINE (Phase 3)
   ───────────────────────────────────────────────────────────────
   Additive, dependency-free module that turns Nova into a premium
   AI image-design assistant. It does NOT pretend to be an image
   model — it is a prompt intelligence layer with an optional
   backend integration point (window.NovaImage.Backend).

   Public API:
     window.NovaImage = {
       Understand,   // natural-language image request → structured spec
       Presets,      // professional style presets
       Compose,      // spec → production-ready prompt (+ negative prompt)
       Variants,     // short / detailed / stylized / professional / safe / academic
       Refine,       // iterative refinement ("more cinematic", "أكثر واقعية"…)
       Memory,       // local prompt memory + feedback learning
       Library,      // reusable modular prompt templates
       Formats,      // aspect-ratio / format catalogue + recommendation
       Backend       // optional image-generation backend adapter
     }

   Bilingual: understands English, Modern Standard Arabic and
   Egyptian colloquial Arabic requests; composed prompts are always
   emitted in English (best for image models) while UI copy follows
   the user's language.

   Designed & Produced by Abdel Rahman Teba © ®
   ═══════════════════════════════════════════════════════════════ */

(() => {
  "use strict";
  if (typeof window === "undefined") return;

  const LS = {
    memory: "dentoverse_nova_img_memory_v1",
    feedback: "dentoverse_nova_img_feedback_v1",
    saved: "dentoverse_nova_img_saved_v1",
    prefs: "dentoverse_nova_img_prefs_v1"
  };
  const lsGet = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; } catch (e) { return fb; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const now = () => Date.now();
  const uid = () => "p" + now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ───────── language detection (mirrors NovaCore, self-contained) ───────── */
  const AR_RX = /[\u0600-\u06FF]/g;
  const EG_RX = /(ازاي|إزاي|عايز|عاوز|عاوزة|محتاج|مش |كده|كدا|دلوقتي|فين|ليه|يعني|بتاع|عشان|علشان|جامد|تمام|النهارده|طب |حاجة|حاجه|يلا)/;
  function detectLang(text) {
    const s = String(text || "");
    const ar = (s.match(AR_RX) || []).length;
    const latin = (s.match(/[a-zA-Z]/g) || []).length;
    if (!(ar > 0 && ar >= latin * 0.5)) return { lang: "en", dialect: "en", rtl: false };
    return { lang: "ar", dialect: EG_RX.test(s) ? "egy" : "msa", rtl: true };
  }

  /* ═══════════════════════════════════════════════════════════════
     1 · STYLE PRESETS — each maps to strong prompt fragments.
     ═══════════════════════════════════════════════════════════════ */
  const PRESETS = {
    realistic: {
      id: "realistic", icon: "📷", label: "Realistic", labelAr: "واقعي",
      style: "photorealistic, true-to-life textures, natural materials, accurate proportions",
      lighting: "natural soft daylight, realistic shadows, gentle ambient occlusion",
      quality: "ultra-detailed, sharp focus, realistic shading, high dynamic range",
      camera: "shot on a full-frame camera, 50mm lens, f/2.8, subtle depth of field",
      negative: "cartoon, illustration, painting, low quality, blur, distortion, bad anatomy, watermark"
    },
    cinematic: {
      id: "cinematic", icon: "🎬", label: "Cinematic", labelAr: "سينمائي",
      style: "cinematic film still, dramatic atmosphere, rich storytelling composition",
      lighting: "dramatic cinematic lighting, volumetric light rays, strong key light with soft rim light",
      quality: "professional color grading, film grain subtlety, anamorphic feel, high production value",
      camera: "anamorphic 35mm lens, shallow depth of field, cinematic framing",
      negative: "flat lighting, amateur, low quality, oversaturated colors, watermark"
    },
    futuristic: {
      id: "futuristic", icon: "🚀", label: "Futuristic", labelAr: "مستقبلي",
      style: "futuristic sci-fi aesthetic, sleek high-tech surfaces, holographic accents, neon glow details",
      lighting: "cool blue and cyan rim lighting, glowing edge highlights, dark ambient backdrop",
      quality: "ultra-detailed, crisp edges, polished finish, glossy reflections",
      camera: "dynamic wide-angle perspective",
      negative: "retro, vintage, grainy, low quality, cluttered, watermark"
    },
    minimal: {
      id: "minimal", icon: "◽", label: "Minimal", labelAr: "بسيط",
      style: "minimalist design, generous negative space, restrained refined palette, geometric simplicity",
      lighting: "flat even studio lighting, soft gentle shadows",
      quality: "clean linework, crisp edges, perfect alignment, polished finish",
      camera: "straight-on flat composition",
      negative: "clutter, busy background, ornate detail, noise, gradient banding, watermark"
    },
    academic: {
      id: "academic", icon: "🎓", label: "Academic", labelAr: "أكاديمي",
      style: "professional academic illustration, textbook quality, precise labeled-diagram aesthetic, scholarly tone",
      lighting: "neutral even illumination, no dramatic shadows",
      quality: "clean vector-like linework, high clarity, accurate proportions, print-ready sharpness",
      camera: "orthographic straight-on view",
      negative: "cartoonish, fantasy, dramatic lighting, messy background, spelling artifacts, watermark"
    },
    cleanMedical: {
      id: "cleanMedical", icon: "🩺", label: "Clean Medical", labelAr: "طبي نظيف",
      style: "clean medical illustration, clinical accuracy, professional healthcare aesthetic, soft blue and white palette",
      lighting: "bright sterile even lighting, subtle soft shadows",
      quality: "anatomically accurate, smooth gradients, crisp detail, professional medical publication quality",
      camera: "clear frontal or three-quarter anatomical view",
      negative: "gore, blood, disturbing content, bad anatomy, cartoonish, low quality, watermark"
    },
    dentalEdu: {
      id: "dentalEdu", icon: "🦷", label: "Dentistry Educational", labelAr: "تعليمي · أسنان",
      style: "professional dental education illustration, anatomically accurate teeth and oral structures, student-friendly clarity, modern dental atlas aesthetic",
      lighting: "bright clean clinical lighting, soft shadowing to show tooth morphology",
      quality: "precise enamel/dentin/pulp differentiation, accurate cusp and root morphology, high clarity, textbook print quality",
      camera: "clear anatomical viewing angle (buccal, lingual, occlusal or cross-section as appropriate)",
      negative: "wrong tooth anatomy, extra teeth, deformed roots, gore, cartoonish exaggeration, low quality, watermark"
    },
    poster: {
      id: "poster", icon: "🪧", label: "Poster Style", labelAr: "بوستر",
      style: "bold modern poster design, strong visual hierarchy, striking focal point, balanced typography space",
      lighting: "punchy studio lighting, controlled highlights",
      quality: "high contrast, print-ready sharpness, professional layout, clean background separation",
      camera: "hero poster composition with clear title area",
      negative: "cluttered layout, illegible design, low quality, pixelation, watermark"
    },
    socialBanner: {
      id: "socialBanner", icon: "📣", label: "Social Media Banner", labelAr: "بانر سوشيال",
      style: "eye-catching social media banner, modern vibrant design, scroll-stopping focal point, space reserved for headline text",
      lighting: "bright energetic lighting, soft glow accents",
      quality: "crisp edges, vivid but balanced colors, clean background separation, optimized for small-screen legibility",
      camera: "wide banner composition, subject offset with clean copy space",
      negative: "cluttered, tiny unreadable elements, oversaturated colors, low quality, watermark"
    },
    infographic: {
      id: "infographic", icon: "📊", label: "Infographic Style", labelAr: "إنفوجرافيك",
      style: "clean modern infographic, organized information blocks, flat design icons, clear visual flow, consistent iconography",
      lighting: "flat design, no realistic lighting",
      quality: "clean vector linework, perfectly aligned grid, professional color coding, high legibility",
      camera: "flat straight-on layout view",
      negative: "3d clutter, photo-realism, messy layout, unreadable text artifacts, low quality, watermark"
    },
    luxury: {
      id: "luxury", icon: "✨", label: "Luxury Premium", labelAr: "فاخر",
      style: "luxury premium aesthetic, elegant gold and deep navy accents, sophisticated refined design, subtle texture richness",
      lighting: "soft dramatic spotlighting, warm golden highlights, deep shadow falloff",
      quality: "immaculate polish, ultra-detailed materials, high-end editorial finish, professional color grading",
      camera: "elegant hero composition, tasteful negative space",
      negative: "cheap look, plastic feel, oversaturation, clutter, low quality, watermark"
    },
    softModern: {
      id: "softModern", icon: "🌸", label: "Soft Modern", labelAr: "عصري ناعم",
      style: "soft modern aesthetic, rounded gentle forms, pastel gradient palette, friendly approachable design",
      lighting: "diffused soft lighting, airy brightness, gentle glow",
      quality: "smooth clean gradients, crisp yet gentle edges, polished contemporary finish",
      camera: "balanced centered composition with breathing room",
      negative: "harsh contrast, aggressive colors, clutter, low quality, watermark"
    },
    boldEditorial: {
      id: "boldEditorial", icon: "🗞️", label: "Bold Editorial", labelAr: "افتتاحي جريء",
      style: "bold editorial magazine aesthetic, confident graphic composition, strong typographic space, high-fashion attitude",
      lighting: "hard directional studio light, sculpted shadows",
      quality: "razor-sharp detail, premium print finish, sophisticated color grading",
      camera: "dramatic angle, tight confident crop",
      negative: "timid layout, muddy colors, low quality, clutter, watermark"
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     2 · FORMATS / ASPECT RATIOS
     ═══════════════════════════════════════════════════════════════ */
  const FORMATS = {
    square:    { id: "square",    icon: "◼", label: "Square",    labelAr: "مربع",    ratio: "1:1",  hint: "1080×1080 — posts, avatars, cards" },
    portrait:  { id: "portrait",  icon: "▯", label: "Portrait",  labelAr: "طولي",    ratio: "3:4",  hint: "1080×1440 — portraits, mobile-first" },
    landscape: { id: "landscape", icon: "▭", label: "Landscape", labelAr: "عرضي",    ratio: "4:3",  hint: "1440×1080 — slides, diagrams" },
    banner:    { id: "banner",    icon: "➖", label: "Banner",    labelAr: "بانر",    ratio: "16:9", hint: "1920×1080 — covers, headers, lectures" },
    story:     { id: "story",     icon: "📱", label: "Story",     labelAr: "ستوري",   ratio: "9:16", hint: "1080×1920 — stories, reels covers" },
    poster:    { id: "poster",    icon: "🪧", label: "Poster",    labelAr: "بوستر",   ratio: "2:3",  hint: "1200×1800 — print posters, announcements" },
    card:      { id: "card",      icon: "🃏", label: "Card",      labelAr: "كارت",    ratio: "5:4",  hint: "1250×1000 — study cards, flashcards" },
    thumbnail: { id: "thumbnail", icon: "🖼", label: "Thumbnail", labelAr: "مصغّرة",  ratio: "16:9", hint: "1280×720 — video thumbnails" }
  };
  function recommendFormat(spec) {
    const p = (spec && spec.purpose) || "";
    const s = (spec && spec.subjectRaw) || "";
    const t = (p + " " + s).toLowerCase();
    if (/story|reel|ستوري/.test(t)) return "story";
    if (/thumbnail|youtube|مصغر/.test(t)) return "thumbnail";
    if (/banner|cover|header|lecture slide|بانر|غلاف/.test(t)) return "banner";
    if (/poster|announcement|بوستر|إعلان|اعلان/.test(t)) return "poster";
    if (/flashcard|card|كارت|بطاقة/.test(t)) return "card";
    if (/diagram|infographic|chart|مخطط|رسم بياني/.test(t)) return "landscape";
    if (/post|instagram|بوست/.test(t)) return "square";
    if (spec && spec.preset === "socialBanner") return "banner";
    if (spec && spec.preset === "poster") return "poster";
    if (spec && spec.preset === "infographic") return "landscape";
    return "square";
  }

  /* ═══════════════════════════════════════════════════════════════
     3 · COMPOSITION INTELLIGENCE
     ═══════════════════════════════════════════════════════════════ */
  const COMPOSITIONS = {
    centered:   { id: "centered",   label: "Centered subject",  labelAr: "موضوع مركزي",  txt: "perfectly centered subject, balanced symmetrical framing" },
    leftRight:  { id: "leftRight",  label: "Left–right layout", labelAr: "تخطيط يمين/يسار", txt: "subject positioned on one side with clean copy space on the other, balanced left-right layout" },
    split:      { id: "split",      label: "Split composition", labelAr: "تكوين مقسوم",  txt: "split composition dividing the frame into two contrasting halves" },
    hero:       { id: "hero",       label: "Hero banner",       labelAr: "بانر رئيسي",   txt: "hero banner composition, large focal subject, clear headline space, layered depth" },
    poster:     { id: "poster",     label: "Poster layout",     labelAr: "تخطيط بوستر",  txt: "poster composition with strong vertical hierarchy, title zone at top, focal visual center" },
    blocks:     { id: "blocks",     label: "Infographic blocks",labelAr: "بلوكات معلومات", txt: "organized infographic blocks, modular grid sections, numbered visual flow" },
    negative:   { id: "negative",   label: "Clean negative space", labelAr: "مساحة فارغة نظيفة", txt: "generous clean negative space around a refined focal subject" },
    symmetric:  { id: "symmetric",  label: "Symmetrical",       labelAr: "متماثل",       txt: "strict symmetrical layout, mirrored balance, formal elegance" },
    dynamic:    { id: "dynamic",    label: "Dynamic angle",     labelAr: "زاوية ديناميكية", txt: "dynamic diagonal composition, energetic perspective, sense of motion" },
    closeup:    { id: "closeup",    label: "Close-up",          labelAr: "لقطة قريبة",   txt: "intimate close-up framing, fine detail emphasis, shallow depth of field" },
    wide:       { id: "wide",       label: "Wide shot",         labelAr: "لقطة واسعة",   txt: "expansive wide shot, environmental context, sweeping scale" }
  };

  /* Quality tiers */
  const QUALITY = {
    standard: { id: "standard", label: "Standard", labelAr: "عادي", txt: "high quality, sharp focus, clean composition" },
    high:     { id: "high",     label: "High",     labelAr: "عالي", txt: "ultra-detailed, crisp edges, sharp focus, high resolution, clean background separation, polished finish" },
    ultra:    { id: "ultra",    label: "Ultra",    labelAr: "فائق", txt: "masterpiece quality, ultra-detailed, immaculate crisp edges, razor-sharp focus, professional color grading, realistic shading, soft depth of field where appropriate, flawless polished finish, 8k clarity" }
  };

  const BASE_NEGATIVE = "low quality, blurry, distortion, deformed, bad anatomy, extra fingers, extra limbs, messy background, watermark, signature, text artifacts, jpeg artifacts, oversaturated colors, duplicated elements";

  /* ═══════════════════════════════════════════════════════════════
     4 · UNDERSTAND — natural-language request → structured spec
     ═══════════════════════════════════════════════════════════════ */
  const INTENT_RX = {
    en: /\b(create|design|generate|make|draw|render|illustrate|produce|build)\b[^.]{0,80}\b(image|picture|photo|visual|banner|poster|logo|cover|thumbnail|illustration|diagram|infographic|graphic|wallpaper|art|artwork|icon|card|flyer|badge)\b|\b(image|picture|banner|poster|cover|thumbnail|illustration|diagram|infographic|wallpaper|artwork)\b[^.]{0,40}\b(of|for|about|showing)\b/i,
    ar: /(اعمل|إعمل|اعملي|صمم|صمّم|صممي|انشئ|أنشئ|ارسم|أرسم|ولّد|ولد|جهز|جهّز|اطلع|أطلع|عايز|عاوز|محتاج|اريد|أريد)[^.]{0,80}(صورة|صوره|بوستر|بانر|تصميم|غلاف|شعار|لوجو|رسمة|رسمه|رسم|انفوجرافيك|إنفوجرافيك|مخطط|خلفية|خلفيه|ثمبنيل|مصغرة|بطاقة|بطاقه|فلاير)|((صورة|صوره|بوستر|بانر|غلاف|تصميم|انفوجرافيك|إنفوجرافيك|مخطط|خلفية)\s*(عن|ل|لـ|بتاع|توضح|تشرح))/
  };
  function isImageRequest(text) {
    const s = String(text || "");
    return INTENT_RX.en.test(s) || INTENT_RX.ar.test(s);
  }

  const STYLE_HINTS = [
    { rx: /realistic|photo[- ]?real|واقعي|حقيقي/i,                       preset: "realistic" },
    { rx: /cinematic|movie|film|سينمائي|سينمائى/i,                        preset: "cinematic" },
    { rx: /futur|sci[- ]?fi|cyber|neon|مستقبلي|مستقبلى|خيال علمي/i,       preset: "futuristic" },
    { rx: /minimal|simple|clean design|بسيط|مينيمال/i,                    preset: "minimal" },
    { rx: /academic|textbook|scholar|أكاديمي|اكاديمي|دراسي/i,             preset: "academic" },
    { rx: /medical|clinical|anatomy|طبي|طبى|تشريح|إكلينيكي/i,             preset: "cleanMedical" },
    { rx: /dental|dentist|tooth|teeth|molar|enamel|أسنان|اسنان|ضرس|سن |مينا/i, preset: "dentalEdu" },
    { rx: /poster|بوستر|ملصق/i,                                           preset: "poster" },
    { rx: /banner|header|social|instagram|facebook|بانر|سوشيال/i,         preset: "socialBanner" },
    { rx: /infographic|chart|data visual|انفوجرافيك|إنفوجرافيك|رسم بياني/i, preset: "infographic" },
    { rx: /luxur|premium|elegant|gold|فاخر|فخم|راقي/i,                    preset: "luxury" },
    { rx: /soft|pastel|gentle|friendly|ناعم|باستيل|هادي|هادئ/i,           preset: "softModern" },
    { rx: /editorial|magazine|bold|جريء|مجلة|افتتاحي/i,                   preset: "boldEditorial" }
  ];

  const PURPOSE_HINTS = [
    { rx: /lecture|slide|presentation|محاضرة|محاضره|عرض تقديمي|شريحة/i,   purpose: "lecture", audience: "students" },
    { rx: /exam|study|revision|امتحان|مذاكرة|مراجعة/i,                    purpose: "study", audience: "students" },
    { rx: /course|announcement|كورس|دورة|إعلان|اعلان/i,                   purpose: "announcement", audience: "students" },
    { rx: /social|post|instagram|facebook|twitter|بوست|سوشيال/i,          purpose: "social-media", audience: "general" },
    { rx: /research|paper|journal|بحث|ورقة علمية/i,                       purpose: "academic-publication", audience: "academics" },
    { rx: /clinic|patient|عيادة|مريض/i,                                    purpose: "clinical-communication", audience: "patients" },
    { rx: /teach|educat|learn|تعليم|شرح|تعلم/i,                            purpose: "education", audience: "students" }
  ];

  const MOOD_HINTS = [
    { rx: /calm|serene|هادئ|هادي/i, mood: "calm and serene" },
    { rx: /energetic|dynamic|vibrant|نشيط|حيوي/i, mood: "energetic and vibrant" },
    { rx: /professional|formal|احترافي|رسمي/i, mood: "professional and confident" },
    { rx: /friendly|warm|ودود|دافئ/i, mood: "warm and approachable" },
    { rx: /dramatic|epic|درامي|ملحمي/i, mood: "dramatic and impactful" },
    { rx: /inspir|motivat|ملهم|تحفيزي/i, mood: "inspiring and uplifting" }
  ];

  const SUBJECT_STRIP_RX = /^(please\s+)?(create|design|generate|make|draw|render|illustrate|produce|build)\s+(a|an|the)?\s*(realistic|futuristic|cinematic|minimal|academic|medical|clean|beautiful|professional|premium|modern)?\s*(image|picture|photo|visual|banner|poster|logo|cover|thumbnail|illustration|diagram|infographic|graphic|wallpaper|artwork|icon|card|flyer)?\s*(of|for|about|showing|that shows)?\s*/i;
  const SUBJECT_STRIP_AR = /^(لو سمحت\s+)?(اعمل|إعمل|صمم|صمّم|انشئ|أنشئ|ارسم|أرسم|ولّد|ولد|جهز|جهّز|عايز|عاوز|محتاج|اريد|أريد)\s*(لي|لى|ليا)?\s*(صورة|صوره|بوستر|بانر|تصميم|غلاف|شعار|رسمة|رسم|انفوجرافيك|إنفوجرافيك|مخطط|خلفية)?\s*(عن|ل|لـ|بتاع|توضح|تشرح|فيها|فيه)?\s*/;

  function understand(text) {
    const raw = String(text || "").trim();
    const det = detectLang(raw);

    // preset detection (first strong match wins; dental beats medical if both)
    let preset = null;
    for (const h of STYLE_HINTS) { if (h.rx.test(raw)) { preset = h.preset; break; } }
    if (/dental|dentist|tooth|teeth|أسنان|اسنان|ضرس/i.test(raw) && (preset === "cleanMedical" || preset === "academic" || !preset)) {
      if (/poster|بوستر/i.test(raw)) preset = "poster";
      else if (/banner|بانر/i.test(raw)) preset = "socialBanner";
      else if (/infographic|انفوجرافيك|إنفوجرافيك/i.test(raw)) preset = "infographic";
      else preset = "dentalEdu";
    }

    let purpose = "", audience = "general";
    for (const h of PURPOSE_HINTS) { if (h.rx.test(raw)) { purpose = h.purpose; audience = h.audience; break; } }

    let mood = "";
    for (const h of MOOD_HINTS) { if (h.rx.test(raw)) { mood = h.mood; break; } }

    // category (academic / artistic / professional / social)
    let category = "professional";
    if (/academic|study|lecture|exam|diagram|أكاديمي|مذاكرة|محاضرة|مخطط/i.test(raw)) category = "academic";
    else if (/art|creative|فني|إبداعي|ابداعي/i.test(raw)) category = "artistic";
    else if (/social|post|story|سوشيال|بوست|ستوري/i.test(raw)) category = "social-media";

    // subject extraction: strip the "make me an image of" scaffolding
    let subject = raw.replace(SUBJECT_STRIP_RX, "").replace(SUBJECT_STRIP_AR, "").trim();
    if (!subject) subject = raw;

    // typography needed?
    const wantsText = /title|headline|text|typography|write|words|عنوان|نص|كلام|اكتب|أكتب/i.test(raw);

    const spec = {
      id: uid(),
      subjectRaw: raw,
      subject,
      lang: det.lang,
      dialect: det.dialect,
      preset: preset || "realistic",
      purpose, audience, mood, category,
      composition: "",           // auto unless user picks
      quality: "high",
      format: "",                // filled by recommendFormat
      wantsText,
      palette: extractPalette(raw),
      createdAt: now()
    };
    spec.format = recommendFormat(spec);
    if (!spec.composition) spec.composition = defaultComposition(spec);
    return spec;
  }

  function extractPalette(text) {
    const found = [];
    const COLORS = [
      ["deep blue|navy|أزرق غامق|ازرق غامق|كحلي", "deep navy blue"],
      ["blue|أزرق|ازرق", "blue"], ["orange|برتقالي|برتقالى", "orange"],
      ["white|أبيض|ابيض", "white"], ["black|أسود|اسود", "black"],
      ["gold|golden|ذهبي|ذهبى", "gold"], ["green|أخضر|اخضر", "green"],
      ["purple|بنفسجي|بنفسجى", "purple"], ["pink|وردي|وردى|بمبي", "pink"],
      ["red|أحمر|احمر", "red"], ["teal|تركواز|تركوازي", "teal"], ["pastel|باستيل", "soft pastel tones"]
    ];
    COLORS.forEach(([rx, name]) => { if (new RegExp(rx, "i").test(text)) found.push(name); });
    return found;
  }
  function defaultComposition(spec) {
    switch (spec.preset) {
      case "poster": return "poster";
      case "socialBanner": return "hero";
      case "infographic": return "blocks";
      case "minimal": return "negative";
      case "boldEditorial": return "dynamic";
      case "dentalEdu":
      case "academic":
      case "cleanMedical": return "centered";
      default: return "centered";
    }
  }

  /* Missing-detail suggestions (Suggestive AI flow) */
  function missingDetails(spec) {
    const gaps = [];
    if (!spec.purpose) gaps.push({ key: "purpose", en: "What is it for? (lecture, post, poster, study…)", ar: "الصورة دي لإيه؟ (محاضرة، بوست، بوستر، مذاكرة…)" });
    if (!spec.mood) gaps.push({ key: "mood", en: "Any mood? (professional, warm, dramatic, calm…)", ar: "عايز الإحساس العام يكون إيه؟ (احترافي، دافئ، درامي، هادي…)" });
    if (!spec.palette.length) gaps.push({ key: "palette", en: "Preferred colors? (e.g., deep blue + orange like DentoVerse)", ar: "في ألوان مفضلة؟ (مثلاً أزرق غامق وبرتقالي زي DentoVerse)" });
    return gaps;
  }

  /* ═══════════════════════════════════════════════════════════════
     5 · COMPOSE — spec → production-ready prompt
     ═══════════════════════════════════════════════════════════════ */
  function compose(spec, opts) {
    opts = opts || {};
    const p = PRESETS[spec.preset] || PRESETS.realistic;
    const comp = COMPOSITIONS[spec.composition] || COMPOSITIONS.centered;
    const q = QUALITY[spec.quality] || QUALITY.high;
    const fmt = FORMATS[spec.format] || FORMATS.square;

    const parts = [];
    // subject first — models weight early tokens most
    parts.push(spec.subject);
    if (spec.purpose) parts.push(`designed for ${spec.purpose.replace(/-/g, " ")}${spec.audience && spec.audience !== "general" ? " aimed at " + spec.audience : ""}`);
    parts.push(p.style);
    parts.push(comp.txt);
    parts.push(p.lighting);
    if (spec.palette.length) parts.push(`color palette of ${spec.palette.join(", ")}`);
    else if (spec.category === "academic" || spec.preset === "dentalEdu") parts.push("clean professional palette of deep blue, white and subtle orange accents");
    if (spec.mood) parts.push(`${spec.mood} mood`);
    if (p.camera && spec.preset !== "infographic") parts.push(p.camera);
    if (spec.wantsText) parts.push("clear reserved space for headline typography, legible modern font placement, no gibberish text");
    parts.push(q.txt);
    parts.push(p.quality);
    parts.push(`${fmt.ratio} aspect ratio, ${fmt.label.toLowerCase()} format`);

    const prompt = dedupe(parts).join(", ");
    const negative = dedupe([BASE_NEGATIVE, p.negative].join(", ").split(",").map(s => s.trim())).join(", ");
    return { prompt, negative, ratio: fmt.ratio, format: fmt.id, preset: p.id, spec };
  }
  function dedupe(arr) {
    const seen = new Set(); const out = [];
    arr.forEach(x => { const k = String(x || "").toLowerCase().trim(); if (k && !seen.has(k)) { seen.add(k); out.push(String(x).trim()); } });
    return out;
  }

  /* ═══════════════════════════════════════════════════════════════
     6 · VARIANTS — multiple prompt versions per request
     ═══════════════════════════════════════════════════════════════ */
  function variants(spec) {
    const base = compose(spec);
    const p = PRESETS[spec.preset] || PRESETS.realistic;
    const fmt = FORMATS[spec.format] || FORMATS.square;

    const short = dedupe([
      spec.subject, p.style.split(",")[0], (COMPOSITIONS[spec.composition] || COMPOSITIONS.centered).txt.split(",")[0],
      "high quality, sharp focus", fmt.ratio + " aspect ratio"
    ]).join(", ");

    const stylizedSpec = Object.assign({}, spec, { quality: "ultra" });
    const stylized = compose(stylizedSpec).prompt + ", artistic flair, signature visual identity, award-winning design";

    const professional = base.prompt + ", commercial production quality, brand-safe, presentation-ready";

    const safe = dedupe([
      spec.subject, "clean professional illustration", "simple balanced composition",
      "soft neutral lighting", "high quality, sharp focus", fmt.ratio + " aspect ratio"
    ]).join(", ");

    const out = {
      short:        { id: "short",        label: "Short",        labelAr: "قصير",   prompt: short,            negative: base.negative },
      detailed:     { id: "detailed",     label: "Detailed",     labelAr: "مفصّل",  prompt: base.prompt,      negative: base.negative },
      stylized:     { id: "stylized",     label: "Stylized",     labelAr: "فني",    prompt: stylized,         negative: base.negative },
      professional: { id: "professional", label: "Professional", labelAr: "احترافي", prompt: professional,    negative: base.negative },
      safe:         { id: "safe",         label: "Safe Fallback", labelAr: "آمن",   prompt: safe,             negative: BASE_NEGATIVE }
    };
    if (spec.category === "academic" || spec.preset === "dentalEdu" || spec.preset === "academic" || spec.preset === "cleanMedical") {
      const acSpec = Object.assign({}, spec, { preset: spec.preset === "dentalEdu" ? "dentalEdu" : "academic", quality: "high" });
      out.academic = { id: "academic", label: "Academic", labelAr: "أكاديمي", prompt: compose(acSpec).prompt + ", suitable for educational materials, factual accurate representation", negative: base.negative };
    }
    return out;
  }

  /* ═══════════════════════════════════════════════════════════════
     7 · REFINE — iterative prompt improvement without restarting
     ═══════════════════════════════════════════════════════════════ */
  const REFINERS = [
    { rx: /more realistic|واقعي أكتر|واقعي اكتر|أكثر واقعية/i, apply: s => { s.preset = "realistic"; s.quality = "ultra"; return "Shifted to photorealistic rendering with ultra detail."; } },
    { rx: /more cinematic|سينمائي أكتر|سينمائي اكتر|أكثر سينمائية/i, apply: s => { s.preset = "cinematic"; return "Applied cinematic lighting, framing and color grading."; } },
    { rx: /more minimal|simpler|أبسط|ابسط|بسيط أكتر|مينيمال/i, apply: s => { s.preset = "minimal"; s.composition = "negative"; return "Simplified to minimal design with clean negative space."; } },
    { rx: /more futuristic|مستقبلي أكتر|مستقبلي اكتر/i, apply: s => { s.preset = "futuristic"; return "Pushed toward a futuristic high-tech aesthetic."; } },
    { rx: /more detail|add detail|تفاصيل أكتر|تفاصيل اكتر|زود التفاصيل/i, apply: s => { s.quality = "ultra"; return "Raised quality tier to ultra-detailed."; } },
    { rx: /cleaner|make it clean|أنظف|انظف|نظيف أكتر/i, apply: s => { s.composition = "negative"; s._extra = (s._extra || []).concat("immaculate clean background, decluttered layout"); return "Cleaned up the layout and background."; } },
    { rx: /change (the )?colou?r|different colou?rs|غير الألوان|غير الالوان|ألوان تانية|الوان تانيه/i, apply: s => { s.palette = []; s._askPalette = true; return "Palette reset — tell me the colors you want (e.g., deep blue + orange)."; } },
    { rx: /dentistry|dental|للأسنان|للاسنان|أسنان أكتر/i, apply: s => { s.preset = "dentalEdu"; return "Tuned for dental education accuracy and clarity."; } },
    { rx: /more luxur|فخم أكتر|فاخر/i, apply: s => { s.preset = "luxury"; return "Elevated to a luxury premium aesthetic."; } },
    { rx: /more professional|احترافي أكتر|احترافي اكتر/i, apply: s => { s.quality = "ultra"; s.mood = "professional and confident"; return "Sharpened the professional tone and polish."; } },
    { rx: /warmer|أدفأ|دافي/i, apply: s => { s._extra = (s._extra || []).concat("warm golden tones, inviting warm color temperature"); return "Warmed up the color temperature."; } },
    { rx: /darker|أغمق|اغمق|داكن/i, apply: s => { s._extra = (s._extra || []).concat("dark moody backdrop, deep shadows, low-key lighting"); return "Shifted to a darker, moodier look."; } },
    { rx: /brighter|lighter|أفتح|افتح|منور/i, apply: s => { s._extra = (s._extra || []).concat("bright airy lighting, light uplifting background"); return "Brightened the overall scene."; } },
    { rx: /close[- ]?up|قرب|لقطة قريبة/i, apply: s => { s.composition = "closeup"; return "Reframed as a close-up shot."; } },
    { rx: /wide|أوسع|لقطة واسعة/i, apply: s => { s.composition = "wide"; return "Reframed as a wide shot."; } },
    { rx: /centered|في النص|وسط/i, apply: s => { s.composition = "centered"; return "Centered the subject."; } }
  ];

  function refine(spec, instruction) {
    const s = JSON.parse(JSON.stringify(spec));
    const notes = [];
    let matched = false;
    REFINERS.forEach(r => { if (r.rx.test(instruction)) { const n = r.apply(s); if (n) notes.push(n); matched = true; } });

    // color mention inside the refinement
    const pal = extractPalette(instruction);
    if (pal.length) { s.palette = pal; notes.push("Updated palette: " + pal.join(", ")); matched = true; }

    // free-form additions (anything left that isn't a directive)
    if (!matched && String(instruction || "").trim()) {
      const add = String(instruction).trim();
      s._extra = (s._extra || []).concat(add);
      notes.push("Blended your note into the prompt.");
    }
    s.id = uid(); s.parentId = spec.id; s.refinedAt = now();
    const result = compose(s);
    if (s._extra && s._extra.length) result.prompt += ", " + dedupe(s._extra).join(", ");
    return { spec: s, result, notes };
  }

  /* ═══════════════════════════════════════════════════════════════
     8 · MEMORY + FEEDBACK LEARNING (practical, local)
     ═══════════════════════════════════════════════════════════════ */
  const Memory = {
    state: lsGet(LS.memory, { history: [], presetWins: {}, formatWins: {}, lastPalette: [], recentEdits: [] }),
    save() { lsSet(LS.memory, this.state); },
    remember(entry) {
      // entry: {id, subject, preset, format, prompt, negative, variant, lang}
      this.state.history.unshift(Object.assign({ t: now() }, entry));
      if (this.state.history.length > 40) this.state.history = this.state.history.slice(0, 40);
      this.save();
    },
    history(limit) { return this.state.history.slice(0, limit || 12); },
    approve(entry) {
      if (!entry) return;
      const fb = lsGet(LS.feedback, { good: {}, bad: {} });
      fb.good[entry.preset] = (fb.good[entry.preset] || 0) + 1;
      lsSet(LS.feedback, fb);
      this.state.presetWins[entry.preset] = (this.state.presetWins[entry.preset] || 0) + 1;
      if (entry.format) this.state.formatWins[entry.format] = (this.state.formatWins[entry.format] || 0) + 1;
      this.save();
    },
    reject(entry) {
      if (!entry) return;
      const fb = lsGet(LS.feedback, { good: {}, bad: {} });
      fb.bad[entry.preset] = (fb.bad[entry.preset] || 0) + 1;
      lsSet(LS.feedback, fb);
    },
    noteEdit(before, after) {
      this.state.recentEdits.unshift({ before: String(before || "").slice(0, 400), after: String(after || "").slice(0, 400), t: now() });
      if (this.state.recentEdits.length > 10) this.state.recentEdits = this.state.recentEdits.slice(0, 10);
      this.save();
    },
    preferredPreset() {
      const wins = this.state.presetWins || {};
      const top = Object.entries(wins).sort((a, b) => b[1] - a[1])[0];
      return top && top[1] >= 2 ? top[0] : null;
    },
    preferredFormat() {
      const wins = this.state.formatWins || {};
      const top = Object.entries(wins).sort((a, b) => b[1] - a[1])[0];
      return top && top[1] >= 2 ? top[0] : null;
    },
    /* score a preset using accumulated feedback (used to gently bias auto-detection) */
    presetScore(presetId) {
      const fb = lsGet(LS.feedback, { good: {}, bad: {} });
      return (fb.good[presetId] || 0) - (fb.bad[presetId] || 0) * 0.5;
    },
    savedPrompts() { return lsGet(LS.saved, []); },
    savePrompt(entry) {
      const list = lsGet(LS.saved, []);
      list.unshift(Object.assign({ t: now(), id: uid() }, entry));
      lsSet(LS.saved, list.slice(0, 60));
      this.approve(entry); // saving counts as strong positive feedback
    },
    removeSaved(id) {
      lsSet(LS.saved, lsGet(LS.saved, []).filter(x => x.id !== id));
    },
    clear() { this.state = { history: [], presetWins: {}, formatWins: {}, lastPalette: [], recentEdits: [] }; this.save(); lsSet(LS.saved, []); lsSet(LS.feedback, { good: {}, bad: {} }); }
  };

  /* Apply learned preferences to a fresh spec (bias, never override explicit choices) */
  function personalize(spec, explicit) {
    explicit = explicit || {};
    if (!explicit.preset) {
      const pref = Memory.preferredPreset();
      // only bias when the auto-detected preset is the generic default
      if (pref && spec.preset === "realistic" && Memory.presetScore(pref) > Memory.presetScore("realistic")) spec.preset = pref;
    }
    if (!explicit.format) {
      const f = Memory.preferredFormat();
      if (f && spec.format === "square") spec.format = f;
    }
    return spec;
  }

  /* ═══════════════════════════════════════════════════════════════
     9 · PROMPT LIBRARY — modular reusable templates
     ═══════════════════════════════════════════════════════════════ */
  const LIBRARY = [
    { id: "lib-dental-poster", icon: "🦷", cat: "Dental Education", title: "Dental education poster", titleAr: "بوستر تعليمي أسنان",
      seed: "design an educational dental poster about {topic}, clear labeled tooth anatomy, student-friendly layout", preset: "poster", format: "poster" },
    { id: "lib-tooth-diagram", icon: "📐", cat: "Dental Education", title: "Tooth anatomy diagram", titleAr: "مخطط تشريح سن",
      seed: "generate a labeled cross-section diagram of {topic} showing enamel, dentin, pulp and root structures", preset: "dentalEdu", format: "landscape" },
    { id: "lib-lecture-banner", icon: "🎓", cat: "Academic", title: "Lecture banner", titleAr: "بانر محاضرة",
      seed: "create a professional lecture banner for {topic}, clean academic design with headline space", preset: "socialBanner", format: "banner" },
    { id: "lib-medical-infographic", icon: "📊", cat: "Academic", title: "Medical infographic", titleAr: "إنفوجرافيك طبي",
      seed: "design a medical-style infographic explaining {topic} in organized numbered blocks", preset: "infographic", format: "landscape" },
    { id: "lib-anatomy-visual", icon: "🫀", cat: "Dental Education", title: "Clean anatomy visual", titleAr: "رسم تشريحي نظيف",
      seed: "create a clean anatomical illustration of {topic}, accurate morphology, clinical clarity", preset: "cleanMedical", format: "square" },
    { id: "lib-course-announcement", icon: "📣", cat: "Social", title: "Course announcement", titleAr: "إعلان كورس",
      seed: "design a course announcement graphic for {topic}, exciting modern academic style with bold title space", preset: "socialBanner", format: "square" },
    { id: "lib-study-card", icon: "🃏", cat: "Academic", title: "Study flashcard visual", titleAr: "بطاقة مذاكرة",
      seed: "create a student-friendly study card visual about {topic}, memorable and clear", preset: "softModern", format: "card" },
    { id: "lib-academic-cover", icon: "📘", cat: "Academic", title: "Academic cover image", titleAr: "غلاف أكاديمي",
      seed: "design a professional academic cover image for {topic}, elegant scholarly composition", preset: "luxury", format: "poster" },
    { id: "lib-futuristic-banner", icon: "🚀", cat: "Creative", title: "Futuristic banner", titleAr: "بانر مستقبلي",
      seed: "create a futuristic sci-fi banner featuring {topic}, neon glow and holographic accents", preset: "futuristic", format: "banner" },
    { id: "lib-minimal-post", icon: "◽", cat: "Social", title: "Minimal social post", titleAr: "بوست بسيط",
      seed: "design a minimal social media post about {topic}, generous negative space, refined typography area", preset: "minimal", format: "square" },
    { id: "lib-realistic-photo", icon: "📷", cat: "Creative", title: "Realistic photo scene", titleAr: "مشهد واقعي",
      seed: "generate a photorealistic image of {topic}, natural light, true-to-life detail", preset: "realistic", format: "landscape" },
    { id: "lib-story-visual", icon: "📱", cat: "Social", title: "Story visual", titleAr: "تصميم ستوري",
      seed: "create a vertical story visual about {topic}, eye-catching mobile-first design", preset: "socialBanner", format: "story" }
  ];
  function libraryApply(item, topic) {
    const subject = (item.seed || "").replace("{topic}", topic || "your topic");
    const spec = understand(subject);
    spec.preset = item.preset || spec.preset;
    spec.format = item.format || spec.format;
    spec.composition = defaultComposition(spec);
    return spec;
  }

  /* ═══════════════════════════════════════════════════════════════
     10 · BACKEND ADAPTER — real generation pipeline
     ───────────────────────────────────────────────────────────────
     Model-agnostic client for POST /api/nova-image (a provider chain
     with a keyless built-in default), plus a pure client-side direct
     fallback so generation still works even when the site is served
     statically without the API route. Emits status events so the UI
     can show a real progress pipeline:
       preparing → requesting → rendering → done | error
     ═══════════════════════════════════════════════════════════════ */
  const FORMAT_PIXELS = {
    square:    { w: 1024, h: 1024 }, portrait:  { w: 960,  h: 1280 },
    landscape: { w: 1280, h: 960  }, banner:    { w: 1344, h: 768  },
    story:     { w: 768,  h: 1344 }, poster:    { w: 832,  h: 1248 },
    card:      { w: 1200, h: 960  }, thumbnail: { w: 1280, h: 720  }
  };
  const randomSeed = () => Math.floor(Math.random() * 2147483646) + 1;

  const Backend = {
    available: false, provider: null, providers: [], builtinDefault: false, probed: false,
    async probe(force) {
      if (this.probed && !force) return this.available;
      this.probed = true;
      try {
        const r = await fetch("/api/nova-image", { method: "GET" });
        if (r.ok) {
          const d = await r.json();
          this.available = !!(d && d.ok && d.imageGeneration);
          this.provider = (d && d.provider) || null;
          this.providers = (d && d.providers) || [];
          this.builtinDefault = !!(d && d.builtinDefault);
        }
      } catch (e) { this.available = false; }
      // Even without the API route (static hosting), the direct
      // client-side fallback keeps generation alive.
      if (!this.available) { this.available = true; this.provider = "direct"; this.directOnly = true; }
      return this.available;
    },
    /* Pure client-side generation URL (keyless Pollinations FLUX).
       Used when /api/nova-image is not deployed or fails. */
    directUrl(payload, seed) {
      const px = FORMAT_PIXELS[payload.format] || FORMAT_PIXELS.square;
      let prompt = String(payload.prompt || "");
      if (payload.negative) {
        const neg = String(payload.negative).split(",").slice(0, 6).map(s => s.trim()).filter(Boolean).join(", ");
        if (neg) prompt += ". Avoid: " + neg;
      }
      const qs = new URLSearchParams({
        width: String(px.w), height: String(px.h), seed: String(seed),
        model: "flux", nologo: "true", enhance: "false", safe: "true"
      });
      return "https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt.slice(0, 1800)) + "?" + qs.toString();
    },
    async directGenerate(payload, onStatus) {
      const seed = parseInt(payload.seed, 10) || randomSeed();
      const px = FORMAT_PIXELS[payload.format] || FORMAT_PIXELS.square;
      const url = this.directUrl(payload, seed);
      if (onStatus) onStatus("rendering");
      // Preload in the browser so we only report success for a real image.
      const ok = await new Promise((resolve) => {
        const im = new Image();
        const timer = setTimeout(() => resolve(false), 90000);
        im.onload = () => { clearTimeout(timer); resolve(true); };
        im.onerror = () => { clearTimeout(timer); resolve(false); };
        im.src = url;
      });
      if (!ok) return { ok: false, reason: "provider_error" };
      return { ok: true, images: [{ url, seed, width: px.w, height: px.h }], provider: "pollinations", model: "flux", width: px.w, height: px.h, seed, direct: true };
    },
    /* Generate through the server (provider chain + fallback); if the
       server route itself is unreachable or fails, fall back to the
       direct client-side path. Returns
       { ok, images:[{url,seed,width,height}], provider, model, … }
       or { ok:false, reason }. onStatus receives pipeline stages. */
    async generate(payload, onStatus) {
      const status = (s) => { try { if (onStatus) onStatus(s); } catch (e) {} };
      status("preparing");
      if (!payload.seed) payload.seed = randomSeed();
      const started = now();
      if (!this.directOnly) {
        try {
          status("requesting");
          const r = await fetch("/api/nova-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          const d = await r.json();
          if (d && d.ok && d.images && d.images.length) {
            status("done");
            d.elapsedMs = d.elapsedMs || (now() - started);
            return d;
          }
          // hard server-declared no-backend or provider failure →
          // try the direct client path before giving up
          const direct = await this.directGenerate(payload, status);
          if (direct.ok) { status("done"); direct.elapsedMs = now() - started; return direct; }
          status("error");
          return d && d.reason ? d : { ok: false, reason: "generation_failed" };
        } catch (e) { /* network / route missing → direct path below */ }
      }
      try {
        status("requesting");
        const direct = await this.directGenerate(payload, status);
        if (direct.ok) { status("done"); direct.elapsedMs = now() - started; return direct; }
        status("error");
        return direct;
      } catch (e) { status("error"); return { ok: false, reason: "network_error" }; }
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     10b · GENERATIONS — image result history (local, capped)
     Stores metadata + a reproducible seed/URL, never huge data URLs.
     ═══════════════════════════════════════════════════════════════ */
  const GEN_KEY = "dentoverse_nova_img_generations_v1";
  const Generations = {
    list() { return lsGet(GEN_KEY, []); },
    add(entry) {
      const list = lsGet(GEN_KEY, []);
      const rec = {
        id: uid(), t: now(),
        prompt: String(entry.prompt || "").slice(0, 1200),
        negative: String(entry.negative || "").slice(0, 600),
        preset: entry.preset || "", format: entry.format || "square",
        provider: entry.provider || "", model: entry.model || "",
        seed: entry.seed || null,
        width: entry.width || null, height: entry.height || null,
        // keep only compact, refetchable URLs (not multi-MB data URLs)
        url: (entry.url && entry.url.length < 2048) ? entry.url : (entry.sourceUrl || null)
      };
      list.unshift(rec);
      lsSet(GEN_KEY, list.slice(0, 30));
      return rec;
    },
    remove(id) { lsSet(GEN_KEY, lsGet(GEN_KEY, []).filter(x => x.id !== id)); },
    clear() { lsSet(GEN_KEY, []); }
  };

  /* ═══════════════════════════════════════════════════════════════
     Public API
     ═══════════════════════════════════════════════════════════════ */
  window.NovaImage = {
    version: "2.0-phase3",
    detectLang,
    isImageRequest,
    Understand: { parse: understand, missingDetails, personalize },
    Presets: PRESETS,
    Formats: { list: FORMATS, recommend: recommendFormat },
    Compositions: COMPOSITIONS,
    Quality: QUALITY,
    Compose: compose,
    Variants: variants,
    Refine: refine,
    Memory,
    Library: { items: LIBRARY, apply: libraryApply },
    Backend,
    Generations
  };
})();
