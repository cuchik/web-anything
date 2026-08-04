# AI prompt and output contract

The active prompt version is exported from `lib/ai/gemini.ts`. Metadata is delimited as untrusted input and cannot supply instructions.

The model must classify `isFood`, return observations separately from assumptions, mark calories with `~`, include relevant safety warnings and return empty recipe fields for non-food images. The server validates every field and derives the confidence band; model confidence is not presented as a calibrated probability.

Changing prompt semantics requires a prompt-version bump, offline tests and an evaluation report. Never loosen the schema to make malformed responses pass.
