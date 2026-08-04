# AI prompt and output contract

The active prompt version is exported from `lib/ai/gemini.ts`. Metadata is delimited as untrusted input and cannot supply instructions.

For direct video input, Gemini samples the timeline at 1 FPS and the prompt asks it to combine ingredients and operations seen at different times. For thumbnail fallback, the prompt explicitly forbids claiming that the full video was viewed.

The model must classify `isFood`, return observations separately from assumptions, mark calories with `~`, include relevant safety warnings and return empty recipe fields for non-food media. The server validates every field and derives the confidence band; model confidence is not presented as a calibrated probability.

Changing prompt semantics requires a prompt-version bump, offline tests and an evaluation report. Never loosen the schema to make malformed responses pass.
