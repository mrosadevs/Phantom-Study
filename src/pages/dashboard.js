import { getWorkspaces, createWorkspace, deleteWorkspace, saveModuleData, markSampleCreated, updateWorkspace, updateWorkspaceOrders, getUserProfile } from '../services/supabase.js';
import { showPage, esc, toast, EMOJIS, SAMPLE_FLASHCARDS, SAMPLE_QUIZ, SAMPLE_FILLIN } from '../utils/helpers.js';
import { exportWorkspace, importWorkspace, pickJSONFile, buildWorkspaceExportData, buildModuleExportData } from '../services/export-import.js';
import { openWorkspace } from './workspace.js';
import { openModule } from './module.js';
import { handleLogout } from './auth.js';
import { openProfileModal, loadProfileForNav } from './profile.js';
import { openCommunity, shareItemToComm } from './community.js';

let selEmoji = '\uD83D\uDCDA';
let addCtx = { parentId: null, type: 'workspace' };
let editSelEmoji = '\uD83D\uDCDA';
let editCtx = { id: null, parentId: null, type: 'workspace', item: null };

export function initDashboard() {
  // Close tile dropdowns when clicking anywhere outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.tile-dropdown.open').forEach(d => d.classList.remove('open'));
  });

  // Logout buttons
  document.getElementById('btnLogoutDash')?.addEventListener('click', handleLogout);
  document.getElementById('btnLogoutWs')?.addEventListener('click', handleLogout);
  document.getElementById('btnLogoutMod')?.addEventListener('click', handleLogout);

  // Logo clicks -> dashboard
  ['dashLogo', 'wsLogo', 'modLogo', 'fcLogo', 'qzLogo', 'fiLogo', 'commLogo'].forEach(id => {
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

  // Community buttons
  document.getElementById('btnCommunityDash')?.addEventListener('click', () => openCommunity());
  document.getElementById('btnCommunityWs')?.addEventListener('click', () => openCommunity());

  // Profile — make nav user clickable
  document.querySelectorAll('.nav-user').forEach(el => {
    el.classList.add('nav-user-clickable');
    el.addEventListener('click', openProfileModal);
  });

  // Add Modal
  document.getElementById('modalAddClose')?.addEventListener('click', () => closeModal('modalAdd'));
  document.getElementById('btnSubmitAdd')?.addEventListener('click', submitAdd);

  // Edit Modal
  document.getElementById('modalEditClose')?.addEventListener('click', () => closeModal('modalEdit'));
  document.getElementById('btnSubmitEdit')?.addEventListener('click', submitEdit);

  // Close modal on backdrop click
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => {
      if (e.target === o) closeModal(o.id);
    });
  });
}

export async function onLogin(u) {
  window._phantomUser = u;
  document.querySelectorAll('.nav-user').forEach(el => { el.textContent = u.email; });

  // Load user profile (username + avatar)
  const needsSetup = await loadProfileForNav(u.id);

  loadWorkspaces();
  showPage('dashboard');

  // Create sample workspace for first-time users
  createSampleIfNeeded(u);

  // Prompt first-time users to set up their profile (username + PFP)
  if (needsSetup) {
    setTimeout(() => openProfileModal(true), 600);
  }
}

export function goToDashboard() {
  window._phantomWsPath = [];
  window._phantomCurrentWsId = null;
  window._phantomCurrentModId = null;
  if (!window._phantomUser) { showPage('login'); return; }
  loadWorkspaces();
  showPage('dashboard');
}

