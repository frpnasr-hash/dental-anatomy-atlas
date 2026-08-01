/* ═══════════════════════════════════════════════════════
   TOOTH DETAILS — Surface labels & clinical data per class
   ═══════════════════════════════════════════════════════ */

const IDENTIFICATION_DATA = {
  incisor: {
    crown: {
      shape: 'Trapezoidal (labial view), triangular (proximal view)',
      outline: 'Convex mesial and distal outlines, widest at contact areas',
      symmetry: 'Nearly bilaterally symmetrical, slight asymmetry in laterals',
      edge: 'Straight incisal edge in newly erupted teeth, becomes rounded with wear'
    },
    root: {
      length: '12–13 mm (maxillary central); 12–14 mm (mandibular)',
      shape: 'Conical, tapered, single root',
      curvature: 'Straight to slight distal curvature at the apex',
      count: '1'
    },
    distinguishing: {
      mes: 'Mesioincisal angle: sharp (~90°)',
      dist: 'Distoincisal angle: more rounded than mesial',
      cing: 'Cingulum located on cervical third of lingual surface',
      contact: 'Mesial contact more incisal than distal'
    },
    contact: {
      mesial: { loc: 'Incisal third, near incisal edge', shape: 'Small, oval' },
      distal: { loc: 'Junction of incisal and middle third', shape: 'Small, more cervical than mesial' }
    },
    clinical: {
      endo: 'Single root canal, typically straight. Access cavity is triangular on the lingual surface just above the cingulum. Avoid perforation through the labial surface.',
      rest: 'High esthetic importance. Restorations should reproduce mamelons, mesial-distal contour, and incisal translucency. Composite layering is preferred for anterior restorations.',
      ext: 'Single-rooted, straight forceps (#1 upper, #151 lower). Rotational movement primary, with slight labial-lingual luxation. Watch adjacent central for damage.'
    }
  },
  canine: {
    crown: {
      shape: 'Pentagonal (labial view), triangular (proximal view)',
      outline: 'Convex on all surfaces, widest crown mesiodistally at middle third',
      symmetry: 'Asymmetrical — mesial cusp slope shorter than distal',
      edge: 'Single sharp cusp tip, longest crown in the arch'
    },
    root: {
      length: '17 mm (maxillary — longest tooth in the mouth); 15–16 mm (mandibular)',
      shape: 'Long, tapered, conical, thick',
      curvature: 'Straight, sometimes slight distal curve at apex',
      count: '1'
    },
    distinguishing: {
      mes: 'Mesial cusp slope shorter than distal',
      dist: 'Distal cusp slope longer than mesial',
      cing: 'Well-developed, larger than in incisors',
      contact: 'Mesial contact at junction of incisal and middle thirds'
    },
    contact: {
      mesial: { loc: 'Junction of incisal and middle third', shape: 'Oval, slightly larger than incisors' },
      distal: { loc: 'Middle third of the crown', shape: 'Oval, more cervical than mesial' }
    },
    clinical: {
      endo: 'Single canal, oval in cross-section. The canal is wide and long — one of the longest teeth in the mouth. Working length can exceed 25 mm.',
      rest: 'Class III/V restorations most common. Preserve the cingulum and marginal ridges. Deep incisal wear may require full coverage.',
      ext: 'Cornerstone of the arch — considered the "corner tooth". Long thick root requires firm apical pressure with rotational and labial-lingual movement.'
    }
  },
  premolar: {
    crown: {
      shape: 'Pentagonal (buccal), trapezoidal (proximal)',
      outline: 'Buccal cusp longer and sharper than lingual (max); nearly equal (mand 2nd)',
      symmetry: 'Buccolingual dimension greater than mesiodistal',
      edge: 'Two cusps: buccal and lingual, separated by a central groove (or three cusps in mand 2nd premolar Y-form)'
    },
    root: {
      length: '14 mm average',
      shape: 'Single root (usually) — maxillary first premolar has two roots (buccal and lingual)',
      curvature: 'Straight or slightly curved distally',
      count: '1–2 (maxillary 1st premolar has 2)'
    },
    distinguishing: {
      mes: 'Mesial developmental depression on maxillary first premolar (canine fossa)',
      dist: 'Distal marginal ridge more rounded than mesial',
      cing: 'Not applicable — cusps replace cingulum',
      contact: 'Both contacts in middle third'
    },
    contact: {
      mesial: { loc: 'Junction of occlusal and middle third', shape: 'Oval' },
      distal: { loc: 'Middle third of the crown', shape: 'Oval, more cervical than mesial' }
    },
    clinical: {
      endo: 'Maxillary 1st premolar often has 2 canals (buccal & lingual). Others usually 1 canal, may bifurcate apically. Beware root perforations — thin roots.',
      rest: 'Class II restorations frequent. Preserve marginal ridges and buccal cusp height. MOD preparations weaken tooth — consider onlay/crown.',
      ext: 'Delicate roots — risk of fracture. Use gentle apical pressure and figure-8 luxation. Extract with universal upper premolar forceps #150.'
    }
  },
  molar: {
    crown: {
      shape: 'Rhomboidal/rectangular (occlusal), trapezoidal (proximal)',
      outline: 'Widest tooth mesiodistally; buccolingual dimension is significant',
      symmetry: 'Multiple cusps (4–5), transverse and oblique ridges',
      edge: 'Occlusal table with cusps, ridges, grooves, pits, and fossae'
    },
    root: {
      length: '12–14 mm',
      shape: 'Multi-rooted: 3 roots (maxillary — 2 buccal + 1 palatal); 2 roots (mandibular — mesial + distal)',
      curvature: 'Roots diverge, often curved',
      count: '2–3'
    },
    distinguishing: {
      mes: 'Mesial marginal ridge continuous with mesiobuccal cusp',
      dist: 'Distal marginal ridge lower than mesial',
      cing: 'Absent; replaced by prominent lingual cusps',
      contact: 'Both contacts in middle to occlusal third'
    },
    contact: {
      mesial: { loc: 'Junction of occlusal and middle third', shape: 'Broad, oval' },
      distal: { loc: 'Middle third', shape: 'Broad, oval' }
    },
    clinical: {
      endo: 'Multiple canals: MB, DB, P (maxillary — often 4 canals with MB2); Mesial (MB+ML) & Distal in mandibular. Complex canal anatomy — magnification recommended.',
      rest: 'Heavy occlusal load — cuspal coverage often needed after large restorations. Preserve oblique ridge on maxillary molars.',
      ext: 'Multi-rooted — figure-8 luxation combined with buccal-lingual movement. Section roots for third molars or divergent roots. Use cowhorn or #17/23 forceps.'
    }
  }
};

