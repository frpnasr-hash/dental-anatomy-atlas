/* ═══════════════════════════════════════════════════════
   TOOTH DETAIL PAGE JS
   ═══════════════════════════════════════════════════════ */

// Reference tooth images (real photos from image_search)
const TOOTH_IMAGES = {
  incisor: 'https://sspark.genspark.ai/cfimages?u1=mo5SmHpOD1iWMeWaBw6oxvrPk5cMng50Y82%2FzzGwfQWQ9bdumMDPrZLR9x9QWBCFYMu505q0k%2F9emQHshGuzzIa1QRo0nGC%2FkU1XdUXJmUS%2BFLHeGOMie0dx%2BoE5GufWKyDE&u2=ZFRYrZ5yYGhivr58&width=2560',
  canine: 'https://sspark.genspark.ai/cfimages?u1=ZuIQpW%2FHstBmE5b912mecEdt51YWBVrKEmxLVhkMT8kKiDzHP8cgfiM7rk7IvY1hW3ZDTTVeKk9P54sfGDgi%2By5DevLQQtV3PnNr1ZMxByS2jqfyJbzBzfraKbEb6xngKHo8rdmRz74Ynj1DUA%3D%3D&u2=wwluhQlu5gfo1L8H&width=2560',
  premolar: 'https://sspark.genspark.ai/cfimages?u1=IAKeK4QNgkLJI3MWMay1KVeJAKgT7dxp5NCOBXUR3%2B73YfeGvuOOhFL96lk2TFuM3wb5AYKRys%2FDVKrLet8nBIDU6CEui1Hw8a39Gj9XAs88Bcpq0GuSnpxUC7mH649LsqlvLnFe&u2=q9iVwwb9iFW4h6cD&width=2560',
  molar: 'https://sspark.genspark.ai/cfimages?u1=Sa99Q%2F4dfQ5cfeeGAdlLarb3TnTfP4XWxXJAHKi7cpkVMlBzKSfYTkHKk392eKxxdcwckEBbHoHQaq96RY8nGo2zivI2k7wJS1YeEk7D%2FvCewqo%2Bubbc&u2=2CbM7pJcZdREBMy2&width=2560'
};

// Parse URL and load tooth
const params = new URLSearchParams(window.location.search);
const toothNum = parseInt(params.get('n')) || 8;
const tooth = TEETH_DATA[toothNum];
const cls = tooth ? tooth.class : 'incisor';
const idData = IDENTIFICATION_DATA[cls];

document.addEventListener('DOMContentLoaded', () => {
  if (!tooth) return;
  loadTooth();
  loadSurface('labial');
  setupTabs();
  setupNav();
  setupQuiz();
});

