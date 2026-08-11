# Testing strategy

- Unit tests cover URL policy, redirect safety, bounded reads, Open Graph and embedded-video extraction, rate limiting, recipe schemas, prompt boundaries, owner-key generation, password hashing, credential normalisation, auth-token digests, same-origin enforcement and `return_to` validation.
- Render tests build the Worker and verify product HTML/social metadata plus the sign-in and sign-up pages.
- Auth flows that need D1 (signup, sign-in, reset redemption) are covered by hand against a local or deployed database; there is no D1 integration harness yet.
- CI runs lint, typecheck, build, all tests and dependency audit.
- Live Gemini tests are opt-in because they consume quota and transmit images to Google.

Run all local gates with `pnpm verify`. Use `pnpm eval:offline` for prompt/output-contract regression checks.
