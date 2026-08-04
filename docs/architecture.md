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

Facebook URLs, redirects, HTML metadata, images, Gemini responses and client save payloads are untrusted. Each boundary has an allowlist, size limit or runtime schema. Authentication is accepted only from dispatch-owned Sites headers and authorization is enforced server-side.

## Runtime data flow

```text
URL -> validate -> rate limit -> cache lookup -> Facebook HTML
    -> validate OG image -> bounded image download -> Gemini
    -> Zod validation -> cache -> browser
```
