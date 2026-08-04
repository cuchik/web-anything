---
name: recipe-evaluation
description: Evaluate changes to the Bếp Từ Video Gemini prompt, recipe schema, confidence handling, observations, assumptions, non-food rejection, or AI safety behavior.
---

# Recipe evaluation

Use this workflow whenever AI prompt or recipe-contract behavior changes.

1. Read `docs/ai/prompt-and-output-schema.md` and `docs/ai/evaluation.md`.
2. Inspect the prompt-version change and explain the intended behavior difference.
3. Run `pnpm eval:offline`, then `pnpm lint` and `pnpm typecheck`.
4. Report schema, non-food, prompt-injection and saved-payload regressions separately.
5. Do not run live Gemini evaluation unless the user explicitly approves quota usage and the fixtures are licensed/public.
6. Never add private Facebook URLs, user images, API keys or raw model image payloads to fixtures or reports.

If live evaluation is approved, record model, prompt version, fixture-set version, latency and qualitative failures without exposing secrets.
