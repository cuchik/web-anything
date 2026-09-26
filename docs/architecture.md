# Architecture

## Components

- `app/page.tsx`: client orchestration and product UI.
- `components/recipe-card.tsx`: recipe presentation and actions.
- `app/api/analyze`: request validation, rate limit, cache and provider orchestration.
- `app/api/auth`, `app/signin`, `app/signup`, `app/forgot-password`, `app/reset-password`, `app/verify-email`: first-party accounts and sessions.
- `lib/auth`: credential schemas, PBKDF2 hashing, session cookies, single-use tokens and owner keys.
- `lib/facebook`: supported URL and metadata policy.
- `lib/http/safe-fetch.ts`: manual redirect validation and bounded reads.
- `lib/http/request-origin.ts`: same-origin enforcement and trusted app origin.
- `lib/email`: transactional email for password reset and verification.
- `lib/ai`: provider contract, prompt and Gemini adapter.
- `lib/recipes`: shared runtime schemas.
- `db`: D1 persistence, cache and migrations.

## Trust boundaries

Facebook URLs, redirects, HTML metadata, images, videos, Gemini upload responses, client save payloads, submitted credentials, session cookies, auth tokens and the `Host` header are untrusted. Each boundary has an allowlist, size limit or runtime schema. Authentication comes from a server-side session record keyed by the digest of the cookie token; authorization is enforced server-side on every recipe operation, and every state-changing request must be same-origin.

See [authentication](auth.md) for the account model, password and session policy.

## Runtime data flow

```text
URL -> validate -> rate limit -> versioned cache -> Facebook HTML
    -> validate OG video or embedded progressive video + thumbnail
    -> video available? -> small: bounded inline video -> Gemini (1 FPS sampling)
                        -> larger: streamed Files API upload -> Gemini -> delete file
    -> no safe video / recoverable video failure -> bounded thumbnail -> Gemini
    -> Zod validation -> label analysisMode -> cache -> browser
```

```text
username + password -> same-origin check -> rate limit -> PBKDF2 verify
    -> session row in D1 (digest only) -> HttpOnly SameSite=Lax cookie
    -> requireApiOwner -> HMAC(pepper, userId) -> owner-scoped recipe rows
```

Embedded Facebook media fields are undocumented and isolated in `lib/facebook/video-extractor.ts`. Extraction only traverses bounded JSON script payloads scoped to the requested video ID, with at most two HD/SD candidates. Recommendation videos and arbitrary JavaScript assignments are not used. Conflicting requested/resolved/canonical IDs fail the request. When no usable candidate exists, the source thumbnail is the labeled fallback. Direct video URLs are transient; thumbnail URLs may be stored in cache and recipes.

`lib/config/server.ts` validates server configuration lazily. `APP_URL` is the only trusted public origin. `lib/http/security-headers.ts` is shared by Next configuration and the outer Worker response boundary. `db/retention.ts` handles bounded expiry cleanup; generated migrations alone own the schema.
