// AI service — bring-your-own-key.
//
// There is no hosted key and no server proxy: the user supplies their own API
// key, it is stored only in this browser's localStorage, and requests go
// straight from the page to the provider. All three providers below send CORS
// headers that permit direct browser calls.
//
// No key? The "No API key?" import panel needs none — it hands
// the user a prompt to run in ChatGPT/Claude/Gemini and ingests the JSON they
// paste back. That path uses the same prompts and parsers as this one.

// ==================== PROVIDERS ====================

export const PROVIDERS = {
  openai: {
    label:        'OpenAI',
    defaultModel: 'gpt-5.6-terra',
    keyPrefix:    'sk-',
    keyUrl:       'https://platform.openai.com/api-keys',
    note:         'Paid per token. Needs credit on the API account — a ChatGPT Plus subscription does not cover API use.',
    endpoint: () => 'https://api.openai.com/v1/chat/completions',
    headers:  key => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
    body: (prompt, model) => ({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
    text: d => d.choices?.[0]?.message?.content || '',
  },

  anthropic: {
    label:        'Anthropic (Claude)',
    defaultModel: 'claude-opus-5',
    keyPrefix:    'sk-ant-',
    keyUrl:       'https://console.anthropic.com/settings/keys',
    note:         'Paid per token. Needs a Console API key — a Claude Pro/Max subscription does not cover API use.',
    endpoint: () => 'https://api.anthropic.com/v1/messages',
    headers:  key => ({
      'Content-Type':      'application/json',
      'x-api-key':         key,
      'anthropic-version': '2023-06-01',
      // Opts in to CORS. "dangerous" because the key is visible to anyone with
      // devtools — which is fine here: it is the user's own key, in their own
      // browser. It would not be fine if we shipped a key of our own.
      'anthropic-dangerous-direct-browser-access': 'true',
    }),
    body: (prompt, model) => ({
      model,
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
      // Deliberately no output_config.effort: the model field is user-editable,
      // and effort is rejected by older Claude models. Leaving it off keeps a
      // custom model string from 400ing.
    }),
    // content is a block list and may include thinking blocks — never take [0].
    text: d => (d.content || []).filter(b => b.type === 'text').map(b => b.text).join(''),
  },

  gemini: {
    label:        'Google Gemini',
    defaultModel: 'gemini-3.7-flash',
    keyPrefix:    '',
    keyUrl:       'https://aistudio.google.com/apikey',
    note:         'Has a free tier with daily limits. Key comes from Google AI Studio.',
    endpoint: model => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    // Key goes in a header, not the query string, so it stays out of URLs and logs.
    headers: key => ({ 'Content-Type': 'application/json', 'x-goog-api-key': key }),
    body: (prompt, model) => ({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 16384 },
    }),
    // Skip thought parts; join the rest.
    text: d => (d.candidates?.[0]?.content?.parts || [])
      .filter(p => p.text && !p.thought).map(p => p.text).join(''),
  },
};

// ==================== SETTINGS (localStorage) ====================

const LS_KEY = 'phantom_ai_settings';

// Keys and models are stored per provider so switching providers doesn't
// discard the other one's key.
function blankSettings() {
  return { provider: 'openai', keys: {}, models: {} };
}

export function getAISettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return blankSettings();
    const s = JSON.parse(raw);
    return {
      provider: PROVIDERS[s.provider] ? s.provider : 'openai',
      keys:     s.keys   && typeof s.keys   === 'object' ? s.keys   : {},
      models:   s.models && typeof s.models === 'object' ? s.models : {},
    };
  } catch {
    // Private mode, cleared storage, or corrupt JSON — fall back to empty.
    return blankSettings();
  }
}

export function saveAISettings(next) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export function setProvider(provider) {
  if (!PROVIDERS[provider]) return;
  const s = getAISettings();
  s.provider = provider;
  saveAISettings(s);
}

export function setApiKey(provider, key) {
  const s = getAISettings();
  if (key) s.keys[provider] = key;
  else delete s.keys[provider];
  saveAISettings(s);
}

export function setModel(provider, model) {
  const s = getAISettings();
  if (model) s.models[provider] = model;
  else delete s.models[provider];
  saveAISettings(s);
}

export function getApiKey(provider) {
  return (getAISettings().keys[provider] || '').trim();
}

export function getModel(provider) {
  const s = getAISettings();
  return (s.models[provider] || '').trim() || PROVIDERS[provider].defaultModel;
}

/** True when the active provider has a key saved — used to gate the generate buttons. */
export function hasAIKey() {
  const s = getAISettings();
  return !!(s.keys[s.provider] || '').trim();
}

export function getSelectedProvider() {
  return getAISettings().provider;
}

// ==================== FETCH HELPER ====================

function fetchWithTimeout(url, options, timeoutMs = 90000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out — try again in a moment.')), timeoutMs)
    ),
  ]);
}

// ==================== CALL AI ====================

