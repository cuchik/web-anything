# Contributing

1. Create a focused branch and keep unrelated changes out of the PR.
2. Install with `pnpm install --frozen-lockfile`.
3. Add or update tests with each behavior change.
4. Run `pnpm verify` and `pnpm audit` before requesting review.
5. If the database schema changed, run `pnpm db:generate` and inspect every SQL statement.
6. Update product or architecture documentation when behavior changes.

PRs should explain user impact, security/privacy impact, verification performed, migration requirements and rollback approach. Do not include secrets, real user emails or private Facebook URLs in fixtures.
