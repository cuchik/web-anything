# Testing strategy

- Unit tests cover URL policy, redirect safety, bounded reads, Open Graph and embedded-video extraction, rate limiting, recipe schemas, prompt boundaries and owner-key generation.
- Render tests build the Worker and verify product HTML/social metadata.
- CI runs lint, typecheck, build, all tests and dependency audit.
- Live Gemini tests are opt-in because they consume quota and transmit images to Google.

Run all local gates with `pnpm verify`. Use `pnpm eval:offline` for prompt/output-contract regression checks.
