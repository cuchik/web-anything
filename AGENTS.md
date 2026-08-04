# Repository instructions

## Product contract

- The app analyzes the public Facebook video's thumbnail, not the full video.
- Never describe the current implementation as extracting, watching, or selecting frames from a video.
- AI output is an estimate. Preserve observations, assumptions, warnings, and the user-facing disclaimer.
- Never substitute a sample or fallback image for a real user URL.

## Tooling

- Use the pnpm version pinned in `package.json`.
- Keep exactly one lockfile: `pnpm-lock.yaml`.
- Run `pnpm verify` after behavior changes.
- Run `pnpm audit` after dependency changes.
- Run `pnpm db:generate` and inspect generated SQL after `db/schema.ts` changes.

## Architecture boundaries

- Route handlers orchestrate HTTP only; domain logic belongs in `lib/` or `db/`.
- Keep Facebook URL/fetch policy in `lib/facebook` and `lib/http/safe-fetch.ts`.
- Keep provider-specific AI code in `lib/ai`.
- Share runtime-validated recipe schemas between server and client.
- Access D1 through small `db/` modules; do not read bindings throughout UI code.

## Security and privacy

- Never print, commit, or return API keys, user email, image bytes, or full Facebook URLs in logs.
- Validate every redirect; never reintroduce `redirect: "follow"` for user-influenced URLs.
- Preserve response byte limits and approved host allowlists.
- All saved-recipe reads and writes require server-side ownership checks.
- Do not use localStorage as authoritative persistence.
- Live Gemini evaluations require explicit user approval because they consume quota and send images to Google.

## Code review rules

- Flag any path that can turn a Facebook failure into a successful unrelated recipe.
- Flag unbounded network reads, new external hosts, missing authorization, and AI claims not supported by the input.
- Mechanical formatting and lint rules belong in CI; keep this file focused on product and safety invariants.
