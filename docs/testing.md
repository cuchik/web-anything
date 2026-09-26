# Testing strategy

- Unit tests cover URL policy, redirect safety, bounded reads, Open Graph and embedded-video extraction, rate limiting, recipe schemas, prompt boundaries, owner-key generation, password hashing, credential normalisation, auth-token digests, same-origin enforcement and `return_to` validation.
- Render tests build the Worker and verify product HTML/social metadata plus the sign-in and sign-up pages.
- Auth database regression cases use actual migrations and SQLite SQL with a transactional D1 adapter. They cover stale email versions, verified-only recovery, reset/verification replay, competing redemption, rollback on revocation failure, and stale sign-in. This does not prove behavior on real D1; isolated Worker/D1 staging remains a release gate.
- CI runs lint, typecheck, build and all tests on every pull request and every push to `main`. It is the only automated gate: this repository has no pre-commit hooks.
- CI does **not** audit dependencies. `pnpm audit` is run manually — after dependency changes and before a release — so that a newly published CVE cannot fail an unrelated change.
- Live Gemini tests are opt-in because they consume quota and transmit images to Google.

When the user explicitly authorizes tests, run all local gates with `pnpm verify`. Without that authorization, run only static checks and leave test verification pending. Live Gemini testing requires separate approval for quota use and data transfer. The SQLite regression harness needs the declared Node >=22.13 runtime; Node may print an experimental SQLite warning.
