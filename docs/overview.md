# Product overview

Bếp Từ Video helps a user turn a public Facebook video into an editable cooking suggestion. The system extracts public Open Graph metadata and progressive-video URLs present in the public page's embedded JSON, validates Facebook-hosted media, and asks Gemini to sample frames across the video timeline. If Facebook does not expose a safe direct video URL, the system falls back to that video's validated thumbnail and labels the result accordingly.

Analysis is public and rate-limited. Saving is optional and requires ChatGPT sign-in. D1 stores an HMAC-derived owner key, recipe JSON and source metadata; raw email is not stored by this app.
