# Recipe details and PNG export — QC

Date: 2026-09-27. Scope: saved details, compact result, PNG export.
Fixtures are labelled QC, never presented as a Gemini analysis. No live Gemini call.
Use an isolated local D1 and a synthetic QA account; no production schema changes.

| ID | Scenario / expected result | Local | Production |
| --- | --- | --- | --- |
| QC01 | Demo/result: title, complete ingredients/steps; no subtitle; notes collapsed; mode and warnings retained | Pass | Pending |
| QC02 | Saved recipe: open by action/title, correct content and mode, Saved disabled, return to invoking card, reload preserves stored data | Pass | Pending |
| QC03 | PNG preview + download: 1200px wide, readable Vietnamese, source image, all ingredients/steps/warnings, no action controls | Pass | Pending |
| QC04 | Expired image: visible failure, retry, explicit text-only export, no substitute image | Pass | Pending |
| QC05 | Maximum-length data: 120-char title, 10 ingredients, 8 steps, 6 warnings; last item included, no clipping | Pass | Pending |
| QC06 | Desktop/mobile: no horizontal overflow, usable controls, modal scroll, Escape/close restores focus | Pass | Pending |
| QC07 | Copy correct selected recipe including mode/disclaimer; demo cannot save | Pass | Pending |
| QC08 | API: invalid image URL and cross-origin rejected, anonymous saved data denied, second account isolated | Pass | Pending |
| QC09 | In-flight result cannot overwrite selected saved recipe; save state tied to its original result | Pass | Pending |

Automated regression additionally covers streamed size limits, redirects, active image content,
rate limit, Unicode wrapping, filename normalization, source mode and disclaimer preservation.
PNG is rendered via browser Canvas; preview is the actual downloaded PNG. No new dependency.

## Release evidence

Local QC completed in Chrome on macOS at desktop 1800px and mobile viewport 390 × 844.
PNG demo download verified on disk: 1200 × 1153; long-content preview: 1200 × 5315,
with step 8 and warning 6 visibly present. Expired image retry and explicit text-only
preview verified. Modal Escape restores focus and body scrolling; return restores
focus to the saved card. New fixture result saved through UI and survived reload.

QC08: local API checks returned 400 for unsafe image, 403 cross-origin, 401 anonymous
saved reads, empty list for second account and 404 for cross-owner deletion.
QC09: temporary loopback proxy on port 3002 delayed a synthetic analysis response
four seconds; selecting a saved recipe during that request preserved its display.
Returning to the saved list restored the newly completed analysis; saving it marked
that result as saved. The proxy is ignored test infrastructure, never deployed.

`pnpm verify`: PASS on Node 24.19.0 / pnpm 10.30.3: lint, typecheck, build,
137 unit tests, 6 render tests. No new dependencies or schema migrations.
Build notices about Vinext route classification/debugName predate this release.
Chrome extensions add attributes before hydration in dev; these warnings identify
`cz-shortcut-listen`/`data-pdffiller-skip`, not recipe component mismatches.

Release baseline: Cloudflare Pages production `main`, deployment
`70361224-77fc-4a42-893d-85cd7bbab098` / commit `78fcefc`.
Automatic Git deployments are enabled. Candidate also preserves the existing
local commits `414f65c` (analysis diagnostics) and `b75c7b5` (Cloudflare PBKDF2 cap)
that were ahead of main when this task began.
Production verification pending.
