import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

const SYSTEM = `You are Explain My Code, an expert senior software engineer and teacher. Analyze the user's code carefully. Return ONLY valid JSON with this shape:
{"summary":"...","language":"...","score":0,"errors":[{"severity":"error|warning|info","line":"...","title":"...","explanation":"...","fix":"..."}],"improvements":[{"title":"...","explanation":"...","impact":"..."}],"optimizedCode":"...","explanation":"...","complexity":{"time":"...","space":"..."}}
Rules: Be precise and honest. If line numbers are uncertain, say so. Do not invent compiler/runtime errors that cannot be inferred. Explain beginner-friendly concepts but include professional-level improvements. Preserve the intended behavior. If the code is already good, say so and focus on meaningful improvements. Detect bugs, edge cases, security issues, performance problems, readability issues, and language-specific best practices.`;

const PROVIDERS = {
  gemini: { label: 'Gemini', env: 'GEMINI_API_KEY', defaultModel: 'gemini-2.5-flash' },
  openai: { label: 'OpenAI', env: 'OPENAI_API_KEY', defaultModel: 'gpt-5.6-luna' },
  anthropic: { label: 'Claude', env: 'ANTHROPIC_API_KEY', defaultModel: 'claude-sonnet-4-5' },
  groq: { label: 'Groq', env: 'GROQ_API_KEY', defaultModel: 'llama-3.3-70b-versatile' },
  openrouter: { label: 'OpenRouter', env: 'OPENROUTER_API_KEY', defaultModel: 'openai/gpt-5.6-luna' }
};

function extractJson(text) {
  let value = String(text || '').trim().replace(/^```json\s*/i, '').replace(/\s*```$/,'').trim();
  try { return JSON.parse(value); } catch {}
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(value.slice(start, end + 1));
  throw new Error('The AI returned an invalid analysis format. Please try again.');
}

async function callOpenAICompatible({ baseUrl, apiKey, model, prompt, headers = {} }) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, ...headers },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Provider request failed (${response.status}).`);
  return data?.choices?.[0]?.message?.content || '';
}

async function callGemini(apiKey, model, prompt) {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: `${SYSTEM}\n\n${prompt}`,
    config: { responseMimeType: 'application/json' }
  });
  return response.text || '';
}

async function callAnthropic(apiKey, model, prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 5000,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Provider request failed (${response.status}).`);
  return data?.content?.map(x => x.text || '').join('') || '';
}

app.post('/api/analyze', async (req, res) => {
  try {
    const { code, language, provider = 'gemini', apiKey, model } = req.body || {};
    if (!code?.trim()) return res.status(400).json({ error: 'Paste some code first.' });
    if (!PROVIDERS[provider]) return res.status(400).json({ error: 'Unsupported AI provider.' });

    const config = PROVIDERS[provider];
    const key = apiKey?.trim() || process.env[config.env];
    if (!key) return res.status(400).json({ error: `No ${config.label} API key configured. Add one in AI Settings or set ${config.env} in .env.` });

    const chosenModel = model?.trim() || process.env[`${config.env.replace('_API_KEY','')}_MODEL`] || config.defaultModel;
    const prompt = `Language hint: ${language || 'auto-detect'}\n\nCODE:\n${code}`;
    let text = '';

    if (provider === 'gemini') {
      text = await callGemini(key, chosenModel, prompt);
    } else if (provider === 'anthropic') {
      text = await callAnthropic(key, chosenModel, prompt);
    } else if (provider === 'openai') {
      text = await callOpenAICompatible({ baseUrl: 'https://api.openai.com/v1', apiKey: key, model: chosenModel, prompt });
    } else if (provider === 'groq') {
      text = await callOpenAICompatible({ baseUrl: 'https://api.groq.com/openai/v1', apiKey: key, model: chosenModel, prompt });
    } else if (provider === 'openrouter') {
      text = await callOpenAICompatible({
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: key,
        model: chosenModel,
        prompt,
        headers: { 'HTTP-Referer': process.env.APP_URL || `http://localhost:${port}`, 'X-Title': 'Explain My Code' }
      });
    }

    res.json(extractJson(text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || 'AI analysis failed.' });
  }
});

app.get('/api/health', (req, res) => {
  const configured = Object.fromEntries(Object.entries(PROVIDERS).map(([id, p]) => [id, Boolean(process.env[p.env])]));
  res.json({ ok: true, configured });
});

app.listen(port, () => console.log(`Explain My Code running at http://localhost:${port}`));
