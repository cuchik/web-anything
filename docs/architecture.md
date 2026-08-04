# Architecture

## Components

- `app/page.tsx`: client orchestration and product UI.
- `components/recipe-card.tsx`: recipe presentation and actions.
- `app/api/analyze`: request validation, rate limit, cache and provider orchestration.
- `lib/facebook`: supported URL and metadata policy.
- `lib/http/safe-fetch.ts`: manual redirect validation and bounded reads.
- `lib/ai`: provider contract, prompt and Gemini adapter.
- `lib/recipes`: shared runtime schemas.
- `db`: D1 persistence, cache and migrations.

## Trust boundaries

Facebook URLs, redirects, HTML metadata, images, videos, Gemini upload responses, model responses and client save payloads are untrusted. Each boundary has an allowlist, size limit or runtime schema. Authentication is accepted only from dispatch-owned Sites headers and authorization is enforced server-side.

## Runtime data flow

```text
URL -> validate -> rate limit -> versioned cache -> Facebook HTML
    -> validate OG video or embedded progressive video + thumbnail
    -> video available? -> small: bounded inline video -> Gemini (1 FPS sampling)
                        -> larger: streamed Files API upload -> Gemini -> delete file
    -> no safe video / recoverable video failure -> bounded thumbnail -> Gemini
    -> Zod validation -> label analysisMode -> cache -> browser
```

Embedded Facebook media fields are undocumented and isolated in `lib/facebook/video-extractor.ts`. Extraction never expands the media allowlist, never stores signed CDN URLs, and remains an optional path: any missing, malformed or unusable video candidate falls back to the source video's validated thumbnail.
