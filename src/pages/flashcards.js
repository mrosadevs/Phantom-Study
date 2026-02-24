import { shuffle, showPage } from '../utils/helpers.js';
import { openModule } from './module.js';
import { goToDashboard } from './dashboard.js';

let flashCards = [];
let flashIdx = 0;

export function startFlash(cards) {
  flashCards = shuffle(cards);
  flashIdx = 0;
  showFlashCard();
  document.getElementById('fcWrapper').style.display = '';
  document.getElementById('fcNav').style.display = '';
  document.getElementById('fcDone').style.display = 'none';
  showPage('flashcards');
}

export function initFlashcards() {
  document.getElementById('fcWrapper')?.addEventListener('click', flipCard);
  document.getElementById('btnPrevCard')?.addEventListener('click', prevCard);
  document.getElementById('btnNextCard')?.addEventListener('click', nextCard);
  document.getElementById('btnKnewIt')?.addEventListener('click', nextCard);
  document.getElementById('btnRestartFlash')?.addEventListener('click', restartFlash);
  document.getElementById('btnBackFromFlash')?.addEventListener('click', () => {
    if (window._phantomCurrentModId) openModule(window._phantomCurrentModId);
    else goToDashboard();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    const pg = document.querySelector('.page.active')?.id;
    if (pg === 'page-flashcards') {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextCard(); }
      else if (e.key === 'ArrowLeft') prevCard();
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); flipCard(); }
    }
  });
}

function showFlashCard() {
  const c = flashCards[flashIdx];
  document.getElementById('fcFront').textContent = c.front;
  document.getElementById('fcBack').textContent = c.back;
  document.getElementById('flashProgress').textContent = `Card ${flashIdx + 1} of ${flashCards.length}`;
  document.getElementById('flashBar').style.width = ((flashIdx + 1) / flashCards.length * 100) + '%';
  document.getElementById('fcWrapper').classList.remove('flipped');
}

function flipCard() {
  document.getElementById('fcWrapper').classList.toggle('flipped');
  if (navigator.vibrate) navigator.vibrate(15);
}

function nextCard() {
  if (flashIdx < flashCards.length - 1) {
    flashIdx++;
    showFlashCard();
  } else {
    document.getElementById('fcWrapper').style.display = 'none';
    document.getElementById('fcNav').style.display = 'none';
    document.getElementById('fcDone').style.display = 'block';
  }
}

function prevCard() {
  if (flashIdx > 0) { flashIdx--; showFlashCard(); }
}

function restartFlash() {
  flashCards = shuffle(flashCards);
  flashIdx = 0;
  showFlashCard();
  document.getElementById('fcWrapper').style.display = '';
  document.getElementById('fcNav').style.display = '';
  document.getElementById('fcDone').style.display = 'none';
}
