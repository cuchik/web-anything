# Privacy data flow

For analysis, the server receives a public Facebook URL, fetches public metadata and sends the validated thumbnail plus bounded title/description to Google Gemini. The app does not send the user's ChatGPT email to Gemini.

For saved recipes, Sites supplies authenticated-user headers. The server derives an HMAC owner key with `USER_ID_PEPPER`; D1 stores that key, recipe content, public source URL, remote image URL and timestamps. The app does not persist image bytes.

Users should be told that image content is processed by Google and that AI cooking instructions are estimates. Deletion removes the saved D1 row owned by that user.