export async function loadWorkspaces() {
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
    t.draggable = true;
    t.dataset.tileId = item.id;
    t.dataset.tileIndex = i;
    t.style.animationDelay = (i * 0.07) + 's';
    const isSample = item.name === 'Biology 101 (Sample)';
    t.innerHTML = `
      <div class="tile-menu-wrap">
        <button class="tile-menu-btn" title="Options">&#8942;</button>
        <div class="tile-dropdown">
          <button class="tile-drop-item" data-action="edit"><span class="tile-drop-icon">&#9998;</span> Rename</button>
          <button class="tile-drop-item" data-action="share"><span class="tile-drop-icon">&#9757;</span> Share</button>
          ${type === 'workspace' ? '<button class="tile-drop-item" data-action="export"><span class="tile-drop-icon">&#11015;</span> Export</button>' : ''}
          <button class="tile-drop-item tile-drop-danger" data-action="delete"><span class="tile-drop-icon">&#10005;</span> Delete</button>
        </div>
      </div>
      <span class="tile-icon">${item.emoji || '\uD83D\uDCDA'}</span>
      <div class="tile-name">${esc(item.name)}</div>
      <div class="tile-meta">${item.description ? esc(item.description) : (type === 'workspace' ? 'Workspace' : 'Study Module')}</div>
      ${isSample ? '<div class="tile-badge">SAMPLE</div>' : ''}
      <div class="tile-glow"></div>`;

    // 3-dot menu toggle
    const menuBtn = t.querySelector('.tile-menu-btn');
    const dropdown = t.querySelector('.tile-dropdown');
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close any other open dropdowns first
      document.querySelectorAll('.tile-dropdown.open').forEach(d => {
        if (d !== dropdown) d.classList.remove('open');
      });
      dropdown.classList.toggle('open');
    });

    // Dropdown action handlers
    t.querySelectorAll('.tile-drop-item').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        dropdown.classList.remove('open');
        const action = btn.dataset.action;

        if (action === 'edit') {
          openEditModal(item, type, parentId);
        } else if (action === 'share') {
          try {
            toast('Preparing share...', 'info');
            let exportData;
            if (type === 'workspace') {
              exportData = await buildWorkspaceExportData(item.id, window._phantomUser.id);
            } else {
              exportData = await buildModuleExportData(item.id, window._phantomUser.id);
            }
            await shareItemToComm(exportData, item.name, item.emoji, item.description, type);
          } catch (err) {
            toast('Share failed: ' + err.message, 'error');
          }
        } else if (action === 'export') {
          await exportWorkspace(item.id, window._phantomUser.id);
        } else if (action === 'delete') {
          if (!confirm('Delete this ' + type + '? All data inside will be lost.')) return;
          await deleteWorkspace(item.id, window._phantomUser.id);
          toast('Deleted!', 'success');
          if (type === 'workspace') loadWorkspaces();
          else {
            const m = await getWorkspaces(window._phantomUser.id, parentId);
            renderTiles(document.getElementById('modulesGrid'), m, parentId, 'module');
          }
        }
      });
    });

    // Click handler — open workspace/module (skip if clicking menu)
    t.addEventListener('click', (e) => {
      if (e.target.closest('.tile-menu-wrap')) return;
      if (type === 'workspace') openWorkspace(item);
      else openModule(item.id, item);
    });

    // ---- DRAG & DROP ----
    t.addEventListener('dragstart', (e) => {
      t.classList.add('tile-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.id);
      window._phantomDragSource = { id: item.id, index: i, type, parentId };
    });

    t.addEventListener('dragend', () => {
      t.classList.remove('tile-dragging');
      grid.querySelectorAll('.tile-dragover').forEach(el => el.classList.remove('tile-dragover'));
      window._phantomDragSource = null;
    });

    t.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (window._phantomDragSource?.id !== item.id) {
        t.classList.add('tile-dragover');
      }
    });

    t.addEventListener('dragleave', () => {
      t.classList.remove('tile-dragover');
    });

    t.addEventListener('drop', async (e) => {
      e.preventDefault();
      t.classList.remove('tile-dragover');
      const source = window._phantomDragSource;
      if (!source || source.id === item.id) return;

      const fromIdx = source.index;
      const toIdx = i;
      const reordered = [...items];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);

      const orderUpdates = reordered.map((it, idx) => ({
        id: it.id,
        sort_order: idx + 1
      }));

      // Optimistic re-render
      renderTiles(grid, reordered, parentId, type);

      try {
        await updateWorkspaceOrders(window._phantomUser.id, orderUpdates);
      } catch (err) {
        toast('Reorder failed: ' + err.message, 'error');
        if (type === 'workspace') loadWorkspaces();
        else {
          const m = await getWorkspaces(window._phantomUser.id, parentId);
          renderTiles(document.getElementById('modulesGrid'), m, parentId, 'module');
        }
      }
    });

    grid.appendChild(t);
  });

  // Add tile
  const add = document.createElement('div');
  add.className = 'tile tile-add';
  add.draggable = false;
  add.addEventListener('click', () => openAddModal(parentId, type));
  add.innerHTML = `<div class="tile-add-icon">+</div><div class="tile-add-text">New ${type === 'workspace' ? 'Workspace' : 'Module'}</div>`;
  grid.appendChild(add);
}

