import { getWorkspaces } from '../services/supabase.js';
import { showPage, esc } from '../utils/helpers.js';
import { renderTiles, openAddModal, goToDashboard } from './dashboard.js';

export async function openWorkspace(item) {
  window._phantomCurrentWsId = item.id;
  window._phantomWsPath = [{ id: item.id, name: item.name, emoji: item.emoji }];

  document.getElementById('wsEmoji').textContent = item.emoji || '\uD83D\uDCDA';
  document.getElementById('wsTitle').textContent = item.name;
  document.getElementById('wsDesc').textContent = item.description || '';

  updateBreadcrumb('wsBreadcrumb', false);

  const mods = await getWorkspaces(window._phantomUser.id, item.id);
  renderTiles(document.getElementById('modulesGrid'), mods, item.id, 'module');
  showPage('workspace');
}

export function initWorkspace() {
  // New module button
  document.getElementById('btnNewModule')?.addEventListener('click', () => {
    openAddModal(window._phantomCurrentWsId, 'module');
  });
}

export function updateBreadcrumb(elId, showMod, modName = '') {
  const el = document.getElementById(elId);
  if (!el) return;

  el.innerHTML = '';

  // Home
  const home = document.createElement('span');
  home.className = 'bc-item';
  home.textContent = 'Home';
  home.addEventListener('click', goToDashboard);
  el.appendChild(home);

  const wsPath = window._phantomWsPath || [];
  if (wsPath.length) {
    const sep1 = document.createElement('span');
    sep1.className = 'bc-sep';
    sep1.textContent = '\u203A';
    el.appendChild(sep1);

    if (showMod) {
      const wsItem = document.createElement('span');
      wsItem.className = 'bc-item';
      wsItem.textContent = `${wsPath[0].emoji} ${wsPath[0].name}`;
      wsItem.addEventListener('click', () => openWorkspace(wsPath[0]));
      el.appendChild(wsItem);

      const sep2 = document.createElement('span');
      sep2.className = 'bc-sep';
      sep2.textContent = '\u203A';
      el.appendChild(sep2);

      const modItem = document.createElement('span');
      modItem.className = 'bc-item cur';
      modItem.textContent = modName;
      el.appendChild(modItem);
    } else {
      const wsItem = document.createElement('span');
      wsItem.className = 'bc-item cur';
      wsItem.textContent = `${wsPath[0].emoji} ${wsPath[0].name}`;
      el.appendChild(wsItem);
    }
  }
}
