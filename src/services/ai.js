// AI service — handles Gemini and Kimi API calls

// Get the selected model from localStorage
export function getSelectedModel() {
  return localStorage.getItem('phantom-ai-model') || 'gemini';
}

export function setSelectedModel(model) {
  localStorage.setItem('phantom-ai-model', model);
}

// Prompts
function promptFlash(text) {
  return `Generate exactly 15 flashcards from this content. Return ONLY a JSON array, no markdown:\n[{"front":"term","back":"definition"},...]\n\nContent:\n${text.slice(0, 6000)}`;
}

function promptQuiz(text) {
  return `Generate exactly 10 multiple choice questions from this content. Return ONLY a JSON array, no markdown:\n[{"question":"...","choices":["A","B","C","D"],"answer":"A"},...]\nThe answer must exactly match one of the choices.\n\nContent:\n${text.slice(0, 6000)}`;
}

function promptFill(text) {
  return `Generate 10 fill-in-the-blank questions from this content. Use ___ for the blank. Return ONLY a JSON array, no markdown:\n[{"sentence":"The ___ is the...","answer":"word"},...]\n\nContent:\n${text.slice(0, 6000)}`;
}

export function getPrompt(type, text) {
  if (type === 'flashcards') return promptFlash(text);
  if (type === 'quiz') return promptQuiz(text);
  return promptFill(text);
}

// Call the AI API based on selected model
export async function callAI(prompt, model) {
  model = model || getSelectedModel();

  // Try serverless function first (production)
  let serverlessError = null;
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.text;
    }
    // Read server error for debugging
    const errData = await res.json().catch(() => ({}));
    serverlessError = errData?.error || `Server error ${res.status}`;
    console.warn('Serverless API error:', serverlessError);
  } catch (e) {
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
    throw new Error(serverlessError || directErr.message);
  }
}

// Direct Gemini API call
async function callGeminiDirect(prompt) {
  const key = import.meta.env.VITE_GEMINI_API_KEY || '';
  if (!key) throw new Error('Gemini API key not configured');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || 'Gemini API error ' + res.status);
  }

  const d = await res.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Direct Kimi API call (NVIDIA NIM)
async function callKimiDirect(prompt) {
  const key = import.meta.env.VITE_NVIDIA_API_KEY || '';
  if (!key) throw new Error('NVIDIA API key not configured. Add your Kimi API key in settings.');

  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'moonshotai/kimi-k2.5',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || 'Kimi API error ' + res.status);
  }

  const d = await res.json();
  return d.choices?.[0]?.message?.content || '';
}

// Parse JSON from AI response
function parseJSON(raw) {
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    const m = clean.match(/\[[\s\S]*\]/);
    if (m) return JSON.parse(m[0]);
    throw new Error('Could not parse AI response');
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
