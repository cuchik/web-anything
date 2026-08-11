# Security threat model

## Protected assets

Gemini quota/key, D1 recipes, account credentials, session tokens, reset and verification tokens, worker availability and user trust in recipe output.

## Main threats and controls

- SSRF: strict Facebook/video paths, manual redirect validation and image-host allowlists.
- Memory/CPU exhaustion: request, HTML, image and model-response limits plus timeouts; password hashing is capped by a clamped iteration count.
- Quota abuse: D1 fixed-window rate limit and short-lived analysis cache.
- Authorization bypass: server-side owner checks on every recipe operation, keyed by a peppered digest of the user id.
- Credential stuffing and brute force: per-IP and per-identity rate limits on sign-in, signup and password reset.
- Account enumeration: identical sign-in failure for unknown username and wrong password, a comparable hashing cost when the user does not exist, and a constant forgot-password response. Signup does disclose that a username is taken, which is unavoidable for a unique login identifier.
- Weak passwords: eight characters minimum plus required lowercase, uppercase, digit and special character, enforced server-side from the same rule list the UI displays.
- Offline password cracking: PBKDF2-HMAC-SHA256 at 210,000 iterations with a per-user random salt; iteration count is stored per user so it can be raised.
- Session theft and replay: `HttpOnly` `SameSite=Lax` `Secure` cookies, only the token digest in D1, server-side revocation, and all sessions dropped on password reset.
- CSRF: every state-changing route requires a same-origin caller in addition to `SameSite=Lax`.
- Token reuse: reset and verification tokens are single-use, redeemed by a conditional update, scoped to one purpose, and expire in 60 minutes and 24 hours respectively.
- Open redirect: `return_to` is validated to a same-site relative path that is never an auth page.
- Host header injection: emailed links come from `APP_URL`, not from the request.
- Prompt injection: metadata delimiters, instruction hierarchy and output schema.
- Hallucination: non-food rejection, observations/assumptions split and UI disclaimer.
- Secret leakage: ignored environment files, server-only access and structured logs without credentials, email addresses or tokens.

## Residual risks

Facebook anti-bot changes, remote image expiration, model behavior drift and availability of the external providers.

Authentication gaps accepted for now: no multi-factor authentication, no breached-password check, no account lockout (rate limiting only), and no self-service account deletion.

The largest accepted risk is that email is optional. An account registered with username and password alone has **no recovery path at all** — a forgotten password is an unrecoverable account, fixable only by a direct database edit. This is surfaced to the user by a persistent banner and the `/account` page, and it is the deliberate cost of a two-field registration form.
