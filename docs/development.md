# Development

Use Node.js and the pinned pnpm version. Copy `.env.example` to ignored `.env.local`, set server-only secrets, then run `pnpm dev`. The default Vinext local port is normally 3001.

D1-backed paths are fully available in the Sites/Cloudflare runtime. Local unauthenticated browsing remains usable without identity headers; protected save APIs return an authentication error.

Do not use live customer links as tests. Prefer mocked fetch responses and synthetic metadata.
