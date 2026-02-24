// Guided spotlight tutorial — only shows after sign-in, highlights actual UI elements

const STEPS = [
  {
    target: '#btnNewWorkspace',
    title: 'CREATE A WORKSPACE',
    desc: 'Click this button to create a new workspace. Use workspaces to organize by class, subject, or exam.',
    position: 'below',
  },
  {
    target: '.tile, .tile-add',
    title: 'OPEN A WORKSPACE',
    desc: 'Click any workspace tile to open it. Inside you\'ll find modules — chapters, units, or topics.',
    position: 'below',
  },
  {
    target: '.nav-theme-slot',
    title: 'LIGHT / DARK MODE',
    desc: 'Toggle between light and dark mode anytime with this button.',
    position: 'below',
  },
  {
    target: '#btnTourDash',
    title: 'REPLAY THIS TOUR',
    desc: 'Forgot something? Click the "?" button anytime to replay this walkthrough.',
    position: 'below',
  },
];

// Steps shown when inside a module (triggered separately or after workspace steps)
const MODULE_STEPS = [
  {
    target: '#uploadZone',
    title: 'UPLOAD YOUR CONTENT',
    desc: 'Drag a PPTX, PDF, DOCX, or TXT file here — or click to browse. You can also paste notes directly into the editor below.',
    position: 'below',
  },
  {
    target: '.model-selector',
    title: 'CHOOSE AN AI MODEL',
    desc: 'Pick between Gemini (Google) or Kimi (Moonshot) for content generation. Each model has different strengths!',
    position: 'below',
  },
  {
    target: '#btnGenerateAll',
    title: 'GENERATE WITH AI',
    desc: 'After uploading content, hit this button to generate flashcards, quiz questions, and fill-in-the-blank sets.',
    position: 'above',
  },
  {
    target: '.study-actions, .mode-buttons',
    title: 'STUDY MODES',
    desc: 'Once generated, launch flashcards, the quiz, or fill-in-the-blank. Everything shuffles each time for deeper learning!',
    position: 'above',
  },
];

let currentStep = 0;
let activeSteps = STEPS;
let overlay, spotlight, card;

export function initTutorial() {
  overlay = document.getElementById('tutorialOverlay');
  if (!overlay) return;

  // Build internal elements
  overlay.innerHTML = `
    <div class="tutorial-spotlight" id="tutorialSpotlight"></div>
    <div class="tutorial-card" id="tutorialCard">
      <div class="tutorial-step-count" id="tutorialStepCount"></div>
      <div class="tutorial-step-indicator" id="tutorialStepIndicator"></div>
      <div class="tutorial-title" id="tutorialTitle"></div>
      <div class="tutorial-desc" id="tutorialDesc"></div>
      <div class="tutorial-actions">
        <button class="btn-ghost" id="tutorialSkip">SKIP</button>
        <button class="btn-primary tutorial-next" id="tutorialNext">NEXT</button>
      </div>
    </div>
  `;

  spotlight = document.getElementById('tutorialSpotlight');
  card = document.getElementById('tutorialCard');

  document.getElementById('tutorialSkip').addEventListener('click', closeTutorial);
  document.getElementById('tutorialNext').addEventListener('click', nextStep);

  // Click on backdrop (overlay outside spotlight/card) closes
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeTutorial();
  });

  // Help button in nav
  const helpBtn = document.getElementById('btnTourDash');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => showTutorial(STEPS));
  }
}

/** Called by dashboard.js after sign-in */
export function showTutorial(steps) {
  activeSteps = steps || STEPS;
  currentStep = 0;

  // Small delay to let DOM settle
  setTimeout(() => {
    renderStep();
    overlay.classList.add('open');
  }, 600);
}

/** Show the first-time tutorial (only on sign-in) */
export function showFirstTimeTutorial() {
  if (localStorage.getItem('phantom-tutorial-done')) return;
  showTutorial(STEPS);
}

