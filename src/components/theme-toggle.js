// Theme toggle — light/dark mode with localStorage persistence
// Injects a toggle button into every nav-theme-slot on the page

const SLOT_IDS = [
  'themeSlotLanding',
  'themeSlotDash',
  'themeSlotWs',
  'themeSlotMod',
];

let currentTheme = 'dark';

export function initTheme() {
  // Determine initial theme
  const stored = localStorage.getItem('phantom-theme');
  if (stored) {
    currentTheme = stored;
  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    currentTheme = 'light';
  } else {
    currentTheme = 'dark';
  }

  applyTheme(currentTheme);

  // Inject toggle buttons into every slot
  SLOT_IDS.forEach(id => {
    const slot = document.getElementById(id);
    if (!slot) return;

    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.setAttribute('aria-label', 'Toggle light/dark mode');
    btn.innerHTML = '<span class="theme-toggle-icon"></span>';
    slot.appendChild(btn);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(currentTheme);
      localStorage.setItem('phantom-theme', currentTheme);
    });
  });

  // Set initial icons
  applyTheme(currentTheme);
}

function applyTheme(theme) {
  currentTheme = theme;
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  // Update all toggle icons
  const icon = theme === 'light' ? '\u2600\uFE0F' : '\uD83C\uDF19';
  document.querySelectorAll('.theme-toggle-icon').forEach(el => {
    el.textContent = icon;
  });
}
