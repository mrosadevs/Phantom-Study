// Styles
import './styles/base.css';
import './styles/landing.css';
import './styles/auth.css';
import './styles/app.css';
import './styles/study.css';
import './styles/components.css';
import './styles/theme.css';

// Components
import { initParticles } from './components/particles.js';
import { initTheme } from './components/theme-toggle.js';
import { initTutorial, showFirstTimeTutorial } from './components/tutorial.js';

// Pages
import { initLanding } from './pages/landing.js';
import { initAuth } from './pages/auth.js';
import { initDashboard, onLogin } from './pages/dashboard.js';
import { initWorkspace } from './pages/workspace.js';
import { initModule } from './pages/module.js';
import { initFlashcards } from './pages/flashcards.js';
import { initQuiz } from './pages/quiz.js';
import { initFillin } from './pages/fillin.js';

// Services
import { getSession, onAuthStateChange } from './services/supabase.js';

// ==================== CURSOR ====================
function initCursor() {
  // Skip on touch devices
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

  const cur = document.getElementById('cursor');
  const ring = document.getElementById('cursorRing');
  if (!cur || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    cur.style.left = mx + 'px';
    cur.style.top = my + 'px';
  });

  (function animR() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';
    requestAnimationFrame(animR);
  })();

  document.addEventListener('mousedown', () => {
    cur.style.transform = 'translate(-50%,-50%) scale(0.6)';
  });
  document.addEventListener('mouseup', () => {
    cur.style.transform = 'translate(-50%,-50%) scale(1)';
  });
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  // Core
  initTheme();
  initCursor();
  initParticles();

  // Pages
  initLanding();
  initAuth();
  initDashboard();
  initWorkspace();
  initModule();
  initFlashcards();
  initQuiz();
  initFillin();

  // Tutorial (after pages are ready)
  initTutorial();

  // Auth session check
  getSession().then(session => {
    if (session?.user) {
      onLogin(session.user);
      // Show tutorial after sign-in if first time
      showFirstTimeTutorial();
    }
  });

  onAuthStateChange((ev, session) => {
    if (ev === 'SIGNED_IN' && session?.user) {
      onLogin(session.user);
      showFirstTimeTutorial();
    }
  });
});
