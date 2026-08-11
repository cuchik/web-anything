# ADR 0007: First-party username and password authentication

Status: accepted.

Replace ChatGPT Sites header authentication with accounts owned by this application. Sign-in with ChatGPT only worked inside the Sites dispatch layer, so `/signin-with-chatgpt` returned 404 on localhost and on any other host, and the product could not be run or demonstrated outside Sites.

Users register with a username, an email address and a password, and sign in with username and password. The email address is not a login identifier; it exists so that password reset and address verification are possible at all.

Passwords are hashed with PBKDF2-HMAC-SHA256, the only password KDF available natively on Workers. Argon2id or bcrypt would need a WASM dependency, which this codebase deliberately avoids. Iterations default to 210,000 and are stored per user so the cost can be raised later without invalidating existing accounts. Measured cost is roughly 50 ms of CPU per hash, which fits a paid Workers CPU budget but not a 10 ms one.

Sessions are opaque 32-byte tokens in an `HttpOnly`, `SameSite=Lax` cookie. Only the SHA-256 digest is stored in D1, so a database leak cannot be replayed, and sessions are revocable server-side — a stateless JWT would not be. Sessions last 30 days and are not refreshed on use.

Cookie authentication introduces CSRF exposure that header authentication did not have, so every state-changing route asserts a same-origin caller.

The recipe owner key changes from `HMAC(pepper, email)` to `HMAC(pepper, userId)` because the user id is stable while an email address is not. Rows saved under the previous ChatGPT-era key are not readable by the new accounts.
