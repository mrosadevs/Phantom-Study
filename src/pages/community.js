import { getCommShares, getUserVotes, voteComm, removeVote, shareToComm, deleteShare } from '../services/supabase.js';
import { importWorkspace } from '../services/export-import.js';
import { showPage, esc, toast } from '../utils/helpers.js';
import { goToDashboard } from './dashboard.js';
import { getProfile } from './profile.js';
import { createWorkspace, saveModuleData } from '../services/supabase.js';

let currentShares = [];
let userVotes = new Set();
let filters = { type: null, sort: 'votes', search: '', offset: 0 };
const PAGE_SIZE = 50;

export function initCommunity() {
  document.getElementById('commLogo')?.addEventListener('click', goToDashboard);
  document.getElementById('btnBackFromComm')?.addEventListener('click', goToDashboard);

  // Filter buttons
  document.getElementById('commFilterAll')?.addEventListener('click', () => setFilter('type', null));
  document.getElementById('commFilterWs')?.addEventListener('click', () => setFilter('type', 'workspace'));
  document.getElementById('commFilterMod')?.addEventListener('click', () => setFilter('type', 'module'));

  // Sort buttons
  document.getElementById('commSortVotes')?.addEventListener('click', () => setFilter('sort', 'votes'));
  document.getElementById('commSortNew')?.addEventListener('click', () => setFilter('sort', 'new'));

  // Search
  let searchTimeout;
  document.getElementById('commSearch')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      filters.search = e.target.value.trim();
      filters.offset = 0;
      loadShares();
    }, 400);
  });

  // Load more
  document.getElementById('btnLoadMore')?.addEventListener('click', () => {
    filters.offset += PAGE_SIZE;
    loadShares(true);
  });
}

function setFilter(key, value) {
  filters[key] = value;
  filters.offset = 0;

  if (key === 'type') {
    ['commFilterAll', 'commFilterWs', 'commFilterMod'].forEach(id => {
      const el = document.getElementById(id);
      el?.classList.toggle('active',
        (id === 'commFilterAll' && value === null) ||
        (id === 'commFilterWs' && value === 'workspace') ||
        (id === 'commFilterMod' && value === 'module')
      );
    });
  }
  if (key === 'sort') {
    document.getElementById('commSortVotes')?.classList.toggle('active', value === 'votes');
    document.getElementById('commSortNew')?.classList.toggle('active', value === 'new');
  }

  loadShares();
}

export function openCommunity() {
  showPage('community');
  filters = { type: null, sort: 'votes', search: '', offset: 0 };
  document.getElementById('commSearch').value = '';
  // Reset filter UI
  ['commFilterAll', 'commFilterWs', 'commFilterMod'].forEach(id => {
    document.getElementById(id)?.classList.toggle('active', id === 'commFilterAll');
  });
  document.getElementById('commSortVotes')?.classList.add('active');
  document.getElementById('commSortNew')?.classList.remove('active');
  loadShares();
}

async function loadShares(append = false) {
  const grid = document.getElementById('commGrid');
  if (!append) {
    grid.innerHTML = '<div style="color:var(--muted);font-family:JetBrains Mono,monospace;font-size:0.72rem;padding:2rem;letter-spacing:0.1em">LOADING...</div>';
  }

  try {
    const [shares, votes] = await Promise.all([
      getCommShares({
        sortBy: filters.sort,
        type: filters.type,
        search: filters.search,
        limit: PAGE_SIZE,
        offset: filters.offset
      }),
      window._phantomUser ? getUserVotes(window._phantomUser.id) : new Set()
    ]);

    userVotes = votes;

    if (append) {
      currentShares = [...currentShares, ...shares];
    } else {
      currentShares = shares;
    }

    renderShares(grid, append ? currentShares.length - shares.length : 0);

    document.getElementById('commLoadMore').style.display =
      shares.length >= PAGE_SIZE ? '' : 'none';
  } catch (e) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">&#9888;&#65039;</div><p>Failed to load community. Try again later.</p></div>';
  }
}

