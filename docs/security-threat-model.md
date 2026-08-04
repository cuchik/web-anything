# Security threat model

## Protected assets

Gemini quota/key, D1 recipes, authenticated identity, worker availability and user trust in recipe output.

## Main threats and controls

- SSRF: strict Facebook/video paths, manual redirect validation and image-host allowlists.
- Memory/CPU exhaustion: request, HTML, image and model-response limits plus timeouts.
- Quota abuse: D1 fixed-window rate limit and short-lived analysis cache.
- Authorization bypass: server-side owner checks on every recipe operation.
- Prompt injection: metadata delimiters, instruction hierarchy and output schema.
- Hallucination: non-food rejection, observations/assumptions split and UI disclaimer.
- Secret leakage: ignored environment files, server-only access and structured logs without input data.

Residual risks include Facebook anti-bot changes, remote image expiration, model behavior drift and availability of the external providers.
