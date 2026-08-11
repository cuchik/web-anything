# Authentication

Accounts belong to this application. There is no third-party or platform sign-in, so every route works identically on localhost, on Sites and on any other host.

## Model

- Register with username, email and password. Username and email are both unique and stored normalised (trimmed, lowercased).
- Sign in with **username and password**. Email is never a login identifier.
- Email exists so password reset and verification are possible. An unverified account can still sign in and save recipes; the home page shows a banner until the address is verified.

## Storage

| Table | Contents |
| --- | --- |
| `users` | id, unique username, unique email, PBKDF2 hash + salt + iterations, `email_verified_at` |
| `sessions` | SHA-256 digest of the session token, user id, expiry |
| `auth_tokens` | SHA-256 digest of a single-use token, purpose (`password_reset`, `email_verification`), expiry, `used_at` |

Tokens are only ever stored as digests, so a database leak cannot be replayed as a credential. Expired sessions are pruned whenever a new session is created.

## Passwords

PBKDF2-HMAC-SHA256, 210,000 iterations by default, 16-byte random salt, 256-bit derived key, compared without early exit. Iterations are stored per user so the cost can be raised later without locking anyone out; `PASSWORD_HASH_ITERATIONS` overrides the default and is clamped to 100,000–1,000,000.

Passwords are NFKC-normalised before hashing so the same typed password matches across input methods. This matters for Vietnamese input.

Cost is roughly 50 ms of CPU per hash at the default. That fits a paid Workers CPU budget; it does not fit a 10 ms one.

## Sessions

Opaque 32-byte random token in the `bepvideo_session` cookie: `HttpOnly`, `SameSite=Lax`, `Secure` on HTTPS, 30-day lifetime, not refreshed on use. Sessions are revoked server-side by deleting the row — signing out deletes one, resetting a password deletes all of that user's sessions.

## Routes

| Route | Purpose |
| --- | --- |
| `POST /api/auth/signup` | create account, send verification email, start a session |
| `POST /api/auth/signin` | verify credentials, start a session |
| `POST /api/auth/signout` | delete the current session |
| `POST /api/auth/forgot-password` | email a 60-minute reset link |
| `POST /api/auth/reset-password` | redeem the reset token, drop all sessions |
| `POST /api/auth/verify-email` | redeem a 24-hour verification token |
| `POST /api/auth/verify-email/resend` | re-send verification for the signed-in user |
| `GET /api/session` | current identity for the client |

Pages: `/signin`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`. All are `noindex` and validate `return_to` server-side through `safeRelativeReturnPath`.

## Controls

- Every state-changing auth route asserts a same-origin caller. Cookie auth is CSRF-exposed in a way the previous header auth was not.
- Rate limits are per IP and per identity, through the existing D1 fixed-window limiter: sign-in 20/IP and 10/username per 10 minutes; signup 5/IP per hour; forgot-password 5/IP and 3/email per hour.
- Sign-in failures are indistinguishable between an unknown username and a wrong password, and a missing user still pays a password-hash cost so it is not faster to detect.
- Forgot-password always returns the same message, so it does not disclose whether an address is registered.
- Reset and verification tokens are single-use and redeemed with a conditional `UPDATE ... RETURNING`, so the same token cannot be spent twice.
- Emailed links are built from `APP_URL`, never from the client-supplied `Host` header.

## Email delivery

`RESEND_API_KEY` and `EMAIL_FROM` enable sending through Resend. When either is missing:

- in development the link is written to the structured log (recipient address is not logged) so local reset and verification flows are testable without a provider;
- in production the request fails with `EMAIL_NOT_CONFIGURED` rather than silently dropping the mail.

A verification email that fails to send never rolls back a valid signup; the response reports `verificationEmailSent: false` and the user can retry from the home page.

## Known gaps

- No account deletion, username change or email change flow.
- No password-strength check beyond a 12-character minimum.
- Sessions do not slide, so an active user is signed out 30 days after signing in.
