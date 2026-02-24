import { shuffle, showPage, esc, escA } from '../utils/helpers.js';
import { openModule } from './module.js';
import { goToDashboard } from './dashboard.js';

let quizData = [];
let quizIdx = 0;
let quizScore = 0;

export function startQuiz(qs) {
  // Shuffle both question order AND choices within each question
  quizData = shuffle(qs).map(q => ({ ...q, sc: shuffle([...q.choices]) }));
  quizIdx = 0;
  quizScore = 0;
  renderQuizQ();
  showPage('quiz');
}

export function initQuiz() {
  document.getElementById('btnBackFromQuiz')?.addEventListener('click', () => {
    if (window._phantomCurrentModId) openModule(window._phantomCurrentModId);
    else goToDashboard();
  });
}

function renderQuizQ() {
  const c = document.getElementById('quizContainer');
  if (quizIdx >= quizData.length) {
    const pct = Math.round(quizScore / quizData.length * 100);
    const emoji = pct >= 80 ? '\uD83C\uDFC6' : pct >= 60 ? '\uD83D\uDC4D' : '\uD83D\uDCDA';
    const msg = pct >= 80 ? 'Outstanding!' : pct >= 60 ? 'Good job!' : 'Keep studying!';

    c.innerHTML = `<div class="results-screen">
      <div class="results-score">${pct}%</div>
      <div class="results-label">${quizScore}/${quizData.length} Correct</div>
      <div style="font-size:2.5rem">${emoji}</div>
      <div style="font-family:JetBrains Mono,monospace;font-size:0.72rem;color:var(--muted)">${msg}</div>
      <button class="btn-primary" style="max-width:200px;margin-top:1rem" id="btnRetakeQuiz">RETAKE QUIZ</button>
    </div>`;

    document.getElementById('btnRetakeQuiz').addEventListener('click', () => {
      const raw = quizData.map(q => ({ question: q.question, choices: q.choices, answer: q.answer }));
      startQuiz(raw);
    });
    return;
  }

  const q = quizData[quizIdx];
  const pct = (quizIdx / quizData.length) * 100;

  c.innerHTML = `
    <div class="progress-bar-wrap" style="margin-bottom:1.5rem">
      <div class="progress-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,var(--accent2),var(--accent3))"></div>
    </div>
    <div class="quiz-q-num">QUESTION ${quizIdx + 1} / ${quizData.length}</div>
    <div class="quiz-q-text">${esc(q.question)}</div>
    <div class="quiz-choices">${q.sc.map((ch, i) => `<button class="quiz-choice" data-idx="${i}" data-choice="${escA(ch)}">${esc(ch)}</button>`).join('')}</div>
    <div id="qFeedback" style="font-family:JetBrains Mono,monospace;font-size:0.78rem;min-height:1.4em;color:var(--muted)"></div>`;

  // Attach click handlers
  c.querySelectorAll('.quiz-choice').forEach(btn => {
    btn.addEventListener('click', () => answerQuiz(parseInt(btn.dataset.idx), btn.dataset.choice));
  });
}

function answerQuiz(idx, choice) {
  const btns = document.querySelectorAll('.quiz-choice');
  if (btns[0]?.disabled) return;
  btns.forEach(b => b.disabled = true);

  const q = quizData[quizIdx];
  const ok = choice === q.answer;
  btns[idx].classList.add(ok ? 'correct' : 'wrong');

  if (ok) {
    quizScore++;
    document.getElementById('qFeedback').innerHTML = '<span style="color:var(--accent)">Correct!</span>';
    if (navigator.vibrate) navigator.vibrate([25, 25, 25]);
  } else {
    document.getElementById('qFeedback').innerHTML = `<span style="color:var(--accent3)">Answer: ${esc(q.answer)}</span>`;
    btns.forEach(b => { if (b.textContent === q.answer) b.classList.add('correct'); });
    if (navigator.vibrate) navigator.vibrate(180);
  }

  setTimeout(() => { quizIdx++; renderQuizQ(); }, 1500);
}