// ==================== ADD MODAL ====================

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

// ==================== EDIT MODAL ====================

export function openEditModal(item, type, parentId) {
  editCtx = { id: item.id, parentId, type, item };
  editSelEmoji = item.emoji || '\uD83D\uDCDA';
  document.getElementById('modalEditTitle').textContent = type === 'workspace' ? 'EDIT WORKSPACE' : 'EDIT MODULE';
  document.getElementById('editName').value = item.name || '';
  document.getElementById('editDesc').value = item.description || '';
  renderEditEmojiGrid();
  document.getElementById('modalEdit').classList.add('open');
}

function renderEditEmojiGrid() {
  const grid = document.getElementById('editEmojiGrid');
  grid.innerHTML = '';
  EMOJIS.forEach(e => {
    const div = document.createElement('div');
    div.className = 'emoji-pick' + (e === editSelEmoji ? ' selected' : '');
    div.textContent = e;
    div.addEventListener('click', () => {
      editSelEmoji = e;
      renderEditEmojiGrid();
    });
    grid.appendChild(div);
  });
}

async function submitEdit() {
  const name = document.getElementById('editName').value.trim();
  const desc = document.getElementById('editDesc').value.trim();
  if (!name) { toast('Enter a name', 'error'); return; }
  try {
    await updateWorkspace(editCtx.id, window._phantomUser.id, {
      name, emoji: editSelEmoji, description: desc
    });
    closeModal('modalEdit');
    toast('Updated!', 'success');

    if (editCtx.type === 'workspace') {
      loadWorkspaces();
      // Update workspace header if currently open
      if (window._phantomCurrentWsId === editCtx.id) {
        const wsEm = document.getElementById('wsEmoji');
        const wsT = document.getElementById('wsTitle');
        const wsD = document.getElementById('wsDesc');
        if (wsEm) wsEm.textContent = editSelEmoji;
        if (wsT) wsT.textContent = name;
        if (wsD) wsD.textContent = desc;
        if (window._phantomWsPath?.length) {
          window._phantomWsPath[0] = { ...window._phantomWsPath[0], name, emoji: editSelEmoji };
        }
      }
    } else {
      const m = await getWorkspaces(window._phantomUser.id, editCtx.parentId);
      renderTiles(document.getElementById('modulesGrid'), m, editCtx.parentId, 'module');
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
  if (user.user_metadata?.sample_created) return;
  if (localStorage.getItem('phantom-sample-created-' + user.id)) return;

  try {
    const existing = await getWorkspaces(user.id, null);
    if (existing.length > 0) {
      localStorage.setItem('phantom-sample-created-' + user.id, '1');
      markSampleCreated().catch(() => {});
      return;
    }

    const ws  = await createWorkspace('Biology 101 (Sample)', '\uD83E\uDDEC', 'Sample workspace \u2014 feel free to delete it!', null, user.id);
    const mod = await createWorkspace('Cell Biology', '\uD83E\uDDA0', 'Introduction to cell structure', ws.id, user.id);
    await saveModuleData(mod.id, user.id, SAMPLE_FLASHCARDS, SAMPLE_QUIZ, SAMPLE_FILLIN);

    await markSampleCreated();
    localStorage.setItem('phantom-sample-created-' + user.id, '1');

    loadWorkspaces();
  } catch (e) {
    console.error('Failed to create sample workspace:', e);
  }
}
