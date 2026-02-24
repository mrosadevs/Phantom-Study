// AI service — Groq (Llama 3.3 70B)

// Stubs kept for compatibility (only one model now)
export function getSelectedModel() { return 'groq'; }
export function setSelectedModel() {}

// Prompts — exported so the manual import feature can show them
export function promptFlash(text) {
  return `Generate exactly 15 flashcards from this content. Return ONLY a JSON array, no markdown, no explanation:\n[{"front":"term","back":"definition"},...]\n\nContent:\n${text.slice(0, 6000)}`;
}

export function promptQuiz(text) {
  return `Generate exactly 10 multiple choice questions from this content. Return ONLY a JSON array, no markdown, no explanation:\n[{"question":"...","choices":["A","B","C","D"],"answer":"A"},...]\nThe answer must exactly match one of the choices.\n\nContent:\n${text.slice(0, 6000)}`;
}

export function promptFill(text) {
  return `Generate 10 fill-in-the-blank questions from this content. Use ___ for the blank. Return ONLY a JSON array, no markdown, no explanation:\n[{"sentence":"The ___ is the...","answer":"word"},...]\n\nContent:\n${text.slice(0, 6000)}`;
}

export function getPrompt(type, text) {
  if (type === 'flashcards') return promptFlash(text);
  if (type === 'quiz') return promptQuiz(text);
  return promptFill(text);
}

// Fetch with timeout helper
function fetchWithTimeout(url, options, timeoutMs = 90000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out — try again in a moment.')), timeoutMs)
    ),
  ]);
}

// Call Groq via serverless proxy, fall back to direct if unavailable
export async function callAI(prompt) {
  // Try serverless function first (production — key stays server-side)
  try {
    const res = await fetchWithTimeout('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    }, 90000);

    if (res.ok) {
      const data = await res.json();
      return data.text;
    }

    const errData = await res.json().catch(() => ({}));
    const serverMsg = errData?.error || `Server error ${res.status}`;
    console.warn('Serverless API error:', serverMsg);
    throw new Error(serverMsg);
  } catch (e) {
    if (e.message.includes('timed out')) throw e;
    console.warn('Serverless unavailable, trying direct Groq call');
  }

  // Direct fallback (local dev)
  return callGroqDirect(prompt);
}

async function callGroqDirect(prompt) {
  const key = import.meta.env.VITE_GROQ_API_KEY || '';
  if (!key) throw new Error('Groq API key not configured. Add VITE_GROQ_API_KEY to your .env file.');

  const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  }, 60000);

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    const msg = e?.error?.message || 'Groq API error ' + res.status;
    if (msg.includes('rate_limit') || msg.includes('429')) {
      throw new Error('Rate limit hit — Groq allows up to 6,000 tokens/min on free tier. Wait a moment and try again, or use the "Import from ChatGPT" option below.');
    }
    throw new Error(msg);
  }

  const d = await res.json();
  return d.choices?.[0]?.message?.content || '';
}

// Parse JSON from AI response
function parseJSON(raw) {
  if (!raw || typeof raw !== 'string') throw new Error('Empty AI response');
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
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
      choices: x.choices.map(String),
      answer: String(x.answer),
    }));
}

export function parseFill(raw) {
  return parseJSON(raw)
    .filter(x => x.sentence && x.answer)
    .map(x => ({ sentence: String(x.sentence), answer: String(x.answer) }));
}
