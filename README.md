# 🦉 Strix

Strix is your slightly judgmental, very careful AI code review buddy.

Drop in a ZIP or a public GitHub repo, poke around the files, get a structured review, generate tests, run them in a locked-down container, and walk away with an HTML report you can actually download. When the repo moves on, a manual GitHub check runs that same path again. No second test runner hiding in a closet. 🧪

## 🧰 What you need

- Node.js 24
- Docker, and the daemon has to be awake
- Google Chrome, if you want to run the Playwright suite

## 🚀 Setup

```bash
docker compose up -d
cp .env.example .env
```

Open `.env` and set `JWT_SECRET` plus `APP_ENCRYPTION_KEY`. The encryption key is 64 hex characters. Then copy that file to `apps/api/.env` so Prisma can see `DATABASE_URL`.

```bash
npm install
npm run db:deploy -w api
npm run sandbox:build
npm run dev
```

🌐 The app lives at `http://localhost:3000`. The API listens on port 3001. Your browser only talks to Next.js. `/api/*` is proxied to NestJS, so the session cookie stays on one origin.

Build the sandbox image before you run tests. If Docker is missing, the run is saved as an error. Strix will not execute tests on the host. 🐳

## ✨ Using it

1. Create an account and a project.
2. Open **Providers** and save an OpenAI-compatible provider: base URL, model, and API key. Presets fill the URL and model for OpenAI, Gemini, LM Studio, Ollama, and OpenRouter. One client, many front doors.
3. Upload a `.zip` of source, or connect `https://github.com/owner/repo`.
4. Open a file, run a security, performance, or quality review, then generate and run tests.
5. Grab the HTML report from **Reports**.
6. On **GitHub**, hit **Check for updates**. With continuous testing on, changed files go through generation, the sandbox, analysis, and the report.

🔐 Keys are encrypted with AES-256-GCM. The API only tells you whether a key exists and shows the last four characters.

## 🧪 Tests

```bash
npm test
npm run test:e2e
```

Unit tests cover authorization denial, Zip Slip rejection, review JSON repair, GitHub URL checks, compare payloads, sandbox arguments, and HTML escaping.

Playwright covers register, login, logout, protected routes, creating and deleting a project, ZIP upload, review, test generation and execution, report download, saving a provider, and a fixture GitHub check. The suite starts the API and the Next dev server. It uses the Google Chrome already installed on the machine (`channel: "chrome"` in `e2e/playwright.config.ts`). Want Playwright's own Chromium instead? From `e2e`, run `npx playwright install chromium` and remove the `channel` setting.

The end-to-end run forces `AI_ALLOW_MOCK=true` and `GITHUB_USE_FIXTURES=true`. Those flags are ignored when `NODE_ENV=production`. Leave the mock provider off in production.

## 🚧 Known limitations

- Public GitHub repos only. No OAuth, no private clones.
- The sandbox runs generated `node:test` files. It does not install the uploaded project or run its npm scripts.
- Docker is required. There is no host-process fallback.
- One OpenAI-compatible provider implementation. No separate docs generator, diff review, or vector search.
- Motion is CSS only. If you prefer reduced motion, Strix skips the extra animation.
- Webhooks need `GITHUB_WEBHOOK_SECRET`. Unsigned webhook requests are rejected.
