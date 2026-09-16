# Explain My Code

An AI-powered code explainer, debugger and optimizer. Choose an AI provider and a programming language, paste code, and get errors, explanations, improvements, complexity, and an optimized version.

## Supported AI providers

- Gemini
- OpenAI
- Claude (Anthropic)
- Groq
- OpenRouter (access to many models through one API)

OpenRouter uses an OpenAI-compatible chat endpoint, so you can select a model available to your OpenRouter account. It can expose many different model families without adding a separate integration for each one.

## Setup

1. Install Node.js.
2. Open a terminal in this folder.
3. Run `npm.cmd install` on Windows PowerShell if `npm` is blocked by the execution policy.
4. Run `npm.cmd start`.
5. Open `http://localhost:3000`.
6. Click **AI Settings**, select a provider, and enter its API key.

You can also copy `.env.example` to `.env` and configure a server-side default key.

### Environment variables

- `GEMINI_API_KEY` / `GEMINI_MODEL`
- `OPENAI_API_KEY` / `OPENAI_MODEL`
- `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL`
- `GROQ_API_KEY` / `GROQ_MODEL`
- `OPENROUTER_API_KEY` / `OPENROUTER_MODEL`

## Security

Never commit real API keys to GitHub. For a public deployment, keep your own key server-side and add authentication/rate limiting. BYOK keys entered in the UI are sent with the current analysis request only and are not saved by this app.
