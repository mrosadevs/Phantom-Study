import { shuffle, showPage, esc } from '../utils/helpers.js';
import { openModule } from './module.js';
import { goToDashboard } from './dashboard.js';

let fillData = [];
let fillIdx = 0;

export function startFill(fills) {
  fillData = shuffle(fills);
  fillIdx = 0;
  renderFillQ();
  showPage('fillin');
}

export function initFillin() {
  document.getElementById('btnBackFromFill')?.addEventListener('click', () => {
    if (window._phantomCurrentModId) openModule(window._phantomCurrentModId);
    else goToDashboard();
  });
}

function renderFillQ() {
  const c = document.getElementById('fillinContainer');
  if (fillIdx >= fillData.length) {
    c.innerHTML = `<div class="results-screen">
      <div style="font-size:4rem">&#9999;&#65039;</div>
      <div class="results-score">DONE!</div>
      <div class="results-label">All fill-ins complete!</div>
      <button class="btn-primary" style="max-width:180px;margin-top:1rem" id="btnRestartFill">RESTART</button>
    </div>`;

    document.getElementById('btnRestartFill').addEventListener('click', () => {
      startFill(fillData);
    });
    return;
  }

  const item = fillData[fillIdx];
  const pct = (fillIdx / fillData.length) * 100;
  const sentHtml = esc(item.sentence).replace('___', `<input class="fillin-input" id="fiInput" placeholder="type answer..." autocomplete="off">`);

  c.innerHTML = `
    <div class="progress-bar-wrap" style="margin-bottom:1.5rem">
      <div class="progress-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,var(--accent3),var(--accent2))"></div>
    </div>
    <div style="font-family:JetBrains Mono,monospace;font-size:0.68rem;color:var(--muted);margin-bottom:0.5rem;letter-spacing:0.2em">QUESTION ${fillIdx + 1} / ${fillData.length}</div>
    <p class="fillin-question">${sentHtml}</p>
    <div id="fiFeedback" style="font-family:JetBrains Mono,monospace;font-size:0.78rem;min-height:1.4em;color:var(--muted);margin-bottom:1rem"></div>
    <div style="display:flex;gap:0.8rem;flex-wrap:wrap">
      <button class="btn-primary" style="max-width:150px" id="btnCheckFill">CHECK</button>
      <button class="btn-ghost" id="btnSkipFill">SKIP</button>
    </div>`;

  setTimeout(() => document.getElementById('fiInput')?.focus(), 80);

  document.getElementById('fiInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') checkFill();
  });

  document.getElementById('btnCheckFill')?.addEventListener('click', checkFill);
  document.getElementById('btnSkipFill')?.addEventListener('click', () => { fillIdx++; renderFillQ(); });
}

function checkFill() {
  const inp = document.getElementById('fiInput');
  if (!inp) return;
  const val = inp.value.trim().toLowerCase();
  const ans = fillData[fillIdx].answer.toLowerCase().trim();
  const ok = val === ans || (ans.includes(val) && val.length > 2);

  inp.classList.add(ok ? 'correct' : 'wrong');
  inp.disabled = true;

  const fb = document.getElementById('fiFeedback');
  if (ok) {
    fb.innerHTML = '<span style="color:var(--accent)">Correct!</span>';
    if (navigator.vibrate) navigator.vibrate([25, 25, 25]);
  } else {
    fb.innerHTML = `<span style="color:var(--accent3)">Answer: ${esc(fillData[fillIdx].answer)}</span>`;
    if (navigator.vibrate) navigator.vibrate(180);
  }

  setTimeout(() => { fillIdx++; renderFillQ(); }, 1600);
}
