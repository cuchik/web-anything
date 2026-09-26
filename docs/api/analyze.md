# POST /api/analyze

Request:

```json
{ "url": "https://www.facebook.com/reel/..." }
```

Success returns a validated recipe with `analysisMode` (`video` or `thumbnail`), `image`, `sourceUrl`, `promptVersion`, observations, assumptions, warnings and a request ID. Responses use `Cache-Control: no-store`.

Important statuses: `400` invalid input, `413` oversized input, `422` unavailable/non-food media, `429` rate/quota limit, `502` invalid upstream response and `503` unavailable configuration/provider.

The endpoint requires `Origin` to exactly match configured `APP_URL`. JSON bodies are limited to 4,096 actual streamed bytes, not just declared Content-Length. It accepts supported HTTPS Facebook video paths only, without credentials or custom ports. Cache keys include prompt version and configured model. Budgets are 10 requests/IP/10 minutes and 100 uncached analyses/site/hour; missing production D1 fails closed.

Progressive-video extraction uses page Open Graph metadata or bounded JSON objects belonging to the requested video ID. Conflicting requested/resolved/canonical IDs produce `FACEBOOK_VIDEO_MISMATCH`. At most two identity-matched video candidates are tried before a labeled thumbnail fallback. Provider auth and quota errors do not silently become thumbnail success. No real URL, including the former demo URL, is mapped to a sample image.
