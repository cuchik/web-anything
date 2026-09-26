# Release runbook

This is an operator checklist, not evidence that production was changed. The current
Sites connection cannot access the project in `.openai/hosting.json` (`NOT_FOUND`).
Do not create a replacement Site or guess a D1 identifier to bypass that failure.

## 1. Prepare a release candidate

1. Review the working diff and `docs/release-readiness.md`. Do not auto-commit/push.
2. With explicit test authorization, run `pnpm verify`. Record command, runtime,
   result and candidate commit. Run `pnpm audit` against the resulting lockfile.
3. Read-only inspection must confirm the exact Site, access policy, active version,
   database binding, migration history and required environment-variable names.
   Never print values of secrets. Keep the existing audience unchanged.
4. Provision/choose a genuinely isolated staging deployment with a different D1,
   separate credentials and non-production synthetic accounts. A private release
   on production D1 is **not** staging. Obtain authorization for new resources.

## 2. Configuration and operational gates

- `APP_URL`: exact HTTPS origin in production, without path, query, credentials or
  fragment. Local HTTP is allowed only for loopback hosts in development/test.
- Gemini key and model: validate availability with an explicitly approved live
  request. Do not infer quota or model availability from a successful build.
- `USER_ID_PEPPER`: preserve the existing value. Validate its configured presence
  without logging it. Rotation requires an ownership migration with the old key.
- Resend credentials and verified sender: demonstrate actual mail delivery on
  staging. No development token logs are available as a shortcut.
- D1 must be bound and migrations applied. Production rate-limited operations fail
  closed without it. In-memory limiting is only a development/test fallback.
- Ensure the proxy overwrites `cf-connecting-ip`; `x-forwarded-for` is ignored.
  Non-Cloudflare hosts share the anonymous IP bucket until a trusted adapter exists.
- Validate Worker CPU and request lifetime budgets for PBKDF2, Facebook download,
  Gemini upload/poll/generation and cleanup. Build success does not prove capacity.
- Initial budgets: 10 analyses/IP/10 minutes, 100 uncached analyses/site/hour;
  up to two video candidates and then one thumbnail per request. These are abuse
  controls, not a guarantee against exhausting provider quota.
- Saved recipes: 100/account, 24,000 UTF-8 bytes/payload, 20 writes/account/minute.

## 3. Database backup and migration

Before touching production, use the authorized hosting/database control plane to
create a supported backup/export or recovery point. Record the exact database,
timestamp, migration ledger and restoration procedure in a private operations
record. Protect backups as personal data; do not commit them to this repository.
Prove restoration to a **separate** database before approving release.

Inspect applied migrations before choosing the pending set:

- `0004` rebuilds `users` to allow NULL email. It is not an additive change. Verify
  user IDs, hashes, usernames, email values, row counts and unique indexes survive.
- `0005` adds users' non-null `email_version DEFAULT 0` and nullable token version.
  Old tokens remain NULL and are deliberately unusable. Tell users to request new
  verification/reset links; verified accounts and existing sessions are preserved.
- `0006` adds indexes used by expiry cleanup. No account or recipe data is deleted.

Apply only pending checked-in migrations, once, through the supported deployment
flow. Never rewrite an applied migration or reset the production database. Runtime
code does not create/alter schema. A failed deployment may still have applied
migrations: inspect the ledger before retrying.

Saved-recipe ownership remains `HMAC-SHA256(USER_ID_PEPPER, userId)`. Existing
records from a previous identity scheme must not be reassigned by matching email.
Count and quarantine inaccessible legacy records; migrate them only with a verified
mapping, authorization and a restorable backup. The release must not claim legacy
ownership migration is complete without that evidence.

## 4. Staging acceptance (explicit test authorization required)

- Fresh database and upgrade-from-existing fixtures, including `0004` preservation.
- Signup/signin/signout; duplicate accounts; two-account recipe isolation; quota
  boundary; corrupt stored payload; direct API writes without a session.
- Changing email requires the password. Test old link after change and after
  change-away-and-back; only verified addresses receive recovery mail.
- Reset replay/concurrency, injected DB failure and session invalidation. Verify
  stale sign-in cannot issue a session after a password reset.
- Oversized/chunked request, missing DB, wrong origin, spoofed forwarding headers,
  invalid configuration, and rate-limit behavior across Worker instances.
- Public Reel/watch/share links, wrong/recommended video first in HTML, blocked
  Facebook response, HD failure → same-video SD → clearly labeled thumbnail.
- Gemini Files API success/failure/timeout cleanup, provider auth/quota errors,
  actual runtime duration and sampled timestamps. Never promise every video frame
  was analyzed: the configured video input sampling is one frame per second.
- Check headers on `/`, an auth page, an API success/error, redirect, 404 and image
  response. Verify canonical/social URLs use `APP_URL` under a spoofed Host.
- Mobile/desktop and keyboard UI; email form state after save; demo cannot save;
  save/delete network errors preserve useful state.

Record evidence per gate. Do not substitute local SQL adapter results for actual
D1/Worker checks or a mocked Gemini response for real media ingestion.

## 5. Retention and operator deletion

Logical TTLs: cache 30 minutes, session 30 days, reset link 60 minutes, verification
link 24 hours. The Worker opportunistically schedules at most one cleanup/hour per
isolate; each run deletes at most 1,000 expired rows/table. Low/no traffic can delay
physical deletion; this is not a guaranteed erasure schedule. Monitor table sizes,
cleanup failures and backlog. If necessary, arrange an authorized scheduled job;
none is configured by this change. Existing unhashed rate-limit keys disappear
through expiry cleanup; remove expired rows during maintenance if required.

There is no self-service account deletion in this release. Before public launch,
the owner must provide a real support channel and accountable deletion operator.
For an authorized deletion request, verify ownership using an authenticated session
or an established verified recovery channel, resolve the immutable user ID and
owner HMAC with the existing pepper, then execute parameterized deletes of that
owner's recipes, sessions, auth tokens and user in one database batch. Use a
read-only count first; never target by a guessed email or broad pattern. Record only
non-sensitive completion evidence. Explain backup retention separately: a live-row
delete does not erase historical backups immediately.

## 6. Publish, observe and roll back

After review/test/staging gates pass and the user authorizes commit/push/release,
publish a version built from exactly that committed and pushed source. Preserve
access controls. Record prior version, new version, migrations and deployment status.
Monitor errors, latency, quota denials, thumbnail fallback rate, cleanup failures
and email delivery without recording URLs, images, tokens or user email.

Abort/roll back if auth, ownership, migrations or basic recipe flows fail. Schema
compatibility alone is not enough: do not restore a binary that accepts stale
recovery tokens. Prefer a forward fix or a reviewed previous secure build. If no
secure rollback binary exists, restrict access through the hosting control plane
while fixing forward. Database restore is separately authorized and requires a
write freeze and explicit acknowledgement of post-backup writes that could be lost.

Do not down-migrate by dropping columns/tables. Broad refactors, MFA, calibrated AI
confidence, and full video-download compatibility remain separate milestones.
