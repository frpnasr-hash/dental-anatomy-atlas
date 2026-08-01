/* ═══════════════════════════════════════════════════════
   MAIN JS — Interactive tooth atlas
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // Populate maxillary arch
  const maxRow = document.getElementById('max-row');
  const mandRow = document.getElementById('mand-row');
  if (maxRow) buildArch(maxRow, MAX_POSITIONS, 'max');
  if (mandRow) buildArch(mandRow, MAND_POSITIONS, 'mand');

  // Arch tabs
  document.querySelectorAll('.arch-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.arch-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const arch = tab.dataset.arch;
      document.getElementById('max-arch').classList.toggle('hidden', arch !== 'max');
      document.getElementById('mand-arch').classList.toggle('hidden', arch !== 'mand');
    });
  });

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });
});

function buildArch(container, positions, prefix) {
  const wrap = container.parentElement;
  const w = wrap.clientWidth || 900;
  const h = 380;

  positions.forEach(pos => {
    const tooth = TEETH_DATA[pos.n];
    if (!tooth) return;
    const btn = document.createElement('a');
    btn.href = `tooth.html?n=${pos.n}`;
    btn.className = `tooth-btn ${tooth.class}`;
    btn.setAttribute('data-tooltip', tooth.name);

    // Position (percentage of svg viewBox 900x380)
    btn.style.left = `${(pos.x / 100) * 100}%`;
    btn.style.top = `${(pos.y / 100) * 100}%`;
    btn.style.transform = 'translate(-50%, -50%)';

    btn.innerHTML = `
      <div class="tooth-num">${tooth.universal}</div>
      <div class="tooth-name-sm">${tooth.short}</div>
    `;

    container.appendChild(btn);
  });
}
