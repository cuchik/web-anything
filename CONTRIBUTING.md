# Contributing

1. Create a focused branch and keep unrelated changes out of the PR.
2. Install with `pnpm install --frozen-lockfile`.
3. Add or update tests with each behavior change.
4. Run `pnpm verify` before requesting review. CI repeats it, but it is the only automated gate — there are no pre-commit hooks.
5. Run `pnpm audit` yourself if the change touches dependencies or the lockfile. CI does not audit, by design: a CVE published today should not fail a change that does not touch dependencies.
6. If the database schema changed, run `pnpm db:generate` and inspect every SQL statement.
7. Update product or architecture documentation when behavior changes.

PRs should explain user impact, security/privacy impact, verification performed, migration requirements and rollback approach. Do not include secrets, real user emails or private Facebook URLs in fixtures.
