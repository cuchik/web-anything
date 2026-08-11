# Deployment

The project is deployed through OpenAI Sites using `.openai/hosting.json`. Logical D1 binding `DB` is declared there; Sites owns the real resource wiring.

Required hosted secrets:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `USER_ID_PEPPER`

Before release run `pnpm verify`, `pnpm audit`, inspect migrations, validate SIWC save/list/delete behavior and test one public Facebook URL. Rotate secrets through the hosting secret manager, never through source control.

SIWC cannot be validated locally. `app/chatgpt-auth.ts` reads the
`oai-authenticated-user-email` header that the Sites edge injects, and the
`/signin-with-chatgpt` route belongs to the platform, not this app. Locally every
request is unauthenticated by design, so the save/list/delete gate runs against the
deployed environment. The same coupling means this app must not be hosted anywhere
that does not strip those client-supplied headers: it trusts them without
verification, so any other host would allow trivial user impersonation.

## Known trap: migration directory mismatch

`drizzle.config.ts` writes migrations to `./drizzle`, but the `wrangler.json` that
`vinext build` generates into `dist/server/` points `migrations_dir` at
`../../migrations`, which does not exist in this repository. `wrangler d1 migrations
apply` would therefore find nothing, and the generated config also carries the
placeholder `database_id` `00000000-0000-4000-8000-000000000000` from
`vite.config.ts` rather than a real one — Sites substitutes the actual resource.

This does not affect a release that adds no migration: the three files in `drizzle/`
match `db/schema.ts` exactly. Before shipping any release that does add one, confirm
how Sites applies D1 migrations and reconcile the two directories, otherwise the new
table or column silently never reaches production.

## Audited exceptions

`pnpm.auditConfig.ignoreGhsas` in `package.json` suppresses two high advisories on
`image-size@2.0.2` (GHSA-w3rx-r6r6-pgpr, GHSA-5p2g-fcmc-qvqq). Neither has a patched
release. Both are reachable only through `vinext/dist/server/metadata-route-build-data.js`,
which reads repository files with `node:fs` at build time to size metadata route
images. `node:fs` does not exist on workerd, `image-size` is absent from the `dist/`
bundle, and this repository ships no metadata route images at all, so the parser
never runs and never sees attacker-supplied input. Re-check with `pnpm why image-size`
and drop the entries once a patched version ships.

Rollback by redeploying the previous known-good application version. Database migrations in this repository are additive; do not delete D1 data as part of an application rollback.
