# Bếp Từ Video

Bếp Từ Video takes a link to a public Facebook Reel or video, uses Gemini to read multiple frames across the video, and produces a Vietnamese recipe that states plainly what the AI observed and what it inferred.

> When Facebook does not expose a safe direct video URL, the app falls back to the **thumbnail** and labels that mode in the result. Recipes, quantities and calories are still estimates; users must check allergies and food safety themselves.

## Stack

- Next.js 16 + React 19 running through Vinext/Vite
- Cloudflare Workers and OpenAI Sites
- Gemini Vision
- Cloudflare D1 + Drizzle for accounts, sessions, saved recipes, distributed rate limiting and a short-lived analysis cache
- First-party username and password sign-in (PBKDF2 + session cookie), with no dependency on the hosting platform; email is optional and used only for password reset
- pnpm, strict TypeScript, ESLint, Vitest and Node render tests

## Local setup

Requires Node.js `>=22.13.0` and the pnpm version pinned in `package.json`.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Configure `.env.local`:

```dotenv
GEMINI_API_KEY=your_server_side_key
GEMINI_MODEL=gemini-3.6-flash
USER_ID_PEPPER=a_long_random_server_secret
APP_URL=http://localhost:3001
```

Never commit `.env.local`. For UI-only work the app runs without D1; analysis needs the Gemini key, while registration, sign-in and saving recipes need D1.

Leave `RESEND_API_KEY` and `EMAIL_FROM` empty locally: password-reset and email-verification links are written to the structured log instead of being sent, which is enough to walk through both flows.

## Commands

```bash
pnpm dev          # local development
pnpm lint         # ESLint, zero warnings
pnpm typecheck    # strict TypeScript
pnpm test         # unit + server-render tests
pnpm build        # production Worker build
pnpm verify       # all required quality gates
pnpm audit        # dependency vulnerabilities (manual; CI does not run it)
pnpm db:generate  # generate D1 migrations after schema changes
pnpm eval:offline # AI contract and prompt regression tests
```

## Architecture

```text
Browser
  -> POST /api/analyze
  -> URL validation + D1 rate limit/cache
  -> safe Facebook metadata + embedded progressive-video extraction
  -> validated Facebook CDN video or thumbnail fetch
  -> Gemini inline video / Files API / image analysis
  -> runtime schema validation
  -> observations / assumptions / warnings

Registration / sign-in
  -> POST /api/auth/*
  -> same-origin check + rate limit
  -> PBKDF2 hash/verify
  -> session in D1 (digest only) -> HttpOnly cookie

Signed-in user
  -> /api/recipes
  -> server-side ownership check
  -> D1 saved recipes
```

See [architecture](docs/architecture.md), [authentication](docs/auth.md), [API](docs/api/analyze.md), [AI contract](docs/ai/prompt-and-output-schema.md), [security](docs/security-threat-model.md) and [deployment](docs/deployment.md).

## Product limitations

- Facebook may block metadata for private, login-gated or region-limited videos.
- No fake placeholder image is ever substituted for a real request; the thumbnail fallback is always the real thumbnail of that same video.
- Videos under the inline limit are sent directly; larger ones are streamed temporarily through the Gemini Files API and deleted after analysis.
- Facebook direct video fields are an undocumented API and may change; when no video is found or the download fails, the app analyses the thumbnail and states that limitation in the result.
- Numeric confidence is not a calibrated probability; the UI only uses the confidence band.
- Registration needs only a username and a password. Email is optional and added at `/account`; for an account with no email, **a forgotten password means a lost account**.
- There is no account deletion or username change yet.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) and [AGENTS.md](AGENTS.md) before changing code.

Released under the [MIT License](LICENSE).
