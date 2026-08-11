# Deployment

The project is deployed through OpenAI Sites using `.openai/hosting.json`. Logical D1 binding `DB` is declared there; Sites owns the real resource wiring. Authentication is first-party and does not depend on the Sites dispatch layer, so the same build runs unchanged on any Workers-compatible host.

Required hosted secrets:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `USER_ID_PEPPER`
- `APP_URL` — public origin of the deployment; emailed links are built from it rather than from the client `Host` header
- `RESEND_API_KEY` and `EMAIL_FROM` — without both, password reset and email verification fail with `EMAIL_NOT_CONFIGURED` in production

Optional:

- `PASSWORD_HASH_ITERATIONS` — defaults to 210,000, clamped to 100,000–1,000,000. Roughly 50 ms of CPU per hash at the default, so the runtime needs a CPU budget well above 10 ms per request.

Before release run `pnpm verify`, `pnpm audit`, inspect migrations, walk signup, sign-in, sign-out, forgot-password, reset-password and verify-email against the deployed origin, validate save/list/delete behaviour and test one public Facebook URL.

Rotate secrets through the hosting secret manager, never through source control. Rotating `USER_ID_PEPPER` orphans every saved recipe; rotating it is a data migration, not a config change.

Rollback by redeploying the previous known-good application version. Database migrations in this repository are additive; do not delete D1 data as part of an application rollback.