function renderShares(grid, startFrom = 0) {
  if (startFrom === 0) grid.innerHTML = '';

  if (!currentShares.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">&#127758;</div><p>No shared study sets yet. Be the first to share!</p></div>';
    return;
  }

  const items = startFrom > 0 ? currentShares.slice(startFrom) : currentShares;
  items.forEach((share, i) => {
    const card = document.createElement('div');
    card.className = 'comm-card';
    card.style.animationDelay = (i * 0.05) + 's';
    const isVoted = userVotes.has(share.id);
    const isOwner = share.user_id === window._phantomUser?.id;

    card.innerHTML = `
      <div class="comm-card-type ${share.share_type}">${share.share_type}</div>
      <div class="comm-card-header">
        <span class="comm-card-emoji">${share.emoji || '&#128218;'}</span>
        <div class="comm-card-info">
          <div class="comm-card-title">${esc(share.title)}</div>
          <div class="comm-card-desc">${share.description ? esc(share.description) : ''}</div>
        </div>
      </div>
      <div class="comm-card-footer">
        <span class="comm-card-user">by ${esc(share.username || 'Anonymous')}</span>
        <div class="comm-card-actions">
          <button class="comm-vote-btn ${isVoted ? 'voted' : ''}" data-id="${share.id}">
            ${isVoted ? '&#9650;' : '&#9651;'} <span class="vote-count">${share.votes_count || 0}</span>
          </button>
          <button class="comm-grab-btn" data-id="${share.id}">+ GRAB</button>
          ${isOwner ? '<button class="comm-del-btn" data-id="' + share.id + '">&#10005;</button>' : ''}
        </div>
      </div>`;

    // Vote handler
    card.querySelector('.comm-vote-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!window._phantomUser) { toast('Sign in to vote', 'error'); return; }
      const btn = e.currentTarget;
      try {
        if (userVotes.has(share.id)) {
          await removeVote(window._phantomUser.id, share.id);
          userVotes.delete(share.id);
          share.votes_count = Math.max(0, (share.votes_count || 1) - 1);
          btn.classList.remove('voted');
          btn.querySelector('.vote-count').textContent = share.votes_count;
        } else {
          await voteComm(window._phantomUser.id, share.id);
          userVotes.add(share.id);
          share.votes_count = (share.votes_count || 0) + 1;
          btn.classList.add('voted');
          btn.querySelector('.vote-count').textContent = share.votes_count;
        }
      } catch (err) {
        toast('Vote failed', 'error');
      }
    });

    // Grab handler
    card.querySelector('.comm-grab-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!window._phantomUser) { toast('Sign in first', 'error'); return; }
      try {
        toast('Importing...', 'info');
        const data = share.data;
        if (share.share_type === 'workspace') {
          await importWorkspace(data, window._phantomUser.id);
        } else {
          // Import as a new workspace containing this module
          const ws = await createWorkspace(
            data.name || share.title,
            data.emoji || share.emoji || '&#128218;',
            data.description || '',
            null,
            window._phantomUser.id
          );
          const mod = await createWorkspace(
            data.name || share.title,
            data.emoji || '&#128221;',
            data.description || '',
            ws.id,
            window._phantomUser.id
          );
          if (data.data) {
            await saveModuleData(mod.id, window._phantomUser.id,
              data.data.flashcards || [], data.data.quiz || [], data.data.fillin || []);
          }
        }
        toast('Added to your workspaces!', 'success');
      } catch (err) {
        toast('Import failed: ' + err.message, 'error');
      }
    });

    // Delete handler
    card.querySelector('.comm-del-btn')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Remove this from community?')) return;
      try {
        await deleteShare(share.id, window._phantomUser.id);
        currentShares = currentShares.filter(s => s.id !== share.id);
        toast('Removed!', 'success');
        renderShares(grid);
      } catch (err) {
        toast('Delete failed', 'error');
      }
    });

    grid.appendChild(card);
  });
}

export async function shareItemToComm(exportData, name, emoji, description, type) {
  const profile = getProfile();
  try {
    await shareToComm(window._phantomUser.id, {
      share_type: type,
      title: name,
      description: description || '',
      emoji: emoji || '&#128218;',
      data: exportData,
      username: profile?.username || null
    });
    toast('Shared to community!', 'success');
  } catch (e) {
    if (e.message?.includes('duplicate')) {
      toast('Already shared!', 'info');
    } else {
      toast('Share failed: ' + e.message, 'error');
    }
  }
}
