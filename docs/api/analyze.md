# POST /api/analyze

Request:

```json
{ "url": "https://www.facebook.com/reel/..." }
```

Success returns a validated recipe with `analysisMode` (`video` or `thumbnail`), `image`, `sourceUrl`, `promptVersion`, observations, assumptions, warnings and a request ID. Responses use `Cache-Control: no-store`.

Important statuses: `400` invalid input, `413` oversized input, `422` unavailable/non-food media, `429` rate/quota limit, `502` invalid upstream response and `503` unavailable configuration/provider.

The endpoint accepts supported HTTPS Facebook video paths only. It can discover a progressive video from Open Graph or known embedded public-page fields; redirects and media hosts remain allowlisted through the full fetch chain. Recoverable video discovery/download/upload failures fall back only to the validated thumbnail belonging to the same source video.