function loadTooth() {
  // Update page title
  document.title = `${tooth.name} (#${tooth.universal}) | Dental Anatomy`;
  document.getElementById('bc-name').textContent = tooth.name;
  document.getElementById('th-tag').textContent = `◆ TOOTH #${tooth.universal}`;
  document.getElementById('th-name').textContent = tooth.name;
  document.getElementById('th-sub').textContent = `Universal #${tooth.universal} • FDI ${tooth.fdi} • ${tooth.type} • ${tooth.arch} Arch • ${tooth.side}`;

  // Meta grid
  document.getElementById('th-uni').textContent = `#${tooth.universal}`;
  document.getElementById('th-fdi').textContent = tooth.fdi;
  document.getElementById('th-palm').textContent = tooth.palmer;
  document.getElementById('th-type').textContent = tooth.type;
  document.getElementById('th-arch').textContent = tooth.arch;
  document.getElementById('th-side').textContent = tooth.side;

  // Hero image
  document.getElementById('hero-tooth-img').src = TOOTH_IMAGES[cls];
  document.getElementById('hero-tooth-img').alt = tooth.name;

  // Chronology
  document.getElementById('chrono-calc').textContent = tooth.chronology.calcification;
  document.getElementById('chrono-crown').textContent = tooth.chronology.crown;
  document.getElementById('chrono-erupt').textContent = tooth.chronology.eruption;
  document.getElementById('chrono-root').textContent = tooth.chronology.root;

  // Numbering mini cards
  document.getElementById('num-uni').textContent = `#${tooth.universal}`;
  document.getElementById('num-fdi').textContent = tooth.fdi;
  document.getElementById('num-palm').textContent = tooth.palmer;

  // Identification
  document.getElementById('cs-shape').textContent = idData.crown.shape;
  document.getElementById('cs-outline').textContent = idData.crown.outline;
  document.getElementById('cs-sym').textContent = idData.crown.symmetry;
  document.getElementById('cs-edge').textContent = idData.crown.edge;
  document.getElementById('rc-length').textContent = idData.root.length;
  document.getElementById('rc-shape').textContent = idData.root.shape;
  document.getElementById('rc-curve').textContent = idData.root.curvature;
  document.getElementById('rc-count').textContent = idData.root.count;
  document.getElementById('df-mes').textContent = idData.distinguishing.mes;
  document.getElementById('df-dist').textContent = idData.distinguishing.dist;
  document.getElementById('df-cing').textContent = idData.distinguishing.cing;
  document.getElementById('df-contact').textContent = idData.distinguishing.contact;

  // Contact
  document.getElementById('mca-loc').textContent = idData.contact.mesial.loc;
  document.getElementById('mca-shape').textContent = idData.contact.mesial.shape;
  document.getElementById('dca-loc').textContent = idData.contact.distal.loc;
  document.getElementById('dca-shape').textContent = idData.contact.distal.shape;

  // Root
  document.getElementById('r-count').textContent = tooth.roots;
  document.getElementById('r-canals').textContent = tooth.canals;
  document.getElementById('r-shape-s').textContent = idData.root.shape.split(',')[0].split('—')[0].trim();
  document.getElementById('r-cross').textContent = cls === 'incisor' ? 'Triangular' : cls === 'canine' ? 'Oval' : cls === 'premolar' ? 'Oval' : 'Kidney';
  document.getElementById('r-curve-s').textContent = idData.root.curvature.split(',')[0].trim();

  // Clinical
  document.getElementById('clin-endo').textContent = idData.clinical.endo;
  document.getElementById('clin-rest').textContent = idData.clinical.rest;
  document.getElementById('clin-ext').textContent = idData.clinical.ext;

  // Revision
  document.getElementById('rev-name').textContent = tooth.name;
  document.getElementById('rev-badge').textContent = `#${tooth.universal}`;
  document.getElementById('rev-uni').textContent = `#${tooth.universal}`;
  document.getElementById('rev-fdi').textContent = tooth.fdi;
  document.getElementById('rev-palm').textContent = tooth.palmer;
  document.getElementById('rev-roots').textContent = tooth.roots;
  document.getElementById('rev-canals').textContent = tooth.canals;
  document.getElementById('rev-erupt').textContent = tooth.chronology.eruption;
  document.getElementById('rev-root').textContent = tooth.chronology.root;
  document.getElementById('rev-type').textContent = tooth.type;
}

function loadSurface(surf) {
  const viewer = document.getElementById('surface-viewer');
  const data = SURFACE_DATA[cls][surf];
  const svg = SURFACE_SVG[cls][surf];

  viewer.innerHTML = `
    <div class="surface-svg-wrap">
      ${svg}
    </div>
    <div class="surface-info">
      <h3>${data.title}</h3>
      <ul class="surface-labels-list">
        ${data.labels.map(l => `
          <li>
            <span class="arrow">→</span>
            <div>
              <div class="label-name">${l.n}</div>
              <div class="label-desc">${l.d}</div>
            </div>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

function setupTabs() {
  document.querySelectorAll('.surface-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.surface-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadSurface(tab.dataset.surface);
    });
  });
}

function setupNav() {
  const prev = toothNum === 1 ? 32 : toothNum - 1;
  const next = toothNum === 32 ? 1 : toothNum + 1;
  const pT = TEETH_DATA[prev], nT = TEETH_DATA[next];
  const prevBtn = document.getElementById('prev-tooth');
  const nextBtn = document.getElementById('next-tooth');
  prevBtn.href = `tooth.html?n=${prev}`;
  prevBtn.innerHTML = `← #${prev} ${pT.short}`;
  nextBtn.href = `tooth.html?n=${next}`;
  nextBtn.innerHTML = `#${next} ${nT.short} →`;
}

function setupQuiz() {
  document.querySelectorAll('.quiz-check').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.q;
      const input = btn.parentElement.querySelector('.quiz-input');
      const result = document.getElementById(`qr-${q}`);
      const answer = input.value.trim().toLowerCase();
      const type = input.dataset.answer;
      let correct = '';
      if (type === 'uni') correct = String(tooth.universal);
      else if (type === 'roots') correct = String(tooth.roots);
      else if (type === 'type') correct = tooth.type.toLowerCase();

      if (answer === correct || (type === 'uni' && answer === `#${correct}`)) {
        result.textContent = '✓ Correct!';
        result.className = 'quiz-result ok';
      } else {
        result.textContent = `✗ Correct answer: ${correct}`;
        result.className = 'quiz-result bad';
      }
    });
  });
}
