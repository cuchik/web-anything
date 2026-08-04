# Product overview

Bếp Từ Video helps a user turn a public Facebook video thumbnail into an editable cooking suggestion. The system extracts public Open Graph metadata, validates the Facebook-hosted image, sends that image and bounded metadata to Gemini, validates structured output and labels model observations versus assumptions.

Analysis is public and rate-limited. Saving is optional and requires ChatGPT sign-in. D1 stores an HMAC-derived owner key, recipe JSON and source metadata; raw email is not stored by this app.
