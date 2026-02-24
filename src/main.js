// Styles
import './styles/base.css';
import './styles/landing.css';
import './styles/auth.css';
import './styles/app.css';
import './styles/study.css';
import './styles/components.css';
import './styles/community.css';
import './styles/theme.css';

// Components
import { initParticles } from './components/particles.js';
import { initTheme } from './components/theme-toggle.js';
import { initTutorial, showFirstTimeTutorial } from './components/tutorial.js';

// Pages
import { initLanding } from './pages/landing.js';
import { initAuth } from './pages/auth.js';
import { initDashboard, onLogin } from './pages/dashboard.js';
import { initWorkspace, openWorkspace } from './pages/workspace.js';
import { initModule, openModule } from './pages/module.js';
import { initFlashcards } from './pages/flashcards.js';
import { initQuiz } from './pages/quiz.js';
import { initFillin } from './pages/fillin.js';
import { initProfile } from './pages/profile.js';
import { initCommunity } from './pages/community.js';

// Services
import { onAuthStateChange, getWorkspaceById } from './services/supabase.js';

// Helpers
import { showPage } from './utils/helpers.js';

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

// ==================== SESSION RESTORE ====================
// Restore the user to wherever they were before leaving the tab/browser
async function restoreLastPage() {
  const page = localStorage.getItem('phantom-last-page');
  if (!page || page === 'dashboard') return; // already on dashboard after onLogin

  try {
    if (page === 'workspace') {
      const wsId = localStorage.getItem('phantom-last-ws');
      if (wsId) {
        const item = await getWorkspaceById(wsId);
        // Only restore if this workspace belongs to the current user
        if (item && item.user_id === window._phantomUser?.id) {
          await openWorkspace(item);
          return;
        }
      }
    } else if (['module', 'flashcards', 'quiz', 'fillin'].includes(page)) {
      const modId = localStorage.getItem('phantom-last-mod');
      if (modId) {
        await openModule(modId);
        return;
      }
    }
  } catch (e) {
    // Silently fall back to dashboard if restore fails
    console.warn('Session restore failed, staying on dashboard:', e);
  }
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
  initProfile();
  initCommunity();

  // Tutorial (after pages are ready)
  initTutorial();

  // Auth session check — handle both fresh logins and OAuth redirects
  let _loginHandled = false;

  onAuthStateChange((ev, session) => {
    if (session?.user && (ev === 'SIGNED_IN' || ev === 'INITIAL_SESSION')) {
      if (_loginHandled) return;
      _loginHandled = true;
      onLogin(session.user);
      if (ev === 'INITIAL_SESSION') {
        // Returning user — restore their last location
        restoreLastPage();
      } else {
        // Fresh login — show tutorial for first-timers
        showFirstTimeTutorial();
      }
    }
    if (ev === 'SIGNED_OUT') {
      _loginHandled = false;
      localStorage.removeItem('phantom-last-page');
      localStorage.removeItem('phantom-last-ws');
      localStorage.removeItem('phantom-last-mod');
    }
  });
});
