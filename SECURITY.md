# Security policy

Report vulnerabilities through GitHub's private security advisory flow. Do not open a public issue containing secrets, private URLs, user identity or exploit details.

High-priority areas include SSRF/redirect bypass, D1 ownership bypass, quota abuse, secret exposure, unbounded response bodies, prompt injection that changes product behavior and unsafe third-party image handling.

If a Gemini key may have been exposed, revoke it immediately, create a new key, update hosted secrets and inspect logs/history for reuse.

Dependency vulnerabilities are reviewed manually with `pnpm audit`, after dependency changes and before every release. There is no automated audit in CI and no automated dependency-update bot, so a vulnerable transitive dependency can sit unnoticed between reviews.
