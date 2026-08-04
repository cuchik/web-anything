# POST /api/analyze

Request:

```json
{ "url": "https://www.facebook.com/reel/..." }
```

Success returns a validated recipe with `image`, `sourceUrl`, `promptVersion`, observations, assumptions, warnings and a request ID. Responses use `Cache-Control: no-store`.

Important statuses: `400` invalid input, `413` oversized input, `422` unavailable/non-food thumbnail, `429` rate/quota limit, `502` invalid upstream response and `503` unavailable configuration/provider.

The endpoint accepts supported HTTPS Facebook video paths only. Redirects and image hosts remain allowlisted through the full fetch chain.
