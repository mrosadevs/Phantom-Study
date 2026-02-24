import { getWorkspaces, createWorkspace, deleteWorkspace } from '../services/supabase.js';
import { showPage, esc, toast, EMOJIS, SAMPLE_FLASHCARDS, SAMPLE_QUIZ, SAMPLE_FILLIN } from '../utils/helpers.js';
import { saveModuleData, createWorkspace as createWs } from '../services/supabase.js';
import { exportWorkspace, importWorkspace, pickJSONFile } from '../services/export-import.js';
import { openWorkspace } from './workspace.js';
import { openModule } from './module.js';
import { handleLogout } from './auth.js';

let selEmoji = '\uD83D\uDCDA';
let addCtx = { parentId: null, type: 'workspace' };

export function initDashboard() {
  // Logout buttons
  document.getElementById('btnLogoutDash')?.addEventListener('click', handleLogout);
  document.getElementById('btnLogoutWs')?.addEventListener('click', handleLogout);
  document.getElementById('btnLogoutMod')?.addEventListener('click', handleLogout);

  // Logo clicks -> dashboard
  ['dashLogo', 'wsLogo', 'modLogo', 'fcLogo', 'qzLogo', 'fiLogo'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', goToDashboard);
  });

  // New workspace button
  document.getElementById('btnNewWorkspace')?.addEventListener('click', () => {
    openAddModal(null, 'workspace');
  });

  // Import workspace from file
  document.getElementById('btnImportWorkspace')?.addEventListener('click', async () => {
    try {
      const json = await pickJSONFile();
      toast('Importing workspace...', 'info');
      await importWorkspace(json, window._phantomUser.id);
      toast('Workspace imported!', 'success');
      loadWorkspaces();
    } catch (e) {
      toast('Import failed: ' + e.message, 'error');
    }
  });

  // Modal
  document.getElementById('modalAddClose')?.addEventListener('click', () => closeModal('modalAdd'));
  document.getElementById('btnSubmitAdd')?.addEventListener('click', submitAdd);

  // Close modal on backdrop click
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => {
      if (e.target === o) closeModal(o.id);
    });
  });
}

export function onLogin(u) {
  window._phantomUser = u;
  document.getElementById('navUser').textContent = u.email;
  document.getElementById('navUser2').textContent = u.email;
  loadWorkspaces();
  showPage('dashboard');

  // Create sample workspace for first-time users
  createSampleIfNeeded(u);
}

export function goToDashboard() {
  window._phantomWsPath = [];
  window._phantomCurrentWsId = null;
  window._phantomCurrentModId = null;
  if (!window._phantomUser) { showPage('login'); return; }
  loadWorkspaces();
  showPage('dashboard');
}

async function loadWorkspaces() {
  const grid = document.getElementById('workspacesGrid');
  grid.innerHTML = '<div style="color:var(--muted);font-family:JetBrains Mono,monospace;font-size:0.72rem;padding:2rem;letter-spacing:0.1em">LOADING...</div>';
  const items = await getWorkspaces(window._phantomUser.id, null);
  renderTiles(grid, items, null, 'workspace');
}

