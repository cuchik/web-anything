# Dependency review — 2026-09-26

Evidence: `pnpm audit --json`, npm registry version metadata and the checked-in
lockfile. Before updates the registry reported 2 critical, 13 high and 4 moderate
findings; after installation the full audit reported **0** in every category.
Audit results are a point-in-time inventory, not proof that the app is secure or
that each reported package vulnerability is reachable in the deployed Worker.

| Direct package | Before | After |
| --- | --- | --- |
| next / eslint-config-next | 16.3.0 | 16.3.6 |
| vite | 8.2.0 | 8.2.2 |
| vitest | 4.1.10 | 4.1.11 |

Targeted transitive overrides: nanoid 3.3.18, browserslist 4.28.7,
baseline-browser-mapping 2.11.0, sharp 0.35.4, fflate 0.7.5,
image-size 2.0.3, fast-uri 3.1.6 and js-yaml 4.3.2. Existing unrelated overrides
remain. Review and remove an override once its parent dependency fixes the range.
No framework, TypeScript, ESLint or pnpm major upgrade was included.

Primary advisories checked include [Next image optimization](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4)
and [sharp/libheif](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c).
The application uses Vinext/Workers; a finding against Next's Node image optimizer
does not by itself establish remote exploitability on this deployment. It still
warrants using patched dependencies and checking the actual generated Worker.

Install completed using pnpm 10.30.3. The three existing deprecated transitive
packages (`@esbuild-kit/core-utils`, `@esbuild-kit/esm-loader`, `tsconfck`) remain
upstream maintenance concerns, not an automatic production-security failure.
Tests have not been run; dependency compatibility beyond static checks/build is a
release gate, not an inferred pass from the audit.