/** Module-level tutorial — can be triggered from module page */
export function showModuleTutorial() {
  if (localStorage.getItem('phantom-module-tutorial-done')) return;
  showTutorial(MODULE_STEPS);
}

function closeTutorial() {
  overlay.classList.remove('open');
  localStorage.setItem('phantom-tutorial-done', '1');
  // If we were showing module steps, mark those done too
  if (activeSteps === MODULE_STEPS) {
    localStorage.setItem('phantom-module-tutorial-done', '1');
  }
}

function nextStep() {
  currentStep++;
  if (currentStep >= activeSteps.length) {
    closeTutorial();
    return;
  }
  renderStep();
}

function renderStep() {
  const step = activeSteps[currentStep];

  // Find target element
  const targetEl = document.querySelector(step.target);

  if (targetEl) {
    positionSpotlight(targetEl, step.position);
  } else {
    // If target not found, hide spotlight and center card
    spotlight.style.display = 'none';
    card.style.top = '50%';
    card.style.left = '50%';
    card.style.transform = 'translate(-50%, -50%)';
  }

  // Step count
  document.getElementById('tutorialStepCount').textContent =
    `STEP ${currentStep + 1} OF ${activeSteps.length}`;

  // Title & desc
  document.getElementById('tutorialTitle').textContent = step.title;
  document.getElementById('tutorialDesc').textContent = step.desc;

  // Step dots
  const indicator = document.getElementById('tutorialStepIndicator');
  indicator.innerHTML = activeSteps.map((_, i) => {
    let cls = 'tutorial-step-dot';
    if (i < currentStep) cls += ' done';
    if (i === currentStep) cls += ' active';
    return `<div class="${cls}"></div>`;
  }).join('');

  // Update next button text
  const nextBtn = document.getElementById('tutorialNext');
  if (currentStep === activeSteps.length - 1) {
    nextBtn.textContent = "GOT IT!";
  } else {
    nextBtn.textContent = 'NEXT';
  }
}

function positionSpotlight(el, position) {
  const rect = el.getBoundingClientRect();
  const padding = 10;

  spotlight.style.display = 'block';
  spotlight.style.top = (rect.top - padding) + 'px';
  spotlight.style.left = (rect.left - padding) + 'px';
  spotlight.style.width = (rect.width + padding * 2) + 'px';
  spotlight.style.height = (rect.height + padding * 2) + 'px';

  // Position the card relative to the spotlight
  const cardWidth = 360;
  const gap = 16;

  if (position === 'below') {
    card.style.top = (rect.bottom + gap) + 'px';
    card.style.left = Math.max(16, Math.min(rect.left, window.innerWidth - cardWidth - 16)) + 'px';
    card.style.transform = 'none';
  } else if (position === 'above') {
    card.style.top = 'auto';
    card.style.bottom = (window.innerHeight - rect.top + gap) + 'px';
    card.style.left = Math.max(16, Math.min(rect.left, window.innerWidth - cardWidth - 16)) + 'px';
    card.style.transform = 'none';
    // Reset after positioning
    requestAnimationFrame(() => {
      const cardRect = card.getBoundingClientRect();
      card.style.top = (rect.top - cardRect.height - gap) + 'px';
      card.style.bottom = 'auto';
    });
  } else {
    // Right of element
    card.style.top = rect.top + 'px';
    card.style.left = (rect.right + gap) + 'px';
    card.style.transform = 'none';
  }

  // Make sure card stays in viewport
  requestAnimationFrame(() => {
    const cr = card.getBoundingClientRect();
    if (cr.bottom > window.innerHeight - 16) {
      card.style.top = Math.max(16, window.innerHeight - cr.height - 16) + 'px';
    }
    if (cr.right > window.innerWidth - 16) {
      card.style.left = Math.max(16, window.innerWidth - cr.width - 16) + 'px';
    }
  });
}
