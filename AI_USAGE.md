# AI usage

This repository was implemented in Cursor by an agent, with the product direction and scope set by the developer. The agent wrote the application code, tests, and these documents. Nothing here should be described as written without AI assistance.

## What the model does inside Strix

Strix calls an OpenAI-compatible chat completions endpoint. The user supplies the base URL, model name, and API key. Presets only fill those fields for OpenAI, Gemini, LM Studio, Ollama, and OpenRouter. There is one provider class.

The model is asked to return JSON for three jobs:

- A code review: summary, issues, and recommendations.
- Generated `node:test` files for selected or changed sources.
- A short analysis of each failing test: likely cause, affected file, and a suggested fix.

Chat answers in plain text. The prompt includes a small set of project files chosen by keyword overlap with the question. That retrieval is not embeddings and not a vector index.

Responses are checked with Zod. One follow-up asks the model to repair invalid JSON. A second failure is returned to the user as an error. Review issues that name a file the project does not contain are discarded.

Failure analysis stored on a test result is labeled "AI-generated analysis" in the UI and in the HTML report.

## Secrets

API keys are encrypted with AES-256-GCM before insert. Reads used for a provider call decrypt in memory. HTTP responses expose `hasKey` and `lastFour` only. Log lines are redacted before they are written.

The sandbox process does not receive `JWT_SECRET`, `APP_ENCRYPTION_KEY`, provider keys, or `GITHUB_TOKEN`.

## What was not built

These were intentionally left out:

- A separate documentation-generation feature
- Provider-specific client classes beyond the OpenAI-compatible one
- Diff review, vector search, and GitHub OAuth
- Running the imported project's own install or test scripts
- GSAP or other animation beyond short CSS transitions

The mock provider is a test double. It is available only when `AI_ALLOW_MOCK=true` and the process is not in production.
