import { getModuleData, saveModuleData, getWorkspaceById } from '../services/supabase.js';
import { callAI, getPrompt, parseFlash, parseQuiz, parseFill, parseAll, getSelectedModel, setSelectedModel, promptFlash, promptQuiz, promptFill, promptAll } from '../services/ai.js';
import { exportModule, importModule, pickJSONFile } from '../services/export-import.js';
import { parseFile } from '../services/file-parser.js';
import { showPage, esc, escA, toast } from '../utils/helpers.js';
import { updateBreadcrumb } from './workspace.js';
import { startFlash } from './flashcards.js';
import { startQuiz } from './quiz.js';
import { startFill } from './fillin.js';

let modData = null;
let editTab = 'flashcards';
let uploadedText = '';

export function getModData() { return modData; }

export async function openModule(modId, item = null) {
  window._phantomCurrentModId = modId;
  localStorage.setItem('phantom-last-mod', modId);
  if (!item) { item = await getWorkspaceById(modId); }
  document.getElementById('moduleTitle').textContent = item.name;
  updateBreadcrumb('modBreadcrumb', true, item.name);
  const data = await getModuleData(modId, window._phantomUser.id);
  modData = data || { flashcards: [], quiz: [], fillin: [] };
  editTab = 'flashcards';
  uploadedText = '';
  document.getElementById('pasteText').value = '';
  updateCounts();
  renderEditor();
  initModelSelector();
  showPage('module');
}

