# Deployment

## Cloudflare Pages

The Pages build packages the existing Vinext server and SSR chunks as a Pages
Advanced Mode `_worker.js` directory, alongside the client assets. SSR, API routes,
authentication and D1 continue to run server-side.

In the Pages project's Git build settings use:

| Setting | Value |
| --- | --- |
| Project name | `cookfromvideo` |
| Framework preset | `None` |
| Build command | `pnpm build:pages` |
| Build output directory | `dist/pages` |
| Root directory | Repository root (leave blank) |
| Production branch | The branch containing the reviewed release, normally `main` |

Use Node.js 22.13.0 or newer and the pinned pnpm 10.30.3. Merge/push the Pages
changes to the configured production branch before triggering a new deployment.
Retrying an older commit will not use these changes. Do not use the Next.js preset,
`dist/client`, or a Workers `wrangler deploy` command for this Pages project.

The root `wrangler.json` is the Pages configuration source of truth. It sets
`nodejs_compat`, the production `DB` binding to
`52ed060b-ee57-4e0c-95e7-7132ba31a10f`, and production
`APP_URL=https://cookfromvideo.pages.dev`. Set the secrets listed below in the
**Pages project's Production settings**; Worker secrets do not transfer to Pages.
Preserve the existing `USER_ID_PEPPER` when reusing the existing database.

Preview intentionally has no D1 binding or production APP_URL. Before using
authentication or analysis in a preview, configure a separate D1 and matching
APP_URL in `env.preview`, and separate preview secrets in Cloudflare. Do not bind
preview builds to the production database.

For a CLI deployment after review, `pnpm deploy:pages` builds and uploads to Pages.
Wrangler uses the current Git branch to select production or preview. To explicitly
target a project whose production branch is `main`, use:

```bash
pnpm build:pages
pnpm exec wrangler pages deploy dist/pages --project-name=cookfromvideo --branch=main
```

Building does not apply database migrations. Inspect and apply only pending
migrations according to the release runbook before serving traffic. The Pages
configuration points to the checked-in `drizzle` directory; it does not create,
reset, or migrate the database automatically.

`pnpm build` still generates the intermediate Worker output. The Vite plugin uses
`build/wrangler.json` plus its inline configuration rather than loading the root
Pages configuration. `pnpm build:pages` then removes Vite's generated Workers
deployment redirect so Pages reads the root config. Only upload `dist/pages`:
server modules are under `_worker.js`, and Sites metadata/migrations are not public.

## Diagnosing an analysis 500 after deployment

Find the `analysis.failed` log with the response's `requestId`. Its `stage`
identifies origin validation, rate limiting, cache reads/writes, Facebook metadata,
or Gemini analysis. Raw errors and submitted URLs are deliberately not logged.
`DATABASE_SCHEMA_MISSING` means a D1 query found a missing table/column;
`DATABASE_ERROR` indicates another D1 query failure. Neither is fixed by rebuilding.

After authenticating Wrangler, inspect production schema and migration history
without changing data:

```bash
pnpm exec wrangler login
pnpm exec wrangler d1 execute DB --env production --remote --command "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
pnpm exec wrangler d1 migrations list DB --env production --remote
```

Analysis requires `api_rate_limits` and `analysis_cache`; authentication requires
the remaining checked-in migrations. If migrations are missing, follow the backup
and migration procedure in `release-runbook.md` before applying pending SQL.
Do not blindly apply every migration to an existing untracked schema, and do not
create tables from an API request. Missing database bindings or Gemini secrets
have separate application error codes.

Use the canonical production URL `https://cookfromvideo.pages.dev` when
`APP_URL` has that value. A deployment-specific hostname is a different origin
and is intentionally rejected by the same-origin checks.

## Other hosting

The optional OpenAI Sites configuration remains in `.openai/hosting.json`, with
logical D1 binding `DB`. Pages deployment does not use the Sites control plane.

## Runtime configuration

Required hosted secrets:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `USER_ID_PEPPER`
- `APP_URL` — public origin of the deployment; emailed links are built from it rather than from the client `Host` header
- `RESEND_API_KEY` and `EMAIL_FROM` — without both, password reset and email verification fail with `EMAIL_NOT_CONFIGURED` in production

Optional:

- `PASSWORD_HASH_ITERATIONS` — defaults to 100,000; only 100,000 is accepted for new hashes because of the native Cloudflare PBKDF2 cap. Measure the hash cost in the actual Worker plan before release; do not assume it fits a free-tier CPU budget.

Before release run `pnpm verify` and `pnpm audit` — this is the only point where dependencies are audited, since CI no longer does it — then inspect migrations, walk signup, sign-in, sign-out, adding an email at `/account`, forgot-password, reset-password and verify-email against the deployed origin, validate save/list/delete behaviour and test one public Facebook URL.

Migration `0004` makes `users.email` nullable by recreating the table (SQLite cannot drop a NOT NULL constraint in place). It copies every existing row, but unlike the earlier migrations it is not purely additive — apply it to a deployed database deliberately, not as an afterthought.

Rotate secrets through the hosting secret manager, never through source control. Rotating `USER_ID_PEPPER` orphans every saved recipe; rotating it is a data migration, not a config change.

Migrations are **not all additive** (`0004` rebuilds `users`). New migrations `0005` and `0006` add email-version binding and expiry indexes. Legacy tokens with NULL email version cannot be redeemed. Runtime schema creation has been removed: migrations must precede the new Worker.

Use the [release runbook](release-runbook.md) for backup, isolated staging, retention, ownership compatibility and rollback. Do not roll back to an old binary that re-enables the fixed recovery vulnerabilities, even if the schema remains compatible.
