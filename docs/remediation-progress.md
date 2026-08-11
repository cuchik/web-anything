# Remediation progress

- [x] Remove silent fallback for real links.
- [x] Block unsafe redirect chains and unbounded reads.
- [x] Migrate to pnpm and reach zero unresolved dependency vulnerabilities. Two high
      advisories on `image-size@2.0.2` have no patched release and are audited as
      unreachable (build-time only, never invoked here) — see `docs/deployment.md`.
- [x] Restore strict typecheck, zero-warning lint, build and tests.
- [x] Add CI and dependency update automation.
- [x] Refactor Facebook, HTTP, AI, schema and error modules.
- [x] Add D1 rate limiting and analysis cache.
- [x] Add AI observations, assumptions, warnings and non-food rejection.
- [x] Make UI claims/actions truthful and accessible.
- [x] Add SIWC-gated D1 saved recipes.
- [x] Add repository docs, `AGENTS.md` and evaluation skill.
- [x] Rotate the previously shared Gemini key (owner completed).
- [x] Configure hosted `USER_ID_PEPPER` and replacement Gemini key (owner completed).
- [x] Adopt the MIT License.
- [x] Push the validated source to GitHub and the Sites source repository.
- [x] Implement Gemini multi-frame video analysis with a truthful thumbnail fallback.
- [x] Deploy the new version with production environment revision 1.
- [x] Extract validated progressive MP4 URLs from public Facebook embedded JSON when Open Graph omits video.
- [ ] Commit, push and deploy the embedded-video extraction release.