export async function callAI(prompt) {
  const settings = getAISettings();
  const name     = settings.provider;
  const provider = PROVIDERS[name];
  if (!provider) throw new Error('Unknown AI provider — pick one in AI Settings.');

  const key = getApiKey(name);
  if (!key) {
    throw new Error(
      `No ${provider.label} API key saved. Add one in AI Settings above, or use ` +
      `the "No API key?" panel below — that needs no key.`
    );
  }

  const model = getModel(name);

  let res;
  try {
    res = await fetchWithTimeout(provider.endpoint(model), {
      method:  'POST',
      headers: provider.headers(key),
      body:    JSON.stringify(provider.body(prompt, model)),
    }, 90000);
  } catch (e) {
    if (e.message.includes('timed out')) throw e;
    throw new Error(`Could not reach ${provider.label}. Check your connection and try again.`);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = data?.error?.message || `HTTP ${res.status}`;
    if (res.status === 401 || res.status === 403) {
      throw new Error(`${provider.label} rejected that API key. Re-check it in AI Settings.`);
    }
    if (res.status === 404 || /model/i.test(detail)) {
      // The failure that retired this app's last model: providers decommission
      // model IDs on a schedule, so say plainly which string was rejected.
      throw new Error(`${provider.label} doesn't recognise the model "${model}". Set a current one in AI Settings. (${detail})`);
    }
    if (res.status === 429) {
      throw new Error(`${provider.label} rate limit or quota reached — wait a moment, or check billing on your account.`);
    }
    throw new Error(`${provider.label}: ${detail}`);
  }

  const text = provider.text(data);
  if (!text) throw new Error(`${provider.label} returned an empty response — try again.`);
  return text;
}

// ==================== PROMPTS ====================
// No artificial limits — generate as much as possible.
// Used by both the AI generator and the "Import from AI" copy prompts.

export function promptFlash(text) {
  return `Generate as many flashcards as possible from the content below. Cover every key concept, term, definition, and fact. Return ONLY a JSON array, no markdown, no explanation:\n[{"front":"term or question","back":"definition or answer"},...]\n\nContent:\n${text}`;
}

export function promptQuiz(text) {
  return `Generate as many multiple choice questions as possible from the content below. Cover every important concept. Return ONLY a JSON array, no markdown, no explanation:\n[{"question":"...","choices":["A","B","C","D"],"answer":"A"},...]\nThe answer must exactly match one of the choices.\n\nContent:\n${text}`;
}

export function promptFill(text) {
  return `Generate as many fill-in-the-blank questions as possible from the content below. Use ___ for the blank. Return ONLY a JSON array, no markdown, no explanation:\n[{"sentence":"The ___ is the...","answer":"word"},...]\n\nContent:\n${text}`;
}

export function promptAll(text) {
  return `From the content below, generate as many study materials as possible — cover every concept, term, and fact. Return ONLY a valid JSON object with this exact structure, no markdown, no explanation:\n{\n  "flashcards": [{"front":"term","back":"definition"},...],\n  "quiz": [{"question":"...","choices":["A","B","C","D"],"answer":"A"},...],\n  "fillin": [{"sentence":"The ___ is...","answer":"word"},...]\n}\n\nContent:\n${text}`;
}

export function getPrompt(type, text) {
  if (type === 'flashcards') return promptFlash(text);
  if (type === 'quiz')       return promptQuiz(text);
  if (type === 'all')        return promptAll(text);
  return promptFill(text);
}

/**
 * The no-key variant, shown in the import panel. The user runs this in their
 * own chatbot with their lecture file attached, then uploads the .json it
 * hands back. The last line is a deliberate hedge: not every chatbot or plan
 * can emit downloadable files, so it falls back to printing the JSON, which
 * the paste box still accepts.
 */
export function getFilePrompt(type) {
  const map   = { all: promptAll, flashcards: promptFlash, quiz: promptQuiz, fillin: promptFill };
  const build = map[type] || promptAll;
  const body  = build('(use the notes, slides, or PDF I attached to this chat)');
  return `${body}\n\nInstead of printing that JSON in the chat, save it as a file named phantom-study.json and give me the download link.\nIf you cannot create files, print the raw JSON in a code block instead.`;
}


// ==================== PARSERS ====================

function parseJSON(raw) {
  if (!raw || typeof raw !== 'string') throw new Error('Empty AI response');
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(clean); }
  catch {
    const m = clean.match(/\[[\s\S]*\]/);
    if (m) return JSON.parse(m[0]);
    throw new Error('Could not parse AI response as JSON');
  }
}

export function parseFlash(raw) {
  return parseJSON(raw)
    .filter(x => x.front && x.back)
    .map(x => ({ front: String(x.front), back: String(x.back) }));
}

export function parseQuiz(raw) {
  return parseJSON(raw)
    .filter(x => x.question && x.choices && x.answer)
    .map(x => ({
      question: String(x.question),
      choices:  x.choices.map(String),
      answer:   String(x.answer),
    }));
}

export function parseFill(raw) {
  return parseJSON(raw)
    .filter(x => x.sentence && x.answer)
    .map(x => ({ sentence: String(x.sentence), answer: String(x.answer) }));
}

export function parseAll(raw) {
  if (!raw || typeof raw !== 'string') throw new Error('Empty AI response');
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  let obj;
  try { obj = JSON.parse(clean); }
  catch {
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) obj = JSON.parse(m[0]);
    else throw new Error('Could not parse AI response as JSON');
  }
  return {
    flashcards: (obj.flashcards || []).filter(x => x.front && x.back)
      .map(x => ({ front: String(x.front), back: String(x.back) })),
    quiz: (obj.quiz || []).filter(x => x.question && x.choices && x.answer)
      .map(x => ({ question: String(x.question), choices: x.choices.map(String), answer: String(x.answer) })),
    fillin: (obj.fillin || []).filter(x => x.sentence && x.answer)
      .map(x => ({ sentence: String(x.sentence), answer: String(x.answer) })),
  };
}