export function renderTiles(grid, items, parentId, type) {
  grid.innerHTML = '';
  if (!items.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">${type === 'workspace' ? '\uD83D\uDDC2\uFE0F' : '\uD83D\uDCE6'}</div><p>No ${type === 'workspace' ? 'workspaces' : 'modules'} yet. Create one!</p></div>`;
  }
  items.forEach((item, i) => {
    const t = document.createElement('div');
    t.className = 'tile';
    t.style.animationDelay = (i * 0.07) + 's';
    const isSample = item.name === 'Biology 101 (Sample)';
    t.innerHTML = `
      <button class="tile-delete" data-id="${item.id}" data-type="${type}" data-parent="${parentId || ''}">&#10005;</button>
      ${type === 'workspace' ? `<button class="tile-export" data-id="${item.id}" title="Export workspace">&#11015;</button>` : ''}
      <span class="tile-icon">${item.emoji || '\uD83D\uDCDA'}</span>
      <div class="tile-name">${esc(item.name)}</div>
      <div class="tile-meta">${item.description ? esc(item.description) : (type === 'workspace' ? 'Workspace' : 'Study Module')}</div>
      ${isSample ? '<div class="tile-badge">SAMPLE</div>' : ''}
      <div class="tile-glow"></div>`;

    // Export handler (workspace tiles only)
    t.querySelector('.tile-export')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      await exportWorkspace(item.id, window._phantomUser.id);
    });

    // Click handler
    t.addEventListener('click', (e) => {
      if (e.target.closest('.tile-delete')) return;
      if (e.target.closest('.tile-export')) return;
      if (type === 'workspace') openWorkspace(item);
      else openModule(item.id, item);
    });

    // Delete handler
    t.querySelector('.tile-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      if (!confirm('Delete this ' + type + '? All data inside will be lost.')) return;
      await deleteWorkspace(btn.dataset.id, window._phantomUser.id);
      toast('Deleted!', 'success');
      if (type === 'workspace') loadWorkspaces();
      else {
        const m = await getWorkspaces(window._phantomUser.id, parentId);
        renderTiles(document.getElementById('modulesGrid'), m, parentId, 'module');
      }
    });

    grid.appendChild(t);
  });

  // Add tile
  const add = document.createElement('div');
  add.className = 'tile tile-add';
  add.addEventListener('click', () => openAddModal(parentId, type));
  add.innerHTML = `<div class="tile-add-icon">+</div><div class="tile-add-text">New ${type === 'workspace' ? 'Workspace' : 'Module'}</div>`;
  grid.appendChild(add);
}

// ==================== MODAL ====================

export function openAddModal(parentId, type) {
  addCtx = { parentId, type };
  selEmoji = '\uD83D\uDCDA';
  document.getElementById('modalAddTitle').textContent = type === 'workspace' ? 'NEW WORKSPACE' : 'NEW MODULE';
  document.getElementById('newName').value = '';
  document.getElementById('newDesc').value = '';
  renderEmojiGrid();
  document.getElementById('modalAdd').classList.add('open');
}

function renderEmojiGrid() {
  const grid = document.getElementById('emojiGrid');
  grid.innerHTML = '';
  EMOJIS.forEach(e => {
    const div = document.createElement('div');
    div.className = 'emoji-pick' + (e === selEmoji ? ' selected' : '');
    div.textContent = e;
    div.addEventListener('click', () => {
      selEmoji = e;
      renderEmojiGrid();
    });
    grid.appendChild(div);
  });
}

async function submitAdd() {
  const name = document.getElementById('newName').value.trim();
  const desc = document.getElementById('newDesc').value.trim();
  if (!name) { toast('Enter a name', 'error'); return; }
  try {
    await createWorkspace(name, selEmoji, desc, addCtx.parentId, window._phantomUser.id);
    closeModal('modalAdd');
    toast((addCtx.type === 'workspace' ? 'Workspace' : 'Module') + ' created!', 'success');
    if (addCtx.type === 'workspace') loadWorkspaces();
    else {
      const m = await getWorkspaces(window._phantomUser.id, addCtx.parentId);
      renderTiles(document.getElementById('modulesGrid'), m, addCtx.parentId, 'module');
    }
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ==================== SAMPLE WORKSPACE ====================

async function createSampleIfNeeded(user) {
  if (localStorage.getItem('phantom-sample-created-' + user.id)) return;

  try {
    const existing = await getWorkspaces(user.id, null);
    if (existing.some(w => w.name === 'Biology 101 (Sample)')) {
      localStorage.setItem('phantom-sample-created-' + user.id, '1');
      return;
    }

    // Create sample workspace
    const ws = await createWorkspace('Biology 101 (Sample)', '\uD83E\uDDEC', 'Sample workspace to explore Phantom Study', null, user.id);

    // Create sample module
    const mod = await createWorkspace('Cell Biology', '\uD83E\uDDA0', 'Introduction to cell structure', ws.id, user.id);

    // Save sample study data
    await saveModuleData(mod.id, user.id, SAMPLE_FLASHCARDS, SAMPLE_QUIZ, SAMPLE_FILLIN);

    localStorage.setItem('phantom-sample-created-' + user.id, '1');

    // Reload workspaces to show sample
    loadWorkspaces();
  } catch (e) {
    console.error('Failed to create sample workspace:', e);
  }
}
