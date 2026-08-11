# Development

Use Node.js and the pinned pnpm version. Copy `.env.example` to ignored `.env.local`, set server-only secrets, then run `pnpm dev`. The default Vinext local port is normally 3001.

Analysis needs `GEMINI_API_KEY`. Accounts and saved recipes need D1 and `USER_ID_PEPPER`: signing up, signing in and saving all write to D1, so those flows are unavailable without it. Anonymous browsing and analysis still work — an unauthenticated session lookup never touches the database, and protected APIs return an authentication error.

Set `APP_URL` to the origin you browse (for example `http://localhost:3001`) so emailed links point back at your dev server. Leave `RESEND_API_KEY` and `EMAIL_FROM` empty locally: password-reset and verification links are written to the structured log instead of being sent, which is enough to walk through both flows. Recipient addresses are never logged.

`PASSWORD_HASH_ITERATIONS` can be lowered locally if PBKDF2 makes sign-in feel slow. Do not lower it in a deployed environment.

Do not use live customer links as tests. Prefer mocked fetch responses and synthetic metadata.
