# ADR 0006: Facebook embedded progressive-video extraction

## Status

Accepted.

## Decision

For public Facebook video pages, prefer a validated Open Graph video URL. When Open Graph omits video, inspect a bounded copy of the public HTML for known progressive-video fields in embedded JSON, preferring HD over SD. Accept candidates only when they parse as HTTPS URLs on the existing Facebook/Facebook-CDN allowlist. Use the signed URL immediately for Gemini analysis and do not persist or log it.

Do not depend on a third-party downloader endpoint. Do not use Facebook cookies or private/login-gated content. If the undocumented fields are absent, malformed, expired or unusable, retain the validated thumbnail fallback and truthful `analysisMode` label.

## Consequences

- More public Reel and Watch URLs can use multi-frame video analysis without an application-side FFmpeg runtime.
- The integration remains bounded by a 2 MiB HTML read, redirect validation, media size limits and the existing host allowlist.
- Facebook can change these undocumented page fields at any time, so the extractor has isolated tests and degradation is expected to be graceful rather than silent.
- Operators remain responsible for confirming that collection and processing comply with Facebook terms and applicable law.
