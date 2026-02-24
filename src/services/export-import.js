// Export / Import service — workspace and module JSON files

import { getWorkspaces, getModuleData, createWorkspace, saveModuleData, getWorkspaceById } from './supabase.js';
import { toast } from '../utils/helpers.js';

// ==================== DATA BUILDERS ====================

export async function buildModuleExportData(modId, userId) {
  const [wsData, data] = await Promise.all([
    getWorkspaceById(modId),
    getModuleData(modId, userId),
  ]);
  return {
    type: 'phantom-module',
    version: 1,
    name: wsData?.name || 'Module',
    emoji: wsData?.emoji || '\uD83D\uDCDD',
    description: wsData?.description || '',
    data: {
      flashcards: data?.flashcards || [],
      quiz:       data?.quiz       || [],
      fillin:     data?.fillin     || [],
    },
    exported_at: new Date().toISOString(),
  };
}

export async function buildWorkspaceExportData(wsId, userId) {
  const [ws, modules] = await Promise.all([
    getWorkspaceById(wsId),
    getWorkspaces(userId, wsId),
  ]);

  const modulesWithData = await Promise.all(
    modules.map(async mod => {
      const data = await getModuleData(mod.id, userId);
      return {
        name:        mod.name,
        emoji:       mod.emoji       || '\uD83D\uDCDD',
        description: mod.description || '',
        data: {
          flashcards: data?.flashcards || [],
          quiz:       data?.quiz       || [],
          fillin:     data?.fillin     || [],
        },
      };
    })
  );

  return {
    type: 'phantom-workspace',
    version: 1,
    name:        ws?.name        || 'Workspace',
    emoji:       ws?.emoji       || '\uD83D\uDCDA',
    description: ws?.description || '',
    modules: modulesWithData,
    exported_at: new Date().toISOString(),
  };
}

// ==================== EXPORT ====================

export async function exportModule(modId, modName, userId) {
  try {
    toast('Preparing export...', 'info');
    const exportObj = await buildModuleExportData(modId, userId);
    downloadJSON(exportObj, `phantom-module-${slugify(exportObj.name)}.json`);
    toast('Module exported!', 'success');
  } catch (e) {
    toast('Export failed: ' + e.message, 'error');
  }
}

export async function exportWorkspace(wsId, userId) {
  try {
    toast('Exporting workspace...', 'info');
    const exportObj = await buildWorkspaceExportData(wsId, userId);
    downloadJSON(exportObj, `phantom-workspace-${slugify(exportObj.name)}.json`);
    toast(`Exported with ${exportObj.modules.length} module(s)!`, 'success');
  } catch (e) {
    toast('Export failed: ' + e.message, 'error');
  }
}

// ==================== IMPORT ====================

export async function importModule(jsonData, parentWsId, userId) {
  if (jsonData.type !== 'phantom-module') throw new Error('Not a valid Phantom Study module file');

  const mod = await createWorkspace(
    jsonData.name        || 'Imported Module',
    jsonData.emoji       || '\uD83D\uDCDD',
    jsonData.description || '',
    parentWsId,
    userId
  );

  const d = jsonData.data || {};
  await saveModuleData(mod.id, userId, d.flashcards || [], d.quiz || [], d.fillin || []);
  return mod;
}

export async function importWorkspace(jsonData, userId) {
  if (jsonData.type !== 'phantom-workspace') throw new Error('Not a valid Phantom Study workspace file');

  const ws = await createWorkspace(
    jsonData.name        || 'Imported Workspace',
    jsonData.emoji       || '\uD83D\uDCDA',
    jsonData.description || '',
    null,
    userId
  );

  for (const mod of (jsonData.modules || [])) {
    const modRecord = await createWorkspace(
      mod.name        || 'Module',
      mod.emoji       || '\uD83D\uDCDD',
      mod.description || '',
      ws.id,
      userId
    );
    const d = mod.data || {};
    await saveModuleData(modRecord.id, userId, d.flashcards || [], d.quiz || [], d.fillin || []);
  }

  return ws;
}

// ==================== FILE HELPERS ====================

function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'export';
}

export function pickJSONFile() {
  return new Promise((resolve, reject) => {
    const input    = document.createElement('input');
    input.type     = 'file';
    input.accept   = '.json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload  = ev => {
        try { resolve(JSON.parse(ev.target.result)); }
        catch { reject(new Error('Invalid JSON file — make sure it was exported from Phantom Study')); }
      };
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsText(file);
    };
    input.click();
  });
}
