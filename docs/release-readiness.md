# Production readiness

Status as of 2026-09-26. Branch: `codex/prod-readiness`.

Implementation and verification are separate gates. Tests, browser QA, live Gemini calls,
commits, pushes and deployment have not been authorized for this execution.

| Step | Scope | Implementation | Validation |
| --- | --- | --- | --- |
| 0 | Baseline and hosting discovery | Clean baseline; Sites returns project not found | Hosting blocked |
| 1 | Reauthentication, email-bound recovery, atomic redemption | Implemented, including stale sign-in protection | Runtime validation pending |
| 2 | No sample substitution; validate saved/cached data | Implemented; demo save blocked | Runtime validation pending |
| 3 | Requested-video identity and temporary-file cleanup | Implemented; bounded HD/SD candidates, processing-failure cleanup | Mock/live execution pending |
| 4 | Bounded bodies, write quotas, fail-closed limits | Implemented; actual bytes, per-account quota, global analysis budget | Runtime validation pending |
| 5 | Trusted origin, typed configuration, response headers | Implemented; shared policy and Worker boundary | Runtime/header checks pending |
| 6 | Fresh dependency audit and targeted updates | Installed and lockfile updated | Full audit: 0 findings |
| 7 | Migration, retention and rollback runbook | Generated 0005/0006; cleanup code and operator procedures added | Production backup/migration not performed |
| 8 | Regression coverage | Added/updated auth SQL, migration preservation, ownership/quota, route, media, origin, body and header cases | Written, not run |
| 9 | Static checks and authorized tests | Lint, typecheck and production build completed | Tests not authorized |
| 10 | Isolated staging | Blocked | Needs separate database and hosting access |
| 11 | Production release | Blocked | Needs completed gates and release authorization |
| 12 | Broad architectural refactor | Deferred | Not a release prerequisite |

Never call a private deployment “staging” if it shares production D1. Do not
apply migrations or change production environment variables during local preparation.

## Evidence and limitations

- Baseline: clean `luan-dev` at `9938af9`; no pre-prompt checkpoint needed.
- Node v24.17.0; pinned pnpm 10.30.3 retained. No extra lockfile.
- `pnpm db:generate`: generated additive email-version and expiry-index migrations;
  SQL inspected, no live database modified. Legacy tokens become unusable.
- `pnpm lint`, `pnpm typecheck`, production build and `git diff --check`: static
  checks completed. Build used `APP_URL=https://build.invalid` as a non-production
  build-time placeholder; it is not a deployable origin configuration.
- Earlier static passes found an unused compatibility argument, missing aliases in
  Vinext's config loader and unknown JSON types in new tests. Those were corrected;
  they were not runtime test failures.
- Build still emits upstream code-splitting debug-name and route-classification
  notices; neither is a failed build. Actual page behavior remains unverified.
- [Dependency review](dependency-review.md): registry findings dropped from
  2 critical / 13 high / 4 moderate to zero. Not a general security certification.
- No unit/integration/render/browser tests or live Gemini/email checks ran.
- No localhost server was started. No commit, push, deployment, production
  migration, backup or environment-variable change was made.

## Next gates, in order

1. User authorizes offline tests; run the regression suites and fix failures.
2. Restore access to the existing Sites project in the correct account/workspace.
3. Identify an isolated staging database and approve any new resources.
4. Complete the [release runbook](release-runbook.md), including real D1, email,
   Gemini, header/UI checks and backup restoration. Live calls require approval.
5. Review and authorize commit/push/release of the exact validated candidate.

Until those gates pass this is **implemented locally, not PROD-ready**. Broader
refactoring and self-service account deletion remain deferred; the operator
deletion/support process must be in place before public launch.
