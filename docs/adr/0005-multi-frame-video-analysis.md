# ADR 0005: Multi-frame video analysis

## Status

Accepted.

## Decision

When public Facebook Open Graph metadata exposes a direct video URL hosted by an approved Facebook domain, send the video to Gemini for timeline-aware analysis at 1 FPS. Videos up to 14 MiB use inline data. Videos with a declared size up to 100 MiB use a streamed, resumable Gemini Files API upload and are deleted after analysis on a best-effort basis.

When a safe direct video URL is absent, oversized, unavailable, or cannot be processed through the Files API, analyze the validated thumbnail from the same Facebook video. Return `analysisMode` and show the fallback prominently in the UI.

## Consequences

- Recipes can use ingredients and operations appearing at different timestamps.
- The Worker does not need FFmpeg or persistent video storage.
- Facebook metadata availability remains the limiting factor for full-video analysis.
- Media is disclosed as third-party processing by Google Gemini; video bytes are not persisted by the app.
