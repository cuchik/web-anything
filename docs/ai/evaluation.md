# AI evaluation

Offline evaluation (`pnpm eval:offline`) verifies prompt boundaries, schema invariants, non-food behavior and saved-payload compatibility without calling Gemini.

Live evaluation requires explicit approval and a curated, licensed fixture set. Track schema validity, non-food rejection, dish-category accuracy, unsupported ingredient rate, assumptions labeling, latency and request count. Store no private Facebook URLs or user images in fixtures.

Initial release gate: schema validity must be 100%, real requests must never use a fallback image and non-food outputs must not contain a fabricated recipe.