const SURFACE_DATA = {
  incisor: {
    labial: {
      title: 'Labial Surface View',
      labels: [
        { n: 'Mesioincisal Angle', d: 'Sharp corner ~90° between mesial edge and incisal edge' },
        { n: 'Distoincisal Angle', d: 'More rounded than the mesioincisal angle' },
        { n: 'Mesial Outline', d: 'Slightly convex, straight from CEJ to contact area' },
        { n: 'Distal Outline', d: 'More convex than mesial outline' },
        { n: 'Height of Contour', d: 'Located in the cervical third of the crown' },
        { n: 'Cervical Line (CEJ)', d: 'Semicircular curve, convex toward the root apex' },
        { n: 'Incisal Edge / Ridge', d: 'Straight in new teeth, rounded with wear' },
        { n: 'Mamelons', d: '3 small elevations on newly erupted incisal edge (worn later)' },
        { n: 'Root Apex', d: 'Blunt, tapered end of the root' }
      ]
    },
    lingual: {
      title: 'Lingual Surface View',
      labels: [
        { n: 'Cingulum', d: 'Bulge on cervical third of the lingual surface' },
        { n: 'Lingual Fossa', d: 'Shallow depression between marginal ridges' },
        { n: 'Mesial Marginal Ridge', d: 'Linear elevation along the mesial edge' },
        { n: 'Distal Marginal Ridge', d: 'Linear elevation along the distal edge' },
        { n: 'Lingual Pit', d: 'Small depression at junction of cingulum & fossa' },
        { n: 'Cervical Line', d: 'CEJ curvature is less pronounced than labial side' },
        { n: 'Root Surface', d: 'Narrower lingually than labially, tapers to apex' }
      ]
    },
    mesial: {
      title: 'Mesial Surface View',
      labels: [
        { n: 'Incisal Ridge', d: 'Positioned centered over the root axis' },
        { n: 'Labial Height of Contour', d: 'Cervical third of labial surface' },
        { n: 'Lingual Height of Contour', d: 'Cervical third at the cingulum' },
        { n: 'CEJ Curvature', d: 'Greatest curvature of any surface — 3-4 mm toward incisal' },
        { n: 'Contact Area', d: 'Located in the incisal third' },
        { n: 'Root Apex', d: 'Blunt, may curve slightly distally' },
        { n: 'Root Surface', d: 'Convex, may show a slight developmental depression' }
      ]
    },
    distal: {
      title: 'Distal Surface View',
      labels: [
        { n: 'Distal Contact Area', d: 'Located at the junction of incisal & middle thirds' },
        { n: 'CEJ Curvature', d: 'Less pronounced than mesial (2-3 mm toward incisal)' },
        { n: 'Root Surface', d: 'Convex; often shows a longitudinal developmental groove' },
        { n: 'Incisal Ridge', d: 'Slightly to the labial of the root axis' },
        { n: 'Labial Height of Contour', d: 'In the cervical third' },
        { n: 'Root Apex', d: 'Blunt end; slight distal curvature common' }
      ]
    },
    incisal: {
      title: 'Incisal Surface View',
      labels: [
        { n: 'Labial Outline', d: 'Broad and slightly convex' },
        { n: 'Lingual Outline', d: 'Narrower, converges toward cingulum' },
        { n: 'Mesial Outline', d: 'Straight; joins incisal edge at ~90°' },
        { n: 'Distal Outline', d: 'Convex, more rounded than mesial' },
        { n: 'Incisal Edge', d: 'Runs mesiodistally; slight labial to root axis' },
        { n: 'Cingulum', d: 'Visible bulge on lingual side of view' }
      ]
    }
  },
  canine: {
    labial: {
      title: 'Labial Surface View',
      labels: [
        { n: 'Cusp Tip', d: 'Sharp point at incisal center' },
        { n: 'Mesial Cusp Slope', d: 'Shorter of the two slopes' },
        { n: 'Distal Cusp Slope', d: 'Longer of the two slopes' },
        { n: 'Labial Ridge', d: 'Prominent vertical elevation from cusp tip to cervical' },
        { n: 'Mesial Outline', d: 'Convex to slightly straight' },
        { n: 'Distal Outline', d: 'More convex; concave near CEJ' },
        { n: 'Cervical Line', d: 'Curves apically toward the root' },
        { n: 'Root Apex', d: 'Longest root in the mouth (maxillary)' }
      ]
    },
    lingual: {
      title: 'Lingual Surface View',
      labels: [
        { n: 'Cingulum', d: 'Well-developed, larger than in incisors' },
        { n: 'Lingual Ridge', d: 'Runs from cusp tip to cingulum, dividing lingual surface' },
        { n: 'Mesiolingual Fossa', d: 'Shallow depression mesial to lingual ridge' },
        { n: 'Distolingual Fossa', d: 'Shallow depression distal to lingual ridge' },
        { n: 'Mesial Marginal Ridge', d: 'Linear elevation on mesial edge' },
        { n: 'Distal Marginal Ridge', d: 'Linear elevation on distal edge' },
        { n: 'Root Apex', d: 'Tapered end, slight distal curvature possible' }
      ]
    },
    mesial: {
      title: 'Mesial Surface View',
      labels: [
        { n: 'Cusp Tip', d: 'Slightly labial to the root axis' },
        { n: 'Labial Height of Contour', d: 'Cervical third — more pronounced than incisors' },
        { n: 'Lingual Height of Contour', d: 'Cervical third at cingulum' },
        { n: 'CEJ Curvature', d: 'Highest curve — up to 2.5 mm incisally' },
        { n: 'Contact Area', d: 'Junction of incisal & middle thirds' },
        { n: 'Root Surface', d: 'Broad, convex; may show developmental depression' }
      ]
    },
    distal: {
      title: 'Distal Surface View',
      labels: [
        { n: 'Distal Contact Area', d: 'Middle third — more cervical than mesial' },
        { n: 'CEJ Curvature', d: 'Less than mesial (1.5-2 mm)' },
        { n: 'Root Surface', d: 'Broad, often deeper developmental groove' },
        { n: 'Cusp Tip', d: 'Slightly toward the labial from root axis' },
        { n: 'Root Apex', d: 'Blunt or slightly pointed' }
      ]
    },
    incisal: {
      title: 'Incisal Surface View',
      labels: [
        { n: 'Cusp Tip', d: 'Prominent single point at incisal center' },
        { n: 'Labial Outline', d: 'Broad, convex' },
        { n: 'Lingual Outline', d: 'Narrower, converges to cingulum' },
        { n: 'Mesial Slope', d: 'Shorter, converges to cusp tip' },
        { n: 'Distal Slope', d: 'Longer, more gentle slope' },
        { n: 'Cingulum', d: 'Prominent bulge on lingual side' }
      ]
    }
  },
  premolar: {
    labial: {
      title: 'Buccal Surface View',
      labels: [
        { n: 'Buccal Cusp Tip', d: 'Sharp point near center of buccal surface' },
        { n: 'Mesial Cusp Slope', d: 'Shorter slope (maxillary 1st premolar)' },
        { n: 'Distal Cusp Slope', d: 'Longer slope (maxillary 1st premolar)' },
        { n: 'Buccal Ridge', d: 'Vertical elevation from cusp tip to cervical' },
        { n: 'Mesial Outline', d: 'Slightly convex, concave near CEJ' },
        { n: 'Distal Outline', d: 'Convex' },
        { n: 'Root Apex', d: 'Tapered; may bifurcate in max 1st premolar' }
      ]
    },
    lingual: {
      title: 'Lingual Surface View',
      labels: [
        { n: 'Lingual Cusp Tip', d: 'Shorter and smaller than buccal cusp (maxillary)' },
        { n: 'Mesial Marginal Ridge', d: 'Prominent elevation on mesial edge' },
        { n: 'Distal Marginal Ridge', d: 'Prominent elevation on distal edge' },
        { n: 'Lingual Surface', d: 'Smooth, convex overall' },
        { n: 'Root Surface', d: 'Convex, tapers to apex' }
      ]
    },
    mesial: {
      title: 'Mesial Surface View',
      labels: [
        { n: 'Buccal Cusp Tip', d: 'Longer than lingual cusp in maxillary' },
        { n: 'Lingual Cusp Tip', d: 'Shorter than buccal in maxillary' },
        { n: 'Central Groove', d: 'Separates buccal & lingual cusps on occlusal' },
        { n: 'Mesial Marginal Ridge', d: 'Height of contour at occlusal third' },
        { n: 'Mesial Developmental Depression', d: 'Canine fossa — unique to max 1st premolar' },
        { n: 'Contact Area', d: 'Junction of occlusal & middle thirds' },
        { n: 'CEJ Curvature', d: 'Curves toward the occlusal — 1 mm' }
      ]
    },
    distal: {
      title: 'Distal Surface View',
      labels: [
        { n: 'Distal Contact Area', d: 'Middle third of crown' },
        { n: 'Distal Marginal Ridge', d: 'Lower than mesial marginal ridge' },
        { n: 'CEJ Curvature', d: 'Slight — <1 mm toward occlusal' },
        { n: 'Root Surface', d: 'Convex; distal depression common' },
        { n: 'Root Apex', d: 'Tapered, may curve distally' }
      ]
    },
    incisal: {
      title: 'Occlusal Surface View',
      labels: [
        { n: 'Buccal Cusp', d: 'Larger cusp on buccal side' },
        { n: 'Lingual Cusp', d: 'Smaller cusp on lingual side (maxillary)' },
        { n: 'Central Groove', d: 'Runs mesiodistally between cusps' },
        { n: 'Mesial Marginal Groove', d: 'Crosses the mesial marginal ridge' },
        { n: 'Mesial Triangular Fossa', d: 'Shallow depression at mesial end of central groove' },
        { n: 'Distal Triangular Fossa', d: 'Shallow depression at distal end of central groove' },
        { n: 'Mesial Marginal Ridge', d: 'Bounds the occlusal table mesially' },
        { n: 'Distal Marginal Ridge', d: 'Bounds the occlusal table distally' }
      ]
    }
  },
  molar: {
    labial: {
      title: 'Buccal Surface View',
      labels: [
        { n: 'Mesiobuccal Cusp (MB)', d: 'Anterior buccal cusp' },
        { n: 'Distobuccal Cusp (DB)', d: 'Posterior buccal cusp' },
        { n: 'Buccal Groove', d: 'Vertical developmental groove between cusps' },
        { n: 'Buccal Pit', d: 'Small pit at cervical end of buccal groove (may harbor caries)' },
        { n: 'Mesial Outline', d: 'Convex, less than distal' },
        { n: 'Distal Outline', d: 'More convex than mesial' },
        { n: 'Roots', d: 'Two buccal roots visible: mesiobuccal & distobuccal (maxillary)' }
      ]
    },
    lingual: {
      title: 'Lingual/Palatal Surface View',
      labels: [
        { n: 'Mesiolingual Cusp (ML)', d: 'Largest cusp in maxillary 1st molar' },
        { n: 'Distolingual Cusp (DL)', d: 'Smaller than mesiolingual' },
        { n: 'Lingual Groove', d: 'Between mesiolingual and distolingual cusps' },
        { n: 'Cusp of Carabelli', d: 'Fifth cusp on ML cusp (maxillary 1st molar) — variable' },
        { n: 'Palatal Root', d: 'Single, long, divergent (maxillary)' }
      ]
    },
    mesial: {
      title: 'Mesial Surface View',
      labels: [
        { n: 'Mesiobuccal Cusp', d: 'Buccal-side cusp' },
        { n: 'Mesiolingual Cusp', d: 'Lingual-side cusp — often larger' },
        { n: 'Mesial Marginal Ridge', d: 'Height of contour at occlusal third' },
        { n: 'Contact Area', d: 'Junction of occlusal & middle thirds' },
        { n: 'Mesial Root', d: 'Single mesial root (mandibular); MB root (maxillary)' },
        { n: 'CEJ Curvature', d: 'Slight — <1 mm toward occlusal' }
      ]
    },
    distal: {
      title: 'Distal Surface View',
      labels: [
        { n: 'Distobuccal Cusp', d: 'Smaller than mesiobuccal' },
        { n: 'Distolingual Cusp', d: 'Smaller than mesiolingual' },
        { n: 'Distal Marginal Ridge', d: 'Lower than mesial' },
        { n: 'Contact Area', d: 'Middle third' },
        { n: 'Distal Root', d: 'Single distal root (mandibular); DB root (maxillary)' }
      ]
    },
    incisal: {
      title: 'Occlusal Surface View',
      labels: [
        { n: 'Mesiobuccal Cusp (MB)', d: 'Anterior-buccal quadrant' },
        { n: 'Distobuccal Cusp (DB)', d: 'Posterior-buccal quadrant' },
        { n: 'Mesiolingual Cusp (ML)', d: 'Anterior-lingual quadrant (largest in max 1st)' },
        { n: 'Distolingual Cusp (DL)', d: 'Posterior-lingual quadrant' },
        { n: 'Oblique Ridge', d: 'Unique to maxillary molars — MB to DL' },
        { n: 'Central Fossa', d: 'Deepest depression at occlusal center' },
        { n: 'Mesial Triangular Fossa', d: 'Depression mesial to central' },
        { n: 'Distal Triangular Fossa', d: 'Depression distal to central' },
        { n: 'Central Pit', d: 'Small deep pit at fossa center' },
        { n: 'Buccal Groove', d: 'Extends onto buccal surface' },
        { n: 'Lingual Groove', d: 'Extends onto lingual surface' }
      ]
    }
  }
};

