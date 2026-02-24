// Shuffle array in place (Fisher-Yates)
export function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// HTML escape
export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Attribute escape
export function escA(s) {
  return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Show a toast notification
export function toast(msg, type = 'info') {
  const tc = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  tc.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity 0.4s';
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 400);
  }, 3000);
}

// Page navigation
export function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
  // Persist last app page so we can restore it when the user returns
  if (!['landing', 'login'].includes(id)) {
    localStorage.setItem('phantom-last-page', id);
  }
}

// Smooth scroll to section
export function scrollToSection(sel) {
  document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth' });
}

// Sample study data for new users
export const SAMPLE_FLASHCARDS = [
  { front: 'Mitochondria', back: 'The powerhouse of the cell — produces ATP through cellular respiration' },
  { front: 'DNA', back: 'Deoxyribonucleic acid — carries genetic instructions for development and functioning' },
  { front: 'Photosynthesis', back: 'Process by which plants convert sunlight, CO2, and water into glucose and oxygen' },
  { front: 'Cell Membrane', back: 'Semi-permeable barrier that controls what enters and leaves the cell' },
  { front: 'Ribosomes', back: 'Organelles responsible for protein synthesis by translating mRNA' },
];

export const SAMPLE_QUIZ = [
  { question: 'What is the primary function of mitochondria?', choices: ['Protein synthesis', 'ATP production', 'DNA replication', 'Cell division'], answer: 'ATP production' },
  { question: 'Which molecule carries genetic information?', choices: ['RNA', 'ATP', 'DNA', 'Protein'], answer: 'DNA' },
  { question: 'Where does photosynthesis take place?', choices: ['Mitochondria', 'Nucleus', 'Chloroplasts', 'Ribosomes'], answer: 'Chloroplasts' },
  { question: 'What controls what enters and leaves the cell?', choices: ['Cell wall', 'Nucleus', 'Cell membrane', 'Cytoplasm'], answer: 'Cell membrane' },
  { question: 'What do ribosomes produce?', choices: ['Lipids', 'Proteins', 'Carbohydrates', 'Nucleic acids'], answer: 'Proteins' },
];

export const SAMPLE_FILLIN = [
  { sentence: 'The ___ is known as the powerhouse of the cell.', answer: 'mitochondria' },
  { sentence: '___ carries the genetic instructions for all living organisms.', answer: 'DNA' },
  { sentence: 'Plants convert sunlight into glucose through ___.', answer: 'photosynthesis' },
  { sentence: 'The ___ controls what enters and leaves the cell.', answer: 'cell membrane' },
  { sentence: '___ are responsible for protein synthesis in cells.', answer: 'Ribosomes' },
];

export const EMOJIS = ['📚','🧪','🔬','🧬','📐','📊','💻','🎨','🌍','⚗️','🧠','🏛️','📝','🔭','🎵','⚡','🎯','🚀','💡','🔥','🌱','🎓','🧲','📡','🌊','🏆','✨','🎲'];
