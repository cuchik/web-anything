# Privacy data flow

For analysis, the server receives a public Facebook URL, fetches public metadata and public-page embedded media fields, then sends a validated Facebook video or its thumbnail plus bounded title/description to Google Gemini. Small videos are sent inline. Larger supported videos are streamed to Gemini Files API, used once, then deleted on a best-effort basis; Gemini also expires uploaded files automatically. The app does not persist signed Facebook CDN URLs or media bytes in D1, and it does not send account data to Gemini.

For accounts, D1 stores the username, the email address, a PBKDF2 password hash with its salt and iteration count, and a verification timestamp. The plaintext password is never stored or logged. Sessions and reset/verification tokens are stored only as SHA-256 digests. The email address is used for password reset and verification only; it is passed to the email provider (Resend) when such a message is sent, and is never written to logs.

For saved recipes, the server derives an HMAC owner key from the user id with `USER_ID_PEPPER`; D1 stores that key, recipe content, public source URL, remote image URL and timestamps. The app does not persist image bytes.

Users should be told that image content is processed by Google and that AI cooking instructions are estimates. Deletion removes the saved D1 row owned by that user. There is no self-service account deletion yet, so removing an account is currently a manual database operation.
