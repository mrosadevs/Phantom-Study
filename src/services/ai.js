// AI service — handles Gemini and Kimi API calls (v1.1)

// Get the selected model from localStorage
export function getSelectedModel() {
  return localStorage.getItem('phantom-ai-model') || 'gemini';
}

export function setSelectedModel(model) {
  localStorage.setItem('phantom-ai-model', model);
}

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
      setTimeout(() => reject(new Error('Request timed out. The AI model is taking too long — try again or use a different model.')), timeoutMs)
    ),
  ]);
}

// Call the AI API based on selected model
export async function callAI(prompt, model) {
  model = model || getSelectedModel();

  // Try serverless function first (production)
  let serverlessError = null;
  try {
    const res = await fetchWithTimeout('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt }),
    }, 120000);
    if (res.ok) {
      const data = await res.json();
      return data.text;
    }
    // Read server error for debugging
    const errData = await res.json().catch(() => ({}));
    serverlessError = errData?.error || `Server error ${res.status}`;
    console.warn('Serverless API error:', serverlessError);
  } catch (e) {
    if (e.message.includes('timed out')) throw e;
    console.warn('Serverless function unavailable, trying direct API');
  }

  // Fall back to direct API calls (local dev or serverless failure)
  try {
    if (model === 'kimi') {
      return await callKimiDirect(prompt);
    }
    return await callGeminiDirect(prompt);
  } catch (directErr) {
    // If both serverless and direct fail, show the most helpful error
    const msg = serverlessError || directErr.message;
    // Make quota errors more user-friendly
    if (msg.includes('quota') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('API quota exceeded. The free API key has hit its limit. Try the Kimi model instead, or use the "Import from ChatGPT" option below.');
    }
    throw new Error(msg);
  }
}

// Direct Gemini API call
async function callGeminiDirect(prompt) {
  const key = import.meta.env.VITE_GEMINI_API_KEY || '';
  if (!key) throw new Error('Gemini API key not configured');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    }),
  }, 60000);

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || 'Gemini API error ' + res.status);
  }

  const d = await res.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Direct Kimi API call (NVIDIA NIM) — reasoning model, needs higher token budget
async function callKimiDirect(prompt) {
  const key = import.meta.env.VITE_NVIDIA_API_KEY || '';
  if (!key) throw new Error('NVIDIA API key not configured. Add your Kimi API key in settings.');

  const res = await fetchWithTimeout('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'moonshotai/kimi-k2.5',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 16384,
    }),
  }, 120000);

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || 'Kimi API error ' + res.status);
  }

  const d = await res.json();
  // Kimi is a reasoning model — content may be in `content` or `reasoning_content`
  const msg = d.choices?.[0]?.message;
  return msg?.content || msg?.reasoning_content || '';
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
