# Privacy data flow

For analysis, the server receives a public Facebook URL, fetches public metadata and sends a validated Facebook video or its thumbnail plus bounded title/description to Google Gemini. Small videos are sent inline. Larger supported videos are streamed to Gemini Files API, used once, then deleted on a best-effort basis; Gemini also expires uploaded files automatically. The app does not send the user's ChatGPT email to Gemini or persist media bytes in D1.

For saved recipes, Sites supplies authenticated-user headers. The server derives an HMAC owner key with `USER_ID_PEPPER`; D1 stores that key, recipe content, public source URL, remote image URL and timestamps. The app does not persist image bytes.

Users should be told that image content is processed by Google and that AI cooking instructions are estimates. Deletion removes the saved D1 row owned by that user.
