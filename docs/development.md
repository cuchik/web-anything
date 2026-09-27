# Development

Use Node.js and the pinned pnpm version. Copy `.env.example` to ignored `.env.local`, set server-only secrets, then run `pnpm dev`. The default Vinext local port is normally 3001.

Analysis needs `GEMINI_API_KEY`. Accounts and saved recipes need D1 and `USER_ID_PEPPER`: signing up, signing in and saving all write to D1, so those flows are unavailable without it. Anonymous browsing and analysis still work — an unauthenticated session lookup never touches the database, and protected APIs return an authentication error.

Set `APP_URL` to the exact origin you browse (for example `http://localhost:3001`). It controls same-origin validation and emailed links. Production requires HTTPS. Configure `RESEND_API_KEY` and `EMAIL_FROM` for email flows; links and recipient addresses are never logged. Apply checked-in migrations to the local D1 before using database-backed flows.

Application code uses `@/` aliases. Build-loader configuration is the exception: Vinext reads `next.config.ts` before registering aliases, so its shared header-policy import uses the same relative-import convention as `vite.config.ts`.

`PASSWORD_HASH_ITERATIONS` defaults to 100,000, the native Cloudflare PBKDF2 cap. Other configured counts are rejected. Existing stored hash parameters are never rewritten or clamped.

Do not use live customer links as tests. Prefer mocked fetch responses and synthetic metadata.