export function initModule() {
  // File upload
  const uz = document.getElementById('uploadZone');
  if (uz) {
    uz.addEventListener('dragover', e => { e.preventDefault(); uz.classList.add('dragover'); });
    uz.addEventListener('dragleave', () => uz.classList.remove('dragover'));
    uz.addEventListener('drop', e => {
      e.preventDefault();
      uz.classList.remove('dragover');
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
  }

  document.getElementById('fileUpload')?.addEventListener('change', e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  // Generate buttons
  document.getElementById('btnGenAll')?.addEventListener('click', generateAllAI);
  document.getElementById('btnGenFlash')?.addEventListener('click', () => generateAI('flashcards'));
  document.getElementById('btnGenQuiz')?.addEventListener('click', () => generateAI('quiz'));
  document.getElementById('btnGenFill')?.addEventListener('click', () => generateAI('fillin'));

  // Study mode buttons
  document.getElementById('smFlashcards')?.addEventListener('click', () => openStudyMode('flashcards'));
  document.getElementById('smQuiz')?.addEventListener('click', () => openStudyMode('quiz'));
  document.getElementById('smFillin')?.addEventListener('click', () => openStudyMode('fillin'));

  // Editor tabs
  document.getElementById('etFlash')?.addEventListener('click', () => switchEditTab('flashcards'));
  document.getElementById('etQuiz')?.addEventListener('click', () => switchEditTab('quiz'));
  document.getElementById('etFill')?.addEventListener('click', () => switchEditTab('fillin'));

  // Editor actions
  document.getElementById('btnAddCard')?.addEventListener('click', addManualCard);
  document.getElementById('btnSaveEdits')?.addEventListener('click', saveEdits);

  // Model selector
  initModelSelector();

  // Import from ChatGPT/Claude
  initImportSection();

  // Export module as JSON file
  document.getElementById('btnExportModule')?.addEventListener('click', () => {
    if (!window._phantomCurrentModId) return;
    const name = document.getElementById('moduleTitle')?.textContent || 'Module';
    exportModule(window._phantomCurrentModId, name, window._phantomUser.id);
  });

  // Import module from JSON file (replaces current module data)
  document.getElementById('btnImportModuleFile')?.addEventListener('click', async () => {
    if (!window._phantomCurrentModId) return;
    try {
      const json = await pickJSONFile();
      if (json.type !== 'phantom-module') throw new Error('Not a valid Phantom Study module file');
      const d = json.data || {};
      modData.flashcards = d.flashcards || [];
      modData.quiz       = d.quiz       || [];
      modData.fillin     = d.fillin     || [];
      await saveModuleData(window._phantomCurrentModId, window._phantomUser.id, modData.flashcards, modData.quiz, modData.fillin);
      updateCounts();
      renderEditor();
      toast(`Module imported! ${modData.flashcards.length} flashcards, ${modData.quiz.length} quiz Q's, ${modData.fillin.length} fill-ins`, 'success');
    } catch (e) {
      toast('Import failed: ' + e.message, 'error');
    }
  });
}

// ==================== IMPORT FROM CHATGPT ====================

let importType = 'all';

function initImportSection() {
  const toggle = document.getElementById('btnImportToggle');
  const panel = document.getElementById('importPanel');
  if (!toggle || !panel) return;

  toggle.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    updateImportPrompt();
  });

  // Import type tabs (All is default)
  const tabs = { impAll: 'all', impFlash: 'flashcards', impQuiz: 'quiz', impFill: 'fillin' };
  Object.entries(tabs).forEach(([id, type]) => {
    document.getElementById(id)?.addEventListener('click', () => {
      importType = type;
      Object.keys(tabs).forEach(tid => document.getElementById(tid)?.classList.toggle('active', tid === id));
      updateImportPrompt();
    });
  });

  // Copy prompt
  document.getElementById('btnCopyPrompt')?.addEventListener('click', () => {
    const text = document.getElementById('importPromptText').textContent;
    navigator.clipboard.writeText(text).then(() => toast('Prompt copied!', 'success'))
      .catch(() => toast('Copy failed — select and copy manually', 'error'));
  });

  // Import JSON
  document.getElementById('btnImportJson')?.addEventListener('click', handleImportJson);
}

function updateImportPrompt() {
  const el = document.getElementById('importPromptText');
  if (!el) return;
  const sample = '[PASTE YOUR NOTES/CONTENT HERE]';
  const map = { all: promptAll, flashcards: promptFlash, quiz: promptQuiz, fillin: promptFill };
  el.textContent = (map[importType] || promptAll)(sample);
}

async function handleImportJson() {
  const raw = document.getElementById('importJsonInput').value.trim();
  if (!raw) { toast('Paste the JSON response first!', 'error'); return; }

  try {
    if (importType === 'all') {
      const parsed = parseAll(raw);
      const total  = parsed.flashcards.length + parsed.quiz.length + parsed.fillin.length;
      if (!total) throw new Error('No valid study data found in JSON');
      modData.flashcards = parsed.flashcards;
      modData.quiz       = parsed.quiz;
      modData.fillin     = parsed.fillin;
      await saveModuleData(window._phantomCurrentModId, window._phantomUser.id, modData.flashcards, modData.quiz, modData.fillin);
      updateCounts();
      renderEditor();
      document.getElementById('importJsonInput').value = '';
      toast(`Imported! ${parsed.flashcards.length} flashcards · ${parsed.quiz.length} quiz Q's · ${parsed.fillin.length} fill-ins`, 'success');
    } else {
      let parsed;
      if (importType === 'flashcards') {
        parsed = parseFlash(raw);
        if (!parsed.length) throw new Error('No valid flashcards found');
        modData.flashcards = parsed;
      } else if (importType === 'quiz') {
        parsed = parseQuiz(raw);
        if (!parsed.length) throw new Error('No valid quiz questions found');
        modData.quiz = parsed;
      } else {
        parsed = parseFill(raw);
        if (!parsed.length) throw new Error('No valid fill-in questions found');
        modData.fillin = parsed;
      }
      await saveModuleData(window._phantomCurrentModId, window._phantomUser.id, modData.flashcards, modData.quiz, modData.fillin);
      updateCounts();
      renderEditor();
      document.getElementById('importJsonInput').value = '';
      toast(`Imported ${parsed.length} ${importType}!`, 'success');
    }
  } catch (e) {
    toast('Import error: ' + e.message, 'error');
  }
}

function initModelSelector() {
  const selector = document.getElementById('modelSelector');
  if (!selector) return;

  const currentModel = getSelectedModel();
  selector.querySelectorAll('.model-option').forEach(opt => {
    const model = opt.dataset.model;
    opt.classList.toggle('selected', model === currentModel);
    opt.addEventListener('click', () => {
      setSelectedModel(model);
      selector.querySelectorAll('.model-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });
}

// ==================== FILE UPLOAD ====================

async function handleFile(file) {
  toast('Reading file...', 'info');
  try {
    const text = await parseFile(file);
    uploadedText = text;
    document.getElementById('pasteText').value = text.slice(0, 3000);
    toast('File loaded — ready to generate!', 'success');
  } catch (e) {
    toast('Error reading file: ' + e.message, 'error');
    uploadedText = '';
  }
}

// ==================== AI GENERATION ====================

async function generateAllAI() {
  const text = document.getElementById('pasteText').value.trim() || uploadedText;
  if (!text || text.length < 20) { toast('Paste some text or upload a file first!', 'error'); return; }

  const btn = document.getElementById('btnGenAll');
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-light"></span> GENERATING...';

  try {
    toast('Generating flashcards...', 'info');
    const r1 = await callAI(getPrompt('flashcards', text));
    const fc = parseFlash(r1);
    if (fc.length) modData.flashcards = fc;

    toast('Generating quiz...', 'info');
    const r2 = await callAI(getPrompt('quiz', text));
    const qz = parseQuiz(r2);
    if (qz.length) modData.quiz = qz;

    toast('Generating fill-in-blank...', 'info');
    const r3 = await callAI(getPrompt('fillin', text));
    const fi = parseFill(r3);
    if (fi.length) modData.fillin = fi;

    await saveModuleData(window._phantomCurrentModId, window._phantomUser.id, modData.flashcards, modData.quiz, modData.fillin);
    updateCounts();
    renderEditor();
    toast(`Generated ${fc.length} cards, ${qz.length} quiz, ${fi.length} fill-in!`, 'success');
  } catch (e) {
    toast('AI error: ' + e.message, 'error');
    console.error(e);
  }
  btn.innerHTML = orig;
  btn.disabled = false;
}

async function generateAI(type) {
  const text = document.getElementById('pasteText').value.trim() || uploadedText;
  if (!text || text.length < 20) { toast('Paste some text first!', 'error'); return; }

  const card = document.getElementById('aiCard');
  const saved = card.innerHTML;
  card.innerHTML = `<div class="ai-loading"><div class="big-spinner"></div><p>GENERATING ${type.toUpperCase()}...</p><p style="font-size:0.62rem;margin-top:0.5rem">Free tier — may take a moment</p></div>`;

  try {
    const raw = await callAI(getPrompt(type, text));
    let parser;
    if (type === 'flashcards') parser = parseFlash;
    else if (type === 'quiz') parser = parseQuiz;
    else parser = parseFill;

    const result = parser(raw);
    if (!result.length) throw new Error('No items parsed from AI response');
    modData[type] = result;
    await saveModuleData(window._phantomCurrentModId, window._phantomUser.id, modData.flashcards, modData.quiz, modData.fillin);
    updateCounts();
    renderEditor();
    toast(`Generated ${result.length} ${type}!`, 'success');
  } catch (e) {
    toast('AI error: ' + e.message, 'error');
    console.error(e);
  }
  card.innerHTML = saved;
  // Re-attach event listeners after innerHTML replacement
  reattachAICardListeners();
}

function reattachAICardListeners() {
  document.getElementById('btnGenAll')?.addEventListener('click', generateAllAI);
  document.getElementById('btnGenFlash')?.addEventListener('click', () => generateAI('flashcards'));
  document.getElementById('btnGenQuiz')?.addEventListener('click', () => generateAI('quiz'));
  document.getElementById('btnGenFill')?.addEventListener('click', () => generateAI('fillin'));
}

// ==================== STUDY MODES ====================

function openStudyMode(mode) {
  if (!modData) { toast('No study data yet!', 'error'); return; }
  if (mode === 'flashcards') {
    if (!modData.flashcards?.length) { toast('No flashcards yet — generate or create some!', 'error'); return; }
    startFlash(modData.flashcards);
  } else if (mode === 'quiz') {
    if (!modData.quiz?.length) { toast('No quiz questions yet!', 'error'); return; }
    startQuiz(modData.quiz);
  } else {
    if (!modData.fillin?.length) { toast('No fill-in questions yet!', 'error'); return; }
    startFill(modData.fillin);
  }
}

// ==================== COUNTS ====================

function updateCounts() {
  const fc = modData?.flashcards?.length || 0;
  const qz = modData?.quiz?.length || 0;
  const fi = modData?.fillin?.length || 0;
  document.getElementById('fcCount').textContent = fc + ' Flashcards';
  document.getElementById('qzCount').textContent = qz + " Quiz Q's";
  document.getElementById('fiCount').textContent = fi + ' Fill-Ins';
  document.getElementById('flashMode').textContent = fc + ' cards';
  document.getElementById('quizMode').textContent = qz + ' questions';
  document.getElementById('fillMode').textContent = fi + ' questions';
}

// ==================== EDITOR ====================

function switchEditTab(tab) {
  editTab = tab;
  ['flashcards', 'quiz', 'fillin'].forEach(t => {
    const map = { flashcards: 'etFlash', quiz: 'etQuiz', fillin: 'etFill' };
    document.getElementById(map[t]).classList.toggle('active', t === tab);
  });
  renderEditor();
}

function renderEditor() {
  const c = document.getElementById('editorContent');
  if (!modData) { c.innerHTML = ''; return; }

  if (editTab === 'flashcards') {
    const cards = modData.flashcards || [];
    c.innerHTML = cards.length ? cards.map((card, i) => `
      <div class="card-editor">
        <div class="card-editor-header">
          <span class="card-editor-num">CARD ${i + 1}</span>
          <button class="editor-remove-btn" data-idx="${i}" data-type="flashcards" style="background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:0.75rem">&#10005; Remove</button>
        </div>
        <div class="card-editor-body">
          <textarea class="card-editor-field" placeholder="Front / Term" data-t="flashcards" data-i="${i}" data-f="front">${esc(card.front)}</textarea>
          <textarea class="card-editor-field" placeholder="Back / Answer" data-t="flashcards" data-i="${i}" data-f="back">${esc(card.back)}</textarea>
        </div>
      </div>`).join('') : '<div class="empty-state" style="padding:1.5rem"><p>No flashcards yet.</p></div>';
  } else if (editTab === 'quiz') {
    const qs = modData.quiz || [];
    c.innerHTML = qs.length ? qs.map((q, i) => `
      <div class="card-editor">
        <div class="card-editor-header">
          <span class="card-editor-num">Q ${i + 1}</span>
          <button class="editor-remove-btn" data-idx="${i}" data-type="quiz" style="background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:0.75rem">&#10005; Remove</button>
        </div>
        <div style="padding:0.8rem">
          <input class="form-input" style="margin-bottom:0.4rem" placeholder="Question" value="${escA(q.question)}" data-qt="quiz" data-qi="${i}" data-qf="question">
          ${q.choices.map((ch, ci) => `<input class="form-input" style="margin-bottom:0.35rem" placeholder="Choice ${ci + 1}" value="${escA(ch)}" data-qt="quiz" data-qi="${i}" data-qci="${ci}">`).join('')}
          <input class="form-input" style="margin-top:0.35rem" placeholder="Correct answer (match a choice exactly)" value="${escA(q.answer)}" data-qt="quiz" data-qi="${i}" data-qf="answer">
        </div>
      </div>`).join('') : '<div class="empty-state" style="padding:1.5rem"><p>No quiz questions yet.</p></div>';
  } else {
    const fills = modData.fillin || [];
    c.innerHTML = fills.length ? fills.map((f, i) => `
      <div class="card-editor">
        <div class="card-editor-header">
          <span class="card-editor-num">FILL ${i + 1}</span>
          <button class="editor-remove-btn" data-idx="${i}" data-type="fillin" style="background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:0.75rem">&#10005; Remove</button>
        </div>
        <div class="card-editor-body">
          <textarea class="card-editor-field" placeholder="Sentence with ___ blank" data-t="fillin" data-i="${i}" data-f="sentence">${esc(f.sentence)}</textarea>
          <textarea class="card-editor-field" placeholder="Answer" data-t="fillin" data-i="${i}" data-f="answer">${esc(f.answer)}</textarea>
        </div>
      </div>`).join('') : '<div class="empty-state" style="padding:1.5rem"><p>No fill-in questions yet.</p></div>';
  }

  // Attach remove handlers
  c.querySelectorAll('.editor-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const type = btn.dataset.type;
      modData[type].splice(idx, 1);
      renderEditor();
      updateCounts();
    });
  });
}

function addManualCard() {
  if (!modData) modData = { flashcards: [], quiz: [], fillin: [] };
  if (editTab === 'flashcards') modData.flashcards.push({ front: '', back: '' });
  else if (editTab === 'quiz') modData.quiz.push({ question: '', choices: ['', '', '', ''], answer: '' });
  else modData.fillin.push({ sentence: '', answer: '' });
  renderEditor();
  updateCounts();
}

async function saveEdits() {
  // Collect flashcard/fillin textarea data
  document.querySelectorAll('[data-t]').forEach(el => {
    const t = el.dataset.t, i = parseInt(el.dataset.i), f = el.dataset.f;
    if (modData[t]?.[i]) modData[t][i][f] = el.value;
  });

  // Collect quiz input data
  document.querySelectorAll('[data-qt]').forEach(el => {
    const i = parseInt(el.dataset.qi);
    if (el.dataset.qf === 'question') modData.quiz[i].question = el.value;
    else if (el.dataset.qf === 'answer') modData.quiz[i].answer = el.value;
    else if (el.dataset.qci !== undefined) {
      modData.quiz[i].choices[parseInt(el.dataset.qci)] = el.value;
    }
  });

  try {
    await saveModuleData(window._phantomCurrentModId, window._phantomUser.id, modData.flashcards, modData.quiz, modData.fillin);
    updateCounts();
    toast('Saved!', 'success');
  } catch (e) {
    toast('Save error: ' + e.message, 'error');
  }
}

export function backToModule() {
  if (window._phantomCurrentModId) openModule(window._phantomCurrentModId);
  else showPage('dashboard');
}
