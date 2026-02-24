import { scrollToSection, showPage } from '../utils/helpers.js';

export function initLanding() {
  // Scroll-based nav effect
  window.addEventListener('scroll', () => {
    document.getElementById('landNav')?.classList.toggle('scrolled', window.scrollY > 40);
  });

  // Scroll links (data-scroll attribute)
  document.querySelectorAll('[data-scroll]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const target = el.getAttribute('data-scroll');
      scrollToSection(target);
    });
  });

  // CTA buttons
  document.getElementById('btnGetStarted')?.addEventListener('click', () => showPage('login'));
  document.getElementById('btnStartFree')?.addEventListener('click', () => showPage('login'));
  document.getElementById('btnCreateFree')?.addEventListener('click', () => showPage('login'));
  document.getElementById('footerSignUp')?.addEventListener('click', () => showPage('login'));

  // Footer disclaimer
  document.getElementById('footerDisclaimer')?.addEventListener('click', () => {
    document.getElementById('disclaimerOverlay').style.display = 'flex';
  });

  // Scroll reveal observer
  const ro = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal').forEach(el => {
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) el.classList.add('visible');
  });

  // Disclaimer dismiss
  document.getElementById('btnDismissDisclaimer')?.addEventListener('click', () => {
    document.getElementById('disclaimerOverlay').style.display = 'none';
  });

  // Initialize Ko-fi widgets
  initKofi();
}

function initKofi() {
  if (typeof kofiwidget2 === 'undefined') return;

  // Floating Ko-fi
  const floatEl = document.getElementById('kofiFloat');
  if (floatEl) {
    kofiwidget2.init('Support me on Ko-fi', '#72a4f2', 'N4N61UTEH6');
    floatEl.innerHTML = kofiwidget2.getHTML();
  }

  // Disclaimer Ko-fi
  const disclaimerKofi = document.getElementById('disclaimerKofi');
  if (disclaimerKofi) {
    kofiwidget2.init('Support me on Ko-fi', '#72a4f2', 'N4N61UTEH6');
    disclaimerKofi.innerHTML = kofiwidget2.getHTML();
  }
}
