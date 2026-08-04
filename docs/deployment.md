# Deployment

The project is deployed through OpenAI Sites using `.openai/hosting.json`. Logical D1 binding `DB` is declared there; Sites owns the real resource wiring.

Required hosted secrets:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `USER_ID_PEPPER`

Before release run `pnpm verify`, `pnpm audit`, inspect migrations, validate SIWC save/list/delete behavior and test one public Facebook URL. Rotate secrets through the hosting secret manager, never through source control.

Rollback by redeploying the previous known-good application version. Database migrations in this repository are additive; do not delete D1 data as part of an application rollback.
