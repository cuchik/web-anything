# Deployment

The project is deployed through OpenAI Sites using `.openai/hosting.json`. Logical D1 binding `DB` is declared there; Sites owns the real resource wiring. Authentication is first-party and does not depend on the Sites dispatch layer, so the same build runs unchanged on any Workers-compatible host.

Required hosted secrets:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `USER_ID_PEPPER`
- `APP_URL` — public origin of the deployment; emailed links are built from it rather than from the client `Host` header
- `RESEND_API_KEY` and `EMAIL_FROM` — without both, password reset and email verification fail with `EMAIL_NOT_CONFIGURED` in production

Optional:

- `PASSWORD_HASH_ITERATIONS` — defaults to 210,000; configured values outside 100,000–1,000,000 fail validation. Measure the hash cost in the actual Worker plan before release; do not assume it fits a free-tier CPU budget.

Before release run `pnpm verify` and `pnpm audit` — this is the only point where dependencies are audited, since CI no longer does it — then inspect migrations, walk signup, sign-in, sign-out, adding an email at `/account`, forgot-password, reset-password and verify-email against the deployed origin, validate save/list/delete behaviour and test one public Facebook URL.

Migration `0004` makes `users.email` nullable by recreating the table (SQLite cannot drop a NOT NULL constraint in place). It copies every existing row, but unlike the earlier migrations it is not purely additive — apply it to a deployed database deliberately, not as an afterthought.

Rotate secrets through the hosting secret manager, never through source control. Rotating `USER_ID_PEPPER` orphans every saved recipe; rotating it is a data migration, not a config change.

Migrations are **not all additive** (`0004` rebuilds `users`). New migrations `0005` and `0006` add email-version binding and expiry indexes. Legacy tokens with NULL email version cannot be redeemed. Runtime schema creation has been removed: migrations must precede the new Worker.

Use the [release runbook](release-runbook.md) for backup, isolated staging, retention, ownership compatibility and rollback. Do not roll back to an old binary that re-enables the fixed recovery vulnerabilities, even if the schema remains compatible.