// SVG surface illustrations for each class
const SURFACE_SVG = {
  incisor: {
    labial: `
      <svg viewBox="0 0 400 550" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <defs>
          <linearGradient id="isL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c8e2ff"/></linearGradient>
          <linearGradient id="isR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4a574"/><stop offset="1" stop-color="#8b6f47"/></linearGradient>
        </defs>
        <!-- Crown -->
        <path d="M 130 60 L 270 60 L 285 220 Q 200 260 115 220 Z" fill="url(#isL)" stroke="#4a8fd4" stroke-width="2"/>
        <!-- Root -->
        <path d="M 115 220 Q 130 400 175 490 Q 200 510 225 490 Q 270 400 285 220 Z" fill="url(#isR)" stroke="#6b5033" stroke-width="1.5"/>
        <!-- CEJ line -->
        <path d="M 115 220 Q 200 240 285 220" fill="none" stroke="#00d4ff" stroke-width="2" stroke-dasharray="4 3"/>
        <!-- Mamelons -->
        <path d="M 145 60 Q 155 68 165 60 M 190 60 Q 200 70 210 60 M 235 60 Q 245 68 255 60" fill="none" stroke="#8bc9ff" stroke-width="1.5"/>

        <!-- LABELS with arrows -->
        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 130 60 L 60 40"/><path d="M 270 60 L 340 40"/>
          <path d="M 130 90 L 30 90"/><path d="M 270 90 L 370 90"/>
          <path d="M 180 130 L 20 160"/><path d="M 285 220 L 370 220"/>
          <path d="M 200 60 L 200 15"/><path d="M 200 490 L 30 470"/>
          <path d="M 190 50 L 190 5"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="60" cy="40" r="4"/><circle cx="340" cy="40" r="4"/>
          <circle cx="30" cy="90" r="4"/><circle cx="370" cy="90" r="4"/>
          <circle cx="20" cy="160" r="4"/><circle cx="370" cy="220" r="4"/>
          <circle cx="200" cy="15" r="4"/><circle cx="30" cy="470" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="12" fill="#fff">
          <text x="58" y="35" text-anchor="end">MESIOINCISAL</text>
          <text x="60" y="20" text-anchor="end" font-size="9" fill="#8bc9ff">Angle (~90°)</text>
          <text x="342" y="35">DISTOINCISAL</text>
          <text x="342" y="20" font-size="9" fill="#8bc9ff">Angle (rounded)</text>
          <text x="28" y="85" text-anchor="end">MESIAL</text>
          <text x="28" y="98" text-anchor="end" font-size="9" fill="#8bc9ff">Outline</text>
          <text x="372" y="85">DISTAL</text>
          <text x="372" y="98" font-size="9" fill="#8bc9ff">Outline</text>
          <text x="18" y="155" text-anchor="end">HEIGHT</text>
          <text x="18" y="168" text-anchor="end" font-size="9" fill="#8bc9ff">of Contour</text>
          <text x="372" y="220">CEJ / CERVICAL</text>
          <text x="372" y="233" font-size="9" fill="#8bc9ff">Line</text>
          <text x="200" y="12" text-anchor="middle">INCISAL EDGE</text>
          <text x="28" y="465" text-anchor="end">ROOT APEX</text>
        </g>
      </svg>`,
    lingual: `
      <svg viewBox="0 0 400 550" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <defs>
          <linearGradient id="isLL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c8e2ff"/></linearGradient>
          <radialGradient id="cingG" cx="0.5" cy="0.5"><stop offset="0" stop-color="#d0e8ff"/><stop offset="1" stop-color="#6ba3d8"/></radialGradient>
        </defs>
        <path d="M 135 60 L 265 60 L 280 220 Q 200 260 120 220 Z" fill="url(#isLL)" stroke="#4a8fd4" stroke-width="2"/>
        <path d="M 120 220 Q 135 400 175 490 Q 200 510 225 490 Q 265 400 280 220 Z" fill="url(#isR)" stroke="#6b5033" stroke-width="1.5"/>
        <!-- Cingulum -->
        <ellipse cx="200" cy="200" rx="60" ry="35" fill="url(#cingG)" opacity="0.7"/>
        <!-- Marginal ridges -->
        <path d="M 140 80 L 130 210" stroke="#6b8fbf" stroke-width="3" fill="none"/>
        <path d="M 260 80 L 270 210" stroke="#6b8fbf" stroke-width="3" fill="none"/>
        <!-- Fossa -->
        <ellipse cx="200" cy="140" rx="40" ry="30" fill="#a0c8f0" opacity="0.4"/>
        <!-- Lingual pit -->
        <circle cx="200" cy="185" r="4" fill="#3a5a80"/>

        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 200 200 L 340 200"/>
          <path d="M 200 140 L 30 130"/>
          <path d="M 140 130 L 20 200"/>
          <path d="M 260 130 L 370 260"/>
          <path d="M 200 185 L 340 320"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="340" cy="200" r="4"/>
          <circle cx="30" cy="130" r="4"/>
          <circle cx="20" cy="200" r="4"/>
          <circle cx="370" cy="260" r="4"/>
          <circle cx="340" cy="320" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="12" fill="#fff">
          <text x="342" y="195">CINGULUM</text>
          <text x="342" y="210" font-size="9" fill="#8bc9ff">Cervical bulge</text>
          <text x="28" y="125" text-anchor="end">LINGUAL FOSSA</text>
          <text x="18" y="195" text-anchor="end">MESIAL MARG.</text>
          <text x="18" y="208" text-anchor="end" font-size="9" fill="#8bc9ff">Ridge</text>
          <text x="372" y="255">DISTAL MARG.</text>
          <text x="372" y="268" font-size="9" fill="#8bc9ff">Ridge</text>
          <text x="342" y="315">LINGUAL PIT</text>
        </g>
      </svg>`,
    mesial: `
      <svg viewBox="0 0 400 550" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <defs>
          <linearGradient id="ism" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="0.5" stop-color="#e8f4ff"/><stop offset="1" stop-color="#c8e2ff"/></linearGradient>
        </defs>
        <!-- Wedge shape (proximal view) -->
        <path d="M 195 60 L 245 90 Q 260 150 240 210 L 230 240 Q 200 260 170 240 L 160 210 Q 140 150 155 90 Z" fill="url(#ism)" stroke="#4a8fd4" stroke-width="2"/>
        <path d="M 170 240 Q 155 400 190 490 Q 200 510 210 490 Q 245 400 230 240 Z" fill="url(#isR)" stroke="#6b5033" stroke-width="1.5"/>
        <path d="M 170 240 Q 200 255 230 240" stroke="#00d4ff" stroke-width="2" fill="none" stroke-dasharray="4 3"/>

        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 200 60 L 200 15"/>
          <path d="M 245 100 L 370 90"/>
          <path d="M 155 100 L 30 90"/>
          <path d="M 200 245 L 30 245"/>
          <path d="M 245 130 L 370 180"/>
          <path d="M 200 490 L 370 490"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="200" cy="15" r="4"/>
          <circle cx="370" cy="90" r="4"/>
          <circle cx="30" cy="90" r="4"/>
          <circle cx="30" cy="245" r="4"/>
          <circle cx="370" cy="180" r="4"/>
          <circle cx="370" cy="490" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="12" fill="#fff">
          <text x="200" y="12" text-anchor="middle">INCISAL RIDGE</text>
          <text x="372" y="85">LABIAL HEIGHT</text>
          <text x="372" y="98" font-size="9" fill="#8bc9ff">of Contour</text>
          <text x="28" y="85" text-anchor="end">LINGUAL HEIGHT</text>
          <text x="28" y="98" text-anchor="end" font-size="9" fill="#8bc9ff">of Contour</text>
          <text x="28" y="240" text-anchor="end">CEJ CURVE</text>
          <text x="28" y="253" text-anchor="end" font-size="9" fill="#8bc9ff">Greatest (~3-4mm)</text>
          <text x="372" y="175">CONTACT AREA</text>
          <text x="372" y="188" font-size="9" fill="#8bc9ff">Incisal third</text>
          <text x="372" y="485">ROOT APEX</text>
        </g>
      </svg>`,
    distal: `
      <svg viewBox="0 0 400 550" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <path d="M 205 60 L 155 90 Q 140 150 160 210 L 170 240 Q 200 260 230 240 L 240 210 Q 260 150 245 90 Z" fill="url(#ism)" stroke="#4a8fd4" stroke-width="2"/>
        <path d="M 230 240 Q 245 400 210 490 Q 200 510 190 490 Q 155 400 170 240 Z" fill="url(#isR)" stroke="#6b5033" stroke-width="1.5"/>
        <path d="M 170 240 Q 200 255 230 240" stroke="#00d4ff" stroke-width="2" fill="none" stroke-dasharray="4 3"/>
        <!-- Longitudinal groove on root -->
        <path d="M 200 260 L 200 480" stroke="#5a4028" stroke-width="2" opacity="0.5"/>

        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 155 165 L 30 165"/>
          <path d="M 200 245 L 370 260"/>
          <path d="M 200 350 L 370 380"/>
          <path d="M 200 60 L 30 40"/>
          <path d="M 155 90 L 30 90"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="30" cy="165" r="4"/>
          <circle cx="370" cy="260" r="4"/>
          <circle cx="370" cy="380" r="4"/>
          <circle cx="30" cy="40" r="4"/>
          <circle cx="30" cy="90" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="12" fill="#fff">
          <text x="28" y="160" text-anchor="end">DISTAL CONTACT</text>
          <text x="28" y="173" text-anchor="end" font-size="9" fill="#8bc9ff">Mid-incisal 3rd junction</text>
          <text x="372" y="255">CEJ CURVE</text>
          <text x="372" y="268" font-size="9" fill="#8bc9ff">Less than mesial</text>
          <text x="372" y="375">DEVELOPMENTAL</text>
          <text x="372" y="388" font-size="9" fill="#8bc9ff">Groove (on root)</text>
          <text x="28" y="35" text-anchor="end">INCISAL RIDGE</text>
          <text x="28" y="85" text-anchor="end">LABIAL H.O.C.</text>
        </g>
      </svg>`,
    incisal: `
      <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <defs>
          <radialGradient id="incG" cx="0.5" cy="0.5"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#8bc9ff"/></radialGradient>
        </defs>
        <!-- Triangular incisal view -->
        <path d="M 80 180 Q 200 90 320 180 Q 340 220 300 260 Q 200 290 100 260 Q 60 220 80 180 Z" fill="url(#incG)" stroke="#4a8fd4" stroke-width="2"/>
        <!-- Cingulum bulge (bottom = lingual) -->
        <ellipse cx="200" cy="255" rx="70" ry="25" fill="#6ba3d8" opacity="0.6"/>
        <!-- Incisal edge -->
        <path d="M 80 180 Q 200 175 320 180" stroke="#ff6b1a" stroke-width="3" fill="none"/>

        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 200 130 L 200 30"/>
          <path d="M 200 265 L 200 370"/>
          <path d="M 90 170 L 20 130"/>
          <path d="M 310 170 L 380 130"/>
          <path d="M 200 180 L 300 40"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="200" cy="30" r="4"/><circle cx="200" cy="370" r="4"/>
          <circle cx="20" cy="130" r="4"/><circle cx="380" cy="130" r="4"/>
          <circle cx="300" cy="40" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="12" fill="#fff">
          <text x="200" y="25" text-anchor="middle">LABIAL OUTLINE</text>
          <text x="200" y="385" text-anchor="middle">LINGUAL OUTLINE</text>
          <text x="200" y="395" text-anchor="middle" font-size="9" fill="#8bc9ff">(with cingulum)</text>
          <text x="18" y="125" text-anchor="end">MESIAL OUTLINE</text>
          <text x="382" y="125">DISTAL OUTLINE</text>
          <text x="300" y="35" text-anchor="middle">INCISAL EDGE</text>
        </g>
      </svg>`
  },
  canine: {
    labial: `
      <svg viewBox="0 0 400 580" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <defs>
          <linearGradient id="cnL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c8e2ff"/></linearGradient>
          <linearGradient id="cnR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4a574"/><stop offset="1" stop-color="#8b6f47"/></linearGradient>
        </defs>
        <!-- Crown with cusp -->
        <path d="M 200 40 L 175 100 L 145 130 L 130 220 Q 200 265 270 220 L 260 130 L 235 100 Z" fill="url(#cnL)" stroke="#4a8fd4" stroke-width="2"/>
        <!-- Root - long -->
        <path d="M 130 220 Q 130 420 190 530 Q 200 545 210 530 Q 270 420 270 220 Z" fill="url(#cnR)" stroke="#6b5033" stroke-width="1.5"/>
        <!-- Labial ridge -->
        <path d="M 200 40 L 200 220" stroke="#6b8fbf" stroke-width="2" fill="none" opacity="0.7"/>
        <path d="M 130 220 Q 200 240 270 220" stroke="#00d4ff" stroke-width="2" fill="none" stroke-dasharray="4 3"/>

        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 200 40 L 200 5"/>
          <path d="M 175 90 L 30 60"/>
          <path d="M 235 90 L 370 60"/>
          <path d="M 200 130 L 30 130"/>
          <path d="M 130 220 L 30 260"/>
          <path d="M 200 530 L 30 510"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="200" cy="5" r="4"/><circle cx="30" cy="60" r="4"/>
          <circle cx="370" cy="60" r="4"/><circle cx="30" cy="130" r="4"/>
          <circle cx="30" cy="260" r="4"/><circle cx="30" cy="510" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="12" fill="#fff">
          <text x="200" y="0" text-anchor="middle" alignment-baseline="hanging">CUSP TIP</text>
          <text x="28" y="55" text-anchor="end">MESIAL SLOPE</text>
          <text x="28" y="68" text-anchor="end" font-size="9" fill="#8bc9ff">(Shorter)</text>
          <text x="372" y="55">DISTAL SLOPE</text>
          <text x="372" y="68" font-size="9" fill="#8bc9ff">(Longer)</text>
          <text x="28" y="125" text-anchor="end">LABIAL RIDGE</text>
          <text x="28" y="255" text-anchor="end">CERVICAL LINE</text>
          <text x="28" y="505" text-anchor="end">ROOT APEX</text>
          <text x="28" y="518" text-anchor="end" font-size="9" fill="#8bc9ff">(Longest root)</text>
        </g>
      </svg>`,
    lingual: `
      <svg viewBox="0 0 400 580" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <path d="M 200 40 L 175 100 L 145 130 L 130 220 Q 200 265 270 220 L 260 130 L 235 100 Z" fill="url(#cnL)" stroke="#4a8fd4" stroke-width="2"/>
        <path d="M 130 220 Q 130 420 190 530 Q 200 545 210 530 Q 270 420 270 220 Z" fill="url(#cnR)" stroke="#6b5033" stroke-width="1.5"/>
        <!-- Cingulum -->
        <ellipse cx="200" cy="200" rx="55" ry="30" fill="#6ba3d8" opacity="0.7"/>
        <!-- Lingual ridge -->
        <path d="M 200 40 L 200 210" stroke="#3a5a80" stroke-width="3" fill="none"/>
        <!-- Marginal ridges -->
        <path d="M 150 110 L 145 210" stroke="#6b8fbf" stroke-width="3" fill="none"/>
        <path d="M 250 110 L 255 210" stroke="#6b8fbf" stroke-width="3" fill="none"/>
        <!-- Fossae -->
        <ellipse cx="170" cy="160" rx="18" ry="30" fill="#a0c8f0" opacity="0.5"/>
        <ellipse cx="230" cy="160" rx="18" ry="30" fill="#a0c8f0" opacity="0.5"/>

        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 200 200 L 340 200"/>
          <path d="M 200 130 L 20 100"/>
          <path d="M 170 160 L 20 200"/>
          <path d="M 230 160 L 380 200"/>
          <path d="M 145 180 L 20 300"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="340" cy="200" r="4"/><circle cx="20" cy="100" r="4"/>
          <circle cx="20" cy="200" r="4"/><circle cx="380" cy="200" r="4"/>
          <circle cx="20" cy="300" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="12" fill="#fff">
          <text x="342" y="195">CINGULUM</text>
          <text x="18" y="95" text-anchor="end">LINGUAL RIDGE</text>
          <text x="18" y="195" text-anchor="end">MESIOLINGUAL</text>
          <text x="18" y="208" text-anchor="end" font-size="9" fill="#8bc9ff">Fossa</text>
          <text x="382" y="195">DISTOLINGUAL</text>
          <text x="382" y="208" font-size="9" fill="#8bc9ff">Fossa</text>
          <text x="18" y="295" text-anchor="end">MARGINAL RIDGE</text>
        </g>
      </svg>`,
    mesial: `
      <svg viewBox="0 0 400 580" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <path d="M 200 30 L 250 90 Q 265 160 245 220 L 235 250 Q 200 275 165 250 L 155 220 Q 135 160 150 90 Z" fill="url(#cnL)" stroke="#4a8fd4" stroke-width="2"/>
        <path d="M 165 250 Q 150 420 190 530 Q 200 545 210 530 Q 250 420 235 250 Z" fill="url(#cnR)" stroke="#6b5033" stroke-width="1.5"/>
        <path d="M 165 250 Q 200 265 235 250" stroke="#00d4ff" stroke-width="2" fill="none" stroke-dasharray="4 3"/>

        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 200 30 L 200 5"/>
          <path d="M 250 100 L 370 90"/>
          <path d="M 150 100 L 30 90"/>
          <path d="M 200 255 L 30 260"/>
          <path d="M 250 140 L 370 180"/>
          <path d="M 200 530 L 370 490"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="200" cy="5" r="4"/><circle cx="370" cy="90" r="4"/>
          <circle cx="30" cy="90" r="4"/><circle cx="30" cy="260" r="4"/>
          <circle cx="370" cy="180" r="4"/><circle cx="370" cy="490" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="12" fill="#fff">
          <text x="200" y="0" text-anchor="middle" alignment-baseline="hanging">CUSP TIP</text>
          <text x="372" y="85">LABIAL H.O.C.</text>
          <text x="28" y="85" text-anchor="end">LINGUAL H.O.C.</text>
          <text x="28" y="255" text-anchor="end">CEJ CURVE</text>
          <text x="28" y="268" text-anchor="end" font-size="9" fill="#8bc9ff">Highest (~2.5mm)</text>
          <text x="372" y="175">CONTACT AREA</text>
          <text x="372" y="188" font-size="9" fill="#8bc9ff">Incisal-mid junction</text>
          <text x="372" y="485">ROOT APEX</text>
        </g>
      </svg>`,
    distal: `
      <svg viewBox="0 0 400 580" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <path d="M 200 30 L 150 90 Q 135 160 155 220 L 165 250 Q 200 275 235 250 L 245 220 Q 265 160 250 90 Z" fill="url(#cnL)" stroke="#4a8fd4" stroke-width="2"/>
        <path d="M 235 250 Q 250 420 210 530 Q 200 545 190 530 Q 150 420 165 250 Z" fill="url(#cnR)" stroke="#6b5033" stroke-width="1.5"/>
        <path d="M 165 250 Q 200 265 235 250" stroke="#00d4ff" stroke-width="2" fill="none" stroke-dasharray="4 3"/>
        <!-- Deeper developmental groove -->
        <path d="M 200 280 Q 195 400 200 510" stroke="#5a4028" stroke-width="3" opacity="0.6" fill="none"/>

        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 150 180 L 30 180"/>
          <path d="M 200 255 L 370 255"/>
          <path d="M 200 400 L 370 400"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="30" cy="180" r="4"/><circle cx="370" cy="255" r="4"/>
          <circle cx="370" cy="400" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="12" fill="#fff">
          <text x="28" y="175" text-anchor="end">DISTAL CONTACT</text>
          <text x="28" y="188" text-anchor="end" font-size="9" fill="#8bc9ff">Middle third</text>
          <text x="372" y="250">CEJ CURVE</text>
          <text x="372" y="395">DEEP DEV.</text>
          <text x="372" y="408" font-size="9" fill="#8bc9ff">Groove on root</text>
        </g>
      </svg>`,
    incisal: `
      <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <defs>
          <radialGradient id="cnIn" cx="0.5" cy="0.5"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#8bc9ff"/></radialGradient>
        </defs>
        <!-- Diamond shape -->
        <path d="M 80 200 Q 200 100 320 200 Q 340 240 300 280 Q 200 320 100 280 Q 60 240 80 200 Z" fill="url(#cnIn)" stroke="#4a8fd4" stroke-width="2"/>
        <!-- Cusp tip prominent center -->
        <circle cx="200" cy="200" r="8" fill="#ff6b1a"/>
        <circle cx="200" cy="200" r="16" fill="none" stroke="#ff6b1a" stroke-width="2" opacity="0.5"/>
        <!-- Cingulum -->
        <ellipse cx="200" cy="275" rx="65" ry="25" fill="#6ba3d8" opacity="0.6"/>
        <!-- Slopes -->
        <path d="M 200 200 L 80 200" stroke="#ff6b1a" stroke-width="2" fill="none" stroke-dasharray="3 2"/>
        <path d="M 200 200 L 320 200" stroke="#00d4ff" stroke-width="2" fill="none" stroke-dasharray="3 2"/>

        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 200 200 L 200 30"/>
          <path d="M 130 250 L 20 300"/>
          <path d="M 200 285 L 200 380"/>
          <path d="M 80 200 L 20 130"/>
          <path d="M 320 200 L 380 130"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="200" cy="30" r="4"/>
          <circle cx="20" cy="300" r="4"/>
          <circle cx="200" cy="380" r="4"/>
          <circle cx="20" cy="130" r="4"/>
          <circle cx="380" cy="130" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="12" fill="#fff">
          <text x="200" y="25" text-anchor="middle">CUSP TIP</text>
          <text x="18" y="295" text-anchor="end">CINGULUM</text>
          <text x="200" y="395" text-anchor="middle">LINGUAL OUTLINE</text>
          <text x="18" y="125" text-anchor="end">MESIAL SLOPE</text>
          <text x="382" y="125">DISTAL SLOPE</text>
        </g>
      </svg>`
  },
  premolar: {
    labial: `
      <svg viewBox="0 0 400 550" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <defs>
          <linearGradient id="pmL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c8e2ff"/></linearGradient>
        </defs>
        <path d="M 200 50 L 175 100 L 150 130 L 135 230 Q 200 270 265 230 L 250 130 L 225 100 Z" fill="url(#pmL)" stroke="#4a8fd4" stroke-width="2"/>
        <path d="M 135 230 Q 145 400 190 490 Q 200 510 210 490 Q 255 400 265 230 Z" fill="url(#cnR)" stroke="#6b5033" stroke-width="1.5"/>
        <!-- Buccal ridge -->
        <path d="M 200 50 L 200 230" stroke="#6b8fbf" stroke-width="2.5" fill="none" opacity="0.7"/>
        <path d="M 135 230 Q 200 250 265 230" stroke="#00d4ff" stroke-width="2" fill="none" stroke-dasharray="4 3"/>

        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 200 50 L 200 15"/>
          <path d="M 175 90 L 30 60"/>
          <path d="M 225 90 L 370 60"/>
          <path d="M 200 140 L 370 130"/>
          <path d="M 200 490 L 30 490"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="200" cy="15" r="4"/><circle cx="30" cy="60" r="4"/>
          <circle cx="370" cy="60" r="4"/><circle cx="370" cy="130" r="4"/>
          <circle cx="30" cy="490" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="12" fill="#fff">
          <text x="200" y="12" text-anchor="middle">BUCCAL CUSP TIP</text>
          <text x="28" y="55" text-anchor="end">MESIAL SLOPE</text>
          <text x="372" y="55">DISTAL SLOPE</text>
          <text x="372" y="125">BUCCAL RIDGE</text>
          <text x="28" y="485" text-anchor="end">ROOT APEX</text>
        </g>
      </svg>`,
    lingual: `
      <svg viewBox="0 0 400 550" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <path d="M 200 80 L 175 120 L 155 140 L 140 230 Q 200 270 260 230 L 245 140 L 225 120 Z" fill="url(#pmL)" stroke="#4a8fd4" stroke-width="2"/>
        <path d="M 140 230 Q 145 400 190 490 Q 200 510 210 490 Q 255 400 260 230 Z" fill="url(#cnR)" stroke="#6b5033" stroke-width="1.5"/>
        <!-- Marginal ridges -->
        <path d="M 155 130 L 150 220" stroke="#6b8fbf" stroke-width="3" fill="none"/>
        <path d="M 245 130 L 250 220" stroke="#6b8fbf" stroke-width="3" fill="none"/>

        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 200 80 L 200 30"/>
          <path d="M 155 180 L 30 180"/>
          <path d="M 245 180 L 370 180"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="200" cy="30" r="4"/>
          <circle cx="30" cy="180" r="4"/><circle cx="370" cy="180" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="12" fill="#fff">
          <text x="200" y="27" text-anchor="middle">LINGUAL CUSP</text>
          <text x="200" y="15" text-anchor="middle" font-size="9" fill="#8bc9ff">Shorter than buccal</text>
          <text x="28" y="175" text-anchor="end">MESIAL MARG.</text>
          <text x="28" y="188" text-anchor="end" font-size="9" fill="#8bc9ff">Ridge</text>
          <text x="372" y="175">DISTAL MARG.</text>
          <text x="372" y="188" font-size="9" fill="#8bc9ff">Ridge</text>
        </g>
      </svg>`,
    mesial: `
      <svg viewBox="0 0 400 550" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <!-- Buccal cusp (left) and lingual cusp (right) -->
        <path d="M 130 60 L 165 120 L 155 220 Q 155 245 175 245 L 225 245 Q 245 245 245 220 L 235 120 L 200 80 L 165 120" fill="none"/>
        <path d="M 130 60 L 170 120 Q 155 200 160 240 L 195 260 Q 230 260 240 240 Q 245 200 230 120 L 200 80 Z" fill="url(#pmL)" stroke="#4a8fd4" stroke-width="2"/>
        <path d="M 160 240 Q 150 400 190 500 Q 200 515 210 500 Q 250 400 240 240 Z" fill="url(#cnR)" stroke="#6b5033" stroke-width="1.5"/>
        <path d="M 160 240 Q 200 255 240 240" stroke="#00d4ff" stroke-width="2" fill="none" stroke-dasharray="4 3"/>
        <!-- Central groove -->
        <path d="M 175 130 L 185 200" stroke="#3a5a80" stroke-width="2" fill="none"/>
        <!-- Mesial developmental depression -->
        <ellipse cx="200" cy="180" rx="15" ry="35" fill="#a0c8f0" opacity="0.5"/>

        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 130 65 L 30 40"/>
          <path d="M 200 80 L 370 60"/>
          <path d="M 180 165 L 30 165"/>
          <path d="M 200 185 L 370 200"/>
          <path d="M 200 250 L 370 280"/>
          <path d="M 165 220 L 370 400"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="30" cy="40" r="4"/><circle cx="370" cy="60" r="4"/>
          <circle cx="30" cy="165" r="4"/><circle cx="370" cy="200" r="4"/>
          <circle cx="370" cy="280" r="4"/><circle cx="370" cy="400" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="12" fill="#fff">
          <text x="28" y="35" text-anchor="end">BUCCAL CUSP</text>
          <text x="372" y="55">LINGUAL CUSP</text>
          <text x="28" y="160" text-anchor="end">CENTRAL GROOVE</text>
          <text x="372" y="195">MESIAL DEV.</text>
          <text x="372" y="208" font-size="9" fill="#8bc9ff">Depression</text>
          <text x="372" y="275">CONTACT AREA</text>
          <text x="372" y="395">MARGINAL RIDGE</text>
        </g>
      </svg>`,
    distal: `
      <svg viewBox="0 0 400 550" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <path d="M 200 80 L 170 120 Q 155 200 160 240 L 195 260 Q 230 260 240 240 Q 245 200 230 120 L 270 60 L 235 100 Z" fill="url(#pmL)" stroke="#4a8fd4" stroke-width="2"/>
        <path d="M 160 240 Q 150 400 190 500 Q 200 515 210 500 Q 250 400 240 240 Z" fill="url(#cnR)" stroke="#6b5033" stroke-width="1.5"/>
        <path d="M 160 240 Q 200 255 240 240" stroke="#00d4ff" stroke-width="2" fill="none" stroke-dasharray="4 3"/>

        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 200 200 L 30 200"/>
          <path d="M 240 220 L 370 250"/>
          <path d="M 200 250 L 370 350"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="30" cy="200" r="4"/><circle cx="370" cy="250" r="4"/>
          <circle cx="370" cy="350" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="12" fill="#fff">
          <text x="28" y="195" text-anchor="end">DISTAL CONTACT</text>
          <text x="372" y="245">DISTAL MARG.</text>
          <text x="372" y="258" font-size="9" fill="#8bc9ff">Ridge (lower)</text>
          <text x="372" y="345">CEJ CURVE</text>
        </g>
      </svg>`,
    incisal: `
      <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <defs>
          <radialGradient id="pmO" cx="0.5" cy="0.5"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#8bc9ff"/></radialGradient>
        </defs>
        <!-- Occlusal outline -->
        <path d="M 100 150 Q 150 90 250 90 Q 320 100 320 200 Q 320 300 250 310 Q 150 310 110 260 Q 80 200 100 150 Z" fill="url(#pmO)" stroke="#4a8fd4" stroke-width="2"/>
        <!-- Buccal cusp -->
        <circle cx="175" cy="200" r="10" fill="#ff6b1a"/>
        <circle cx="175" cy="200" r="18" fill="none" stroke="#ff6b1a" stroke-width="1.5" opacity="0.4"/>
        <!-- Lingual cusp -->
        <circle cx="255" cy="200" r="8" fill="#00d4ff"/>
        <circle cx="255" cy="200" r="14" fill="none" stroke="#00d4ff" stroke-width="1.5" opacity="0.4"/>
        <!-- Central groove -->
        <path d="M 130 200 L 300 200" stroke="#3a5a80" stroke-width="2" fill="none"/>
        <!-- Mesial marginal ridge -->
        <path d="M 100 150 Q 200 90 320 100" stroke="#6b8fbf" stroke-width="3" fill="none" opacity="0.6"/>
        <path d="M 110 260 Q 200 310 320 300" stroke="#6b8fbf" stroke-width="3" fill="none" opacity="0.6"/>
        <!-- Fossae -->
        <circle cx="135" cy="200" r="6" fill="#3a5a80" opacity="0.7"/>
        <circle cx="295" cy="200" r="6" fill="#3a5a80" opacity="0.7"/>

        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 175 200 L 60 60"/>
          <path d="M 255 200 L 380 60"/>
          <path d="M 220 200 L 220 30"/>
          <path d="M 135 200 L 30 350"/>
          <path d="M 295 200 L 380 350"/>
          <path d="M 200 100 L 30 100"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="60" cy="60" r="4"/><circle cx="380" cy="60" r="4"/>
          <circle cx="220" cy="30" r="4"/>
          <circle cx="30" cy="350" r="4"/><circle cx="380" cy="350" r="4"/>
          <circle cx="30" cy="100" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="12" fill="#fff">
          <text x="58" y="55" text-anchor="end">BUCCAL CUSP</text>
          <text x="382" y="55">LINGUAL CUSP</text>
          <text x="220" y="25" text-anchor="middle">CENTRAL GROOVE</text>
          <text x="28" y="345" text-anchor="end">MESIAL FOSSA</text>
          <text x="382" y="345">DISTAL FOSSA</text>
          <text x="28" y="95" text-anchor="end">MARGINAL RIDGE</text>
        </g>
      </svg>`
  },
  molar: {
    labial: `
      <svg viewBox="0 0 400 550" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <defs>
          <linearGradient id="mlL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c8e2ff"/></linearGradient>
        </defs>
        <!-- Wide crown with 2 buccal cusps -->
        <path d="M 130 60 L 150 80 L 175 60 L 200 90 L 225 60 L 250 80 L 270 60 L 285 220 Q 200 260 115 220 Z" fill="url(#mlL)" stroke="#4a8fd4" stroke-width="2"/>
        <!-- Two roots -->
        <path d="M 115 220 Q 110 380 145 470 Q 165 490 175 470 Q 185 380 175 220 Z" fill="url(#cnR)" stroke="#6b5033" stroke-width="1.5"/>
        <path d="M 225 220 Q 215 380 225 470 Q 235 490 255 470 Q 290 380 285 220 Z" fill="url(#cnR)" stroke="#6b5033" stroke-width="1.5"/>
        <!-- Buccal groove -->
        <path d="M 200 90 L 200 220" stroke="#3a5a80" stroke-width="3" fill="none"/>
        <!-- Buccal pit -->
        <circle cx="200" cy="180" r="4" fill="#3a5a80"/>
        <path d="M 115 220 Q 200 240 285 220" stroke="#00d4ff" stroke-width="2" fill="none" stroke-dasharray="4 3"/>

        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 150 70 L 30 40"/>
          <path d="M 250 70 L 370 40"/>
          <path d="M 200 130 L 30 130"/>
          <path d="M 200 180 L 370 180"/>
          <path d="M 155 400 L 30 400"/>
          <path d="M 250 400 L 370 400"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="30" cy="40" r="4"/><circle cx="370" cy="40" r="4"/>
          <circle cx="30" cy="130" r="4"/><circle cx="370" cy="180" r="4"/>
          <circle cx="30" cy="400" r="4"/><circle cx="370" cy="400" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="12" fill="#fff">
          <text x="28" y="35" text-anchor="end">MESIOBUCCAL</text>
          <text x="28" y="48" text-anchor="end" font-size="9" fill="#8bc9ff">Cusp (MB)</text>
          <text x="372" y="35">DISTOBUCCAL</text>
          <text x="372" y="48" font-size="9" fill="#8bc9ff">Cusp (DB)</text>
          <text x="28" y="125" text-anchor="end">BUCCAL GROOVE</text>
          <text x="372" y="175">BUCCAL PIT</text>
          <text x="28" y="395" text-anchor="end">MB ROOT</text>
          <text x="372" y="395">DB ROOT</text>
        </g>
      </svg>`,
    lingual: `
      <svg viewBox="0 0 400 550" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <path d="M 130 60 L 165 90 L 200 60 L 235 90 L 270 60 L 285 220 Q 200 260 115 220 Z" fill="url(#mlL)" stroke="#4a8fd4" stroke-width="2"/>
        <!-- Palatal root single -->
        <path d="M 130 220 Q 130 400 180 490 Q 200 510 220 490 Q 270 400 270 220 Z" fill="url(#cnR)" stroke="#6b5033" stroke-width="1.5"/>
        <!-- Lingual groove -->
        <path d="M 200 60 L 200 220" stroke="#3a5a80" stroke-width="3" fill="none"/>
        <!-- Carabelli cusp on ML -->
        <ellipse cx="150" cy="110" rx="15" ry="12" fill="#a0c8f0" opacity="0.7"/>

        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 160 90 L 30 60"/>
          <path d="M 235 90 L 370 60"/>
          <path d="M 200 150 L 30 150"/>
          <path d="M 150 110 L 30 200"/>
          <path d="M 200 380 L 370 380"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="30" cy="60" r="4"/><circle cx="370" cy="60" r="4"/>
          <circle cx="30" cy="150" r="4"/><circle cx="30" cy="200" r="4"/>
          <circle cx="370" cy="380" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="12" fill="#fff">
          <text x="28" y="55" text-anchor="end">MESIOLINGUAL</text>
          <text x="28" y="68" text-anchor="end" font-size="9" fill="#8bc9ff">Cusp (ML) — Largest</text>
          <text x="372" y="55">DISTOLINGUAL</text>
          <text x="372" y="68" font-size="9" fill="#8bc9ff">Cusp (DL)</text>
          <text x="28" y="145" text-anchor="end">LINGUAL GROOVE</text>
          <text x="28" y="195" text-anchor="end">CUSP OF</text>
          <text x="28" y="208" text-anchor="end" font-size="9" fill="#8bc9ff">Carabelli (5th cusp)</text>
          <text x="372" y="375">PALATAL ROOT</text>
        </g>
      </svg>`,
    mesial: `
      <svg viewBox="0 0 400 550" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <!-- Wide proximal view -->
        <path d="M 130 90 L 175 60 Q 200 55 225 60 L 270 90 Q 280 180 265 240 L 250 260 Q 200 275 150 260 L 135 240 Q 120 180 130 90 Z" fill="url(#mlL)" stroke="#4a8fd4" stroke-width="2"/>
        <path d="M 150 260 Q 130 400 175 490 Q 200 505 225 490 Q 270 400 250 260 Z" fill="url(#cnR)" stroke="#6b5033" stroke-width="1.5"/>
        <path d="M 150 260 Q 200 275 250 260" stroke="#00d4ff" stroke-width="2" fill="none" stroke-dasharray="4 3"/>
        <!-- Mesial marginal ridge -->
        <path d="M 145 100 Q 200 80 255 100" stroke="#6b8fbf" stroke-width="3" fill="none"/>

        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 150 80 L 30 60"/>
          <path d="M 250 80 L 370 60"/>
          <path d="M 200 90 L 200 20"/>
          <path d="M 200 270 L 370 290"/>
          <path d="M 200 400 L 370 400"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="30" cy="60" r="4"/><circle cx="370" cy="60" r="4"/>
          <circle cx="200" cy="20" r="4"/>
          <circle cx="370" cy="290" r="4"/><circle cx="370" cy="400" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="12" fill="#fff">
          <text x="28" y="55" text-anchor="end">MESIOBUCCAL</text>
          <text x="28" y="68" text-anchor="end" font-size="9" fill="#8bc9ff">Cusp</text>
          <text x="372" y="55">MESIOLINGUAL</text>
          <text x="372" y="68" font-size="9" fill="#8bc9ff">Cusp</text>
          <text x="200" y="15" text-anchor="middle">MARGINAL RIDGE</text>
          <text x="372" y="285">CONTACT AREA</text>
          <text x="372" y="395">MESIAL ROOT</text>
        </g>
      </svg>`,
    distal: `
      <svg viewBox="0 0 400 550" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <path d="M 130 90 L 175 60 Q 200 55 225 60 L 270 90 Q 280 180 265 240 L 250 260 Q 200 275 150 260 L 135 240 Q 120 180 130 90 Z" fill="url(#mlL)" stroke="#4a8fd4" stroke-width="2"/>
        <path d="M 150 260 Q 130 400 175 490 Q 200 505 225 490 Q 270 400 250 260 Z" fill="url(#cnR)" stroke="#6b5033" stroke-width="1.5"/>
        <path d="M 150 260 Q 200 275 250 260" stroke="#00d4ff" stroke-width="2" fill="none" stroke-dasharray="4 3"/>
        <!-- Lower distal marginal ridge -->
        <path d="M 155 110 Q 200 95 245 110" stroke="#6b8fbf" stroke-width="3" fill="none"/>

        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 150 80 L 30 60"/>
          <path d="M 250 80 L 370 60"/>
          <path d="M 200 110 L 30 110"/>
          <path d="M 200 250 L 370 250"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="30" cy="60" r="4"/><circle cx="370" cy="60" r="4"/>
          <circle cx="30" cy="110" r="4"/><circle cx="370" cy="250" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="12" fill="#fff">
          <text x="28" y="55" text-anchor="end">DISTOBUCCAL</text>
          <text x="28" y="68" text-anchor="end" font-size="9" fill="#8bc9ff">Cusp</text>
          <text x="372" y="55">DISTOLINGUAL</text>
          <text x="372" y="68" font-size="9" fill="#8bc9ff">Cusp</text>
          <text x="28" y="105" text-anchor="end">DISTAL MARG.</text>
          <text x="28" y="118" text-anchor="end" font-size="9" fill="#8bc9ff">Ridge (lower)</text>
          <text x="372" y="245">CONTACT AREA</text>
        </g>
      </svg>`,
    incisal: `
      <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" class="surface-svg">
        <defs>
          <radialGradient id="mlO" cx="0.5" cy="0.5"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#8bc9ff"/></radialGradient>
        </defs>
        <!-- Rhomboidal occlusal (maxillary molar) -->
        <path d="M 80 100 L 300 90 Q 340 100 340 200 Q 340 290 300 310 L 90 300 Q 60 280 60 200 Q 60 130 80 100 Z" fill="url(#mlO)" stroke="#4a8fd4" stroke-width="2"/>
        <!-- 4 cusps -->
        <circle cx="130" cy="140" r="10" fill="#ff6b1a"/><text x="130" y="145" text-anchor="middle" font-size="10" fill="#fff" font-weight="700">MB</text>
        <circle cx="280" cy="140" r="9" fill="#ff8c42"/><text x="280" y="145" text-anchor="middle" font-size="10" fill="#fff" font-weight="700">DB</text>
        <circle cx="130" cy="260" r="12" fill="#00d4ff"/><text x="130" y="265" text-anchor="middle" font-size="10" fill="#fff" font-weight="700">ML</text>
        <circle cx="280" cy="260" r="9" fill="#4cc9f0"/><text x="280" y="265" text-anchor="middle" font-size="10" fill="#fff" font-weight="700">DL</text>
        <!-- Oblique ridge -->
        <path d="M 130 140 L 280 260" stroke="#ff6b1a" stroke-width="3" fill="none" opacity="0.6" stroke-dasharray="6 3"/>
        <!-- Central fossa -->
        <circle cx="200" cy="200" r="10" fill="#3a5a80" opacity="0.8"/>
        <!-- Grooves -->
        <path d="M 130 140 L 200 200 L 130 260" stroke="#3a5a80" stroke-width="2" fill="none"/>
        <path d="M 280 140 L 200 200 L 280 260" stroke="#3a5a80" stroke-width="2" fill="none"/>
        <!-- Buccal groove out -->
        <path d="M 200 130 L 200 90" stroke="#3a5a80" stroke-width="2" fill="none"/>

        <g stroke="#ff6b1a" stroke-width="2" fill="none">
          <path d="M 200 200 L 380 200"/>
          <path d="M 200 165 L 20 100"/>
          <path d="M 200 235 L 20 300"/>
          <path d="M 205 200 L 205 30"/>
        </g>
        <g stroke="#ff6b1a" fill="#ff6b1a">
          <circle cx="380" cy="200" r="4"/>
          <circle cx="20" cy="100" r="4"/>
          <circle cx="20" cy="300" r="4"/>
          <circle cx="205" cy="30" r="4"/>
        </g>
        <g font-family="Rajdhani" font-weight="700" font-size="11" fill="#fff">
          <text x="382" y="195">CENTRAL FOSSA</text>
          <text x="382" y="208" font-size="9" fill="#8bc9ff">with Central Pit</text>
          <text x="18" y="95" text-anchor="end">OBLIQUE RIDGE</text>
          <text x="18" y="108" text-anchor="end" font-size="9" fill="#8bc9ff">MB → DL (unique)</text>
          <text x="18" y="295" text-anchor="end">GROOVES</text>
          <text x="205" y="25" text-anchor="middle">BUCCAL GROOVE</text>
        </g>
      </svg>`
  }
};
