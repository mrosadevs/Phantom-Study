// AI service — Groq (Llama 3.3 70B)

// Stubs kept for compatibility (only one model now)
export function getSelectedModel() { return 'groq'; }
export function setSelectedModel() {}

// ==================== PROMPTS ====================
// No artificial limits — generate as much as possible.
// Used by both the AI generator and the "Import from ChatGPT" copy prompts.

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
  // Try serverless function first (production — key stays server-side)
  try {
    const res = await fetchWithTimeout('/api/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ prompt }),
    }, 90000);

    if (res.ok) {
      const data = await res.json();
      return data.text;
    }

    const errData  = await res.json().catch(() => ({}));
    const serverMsg = errData?.error || `Server error ${res.status}`;
    console.warn('Serverless API error:', serverMsg);
    throw new Error(serverMsg);
  } catch (e) {
    if (e.message.includes('timed out')) throw e;
    console.warn('Serverless unavailable, trying direct Groq call');
  }

  return callGroqDirect(prompt);
}

async function callGroqDirect(prompt) {
  const key = import.meta.env.VITE_GROQ_API_KEY || '';
  if (!key) throw new Error('Groq API key not configured.');

  const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body:    JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens:  8192,
    }),
  }, 60000);

  if (!res.ok) {
    const e   = await res.json().catch(() => ({}));
    const msg = e?.error?.message || 'Groq API error ' + res.status;
    if (msg.includes('rate_limit') || msg.includes('429')) {
      throw new Error('Rate limit hit — wait a moment and try again, or use the "Import from AI" option below.');
    }
    throw new Error(msg);
  }

  const d = await res.json();
  return d.choices?.[0]?.message?.content || '';
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
