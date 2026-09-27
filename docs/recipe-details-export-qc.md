# Recipe details and PNG export — QC

Date: 2026-09-27. Scope: saved details, compact result, PNG export.
Fixtures are labelled QC, never presented as a Gemini analysis. No live Gemini call.
Use an isolated local D1 and a synthetic QA account; no production schema changes.

| ID | Scenario / expected result | Local | Production |
| --- | --- | --- | --- |
| QC01 | Demo/result: title, complete ingredients/steps; no subtitle; notes collapsed; mode and warnings retained | Pass | Pass |
| QC02 | Saved recipe: open by action/title, correct content and mode, Saved disabled, return to invoking card, reload preserves stored data | Pass | Pass |
| QC03 | PNG preview + download: 1200px wide, readable Vietnamese, source image, all ingredients/steps/warnings, no action controls | Pass | Partial: PNG preview generated; native Save blocked by locked Mac |
| QC04 | Expired image: visible failure, retry, explicit text-only export, no substitute image | Pass | Pass |
| QC05 | Maximum-length data: 120-char title, 10 ingredients, 8 steps, 6 warnings; last item included, no clipping | Pass | Pass |
| QC06 | Desktop/mobile: no horizontal overflow, usable controls, modal scroll, Escape/close restores focus | Pass | Pass |
| QC07 | Copy correct selected recipe including mode/disclaimer; demo cannot save | Pass | Pass |
| QC08 | API: invalid image URL and cross-origin rejected, anonymous saved data denied, second account isolated | Pass | Pass |
| QC09 | In-flight result cannot overwrite selected saved recipe; save state tied to its original result | Pass (delayed success fixture) | Partial: real rejection path passed; delayed success replay local only |

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
Production deployment succeeded at 13:47 Asia/Ho_Chi_Minh, duration 51 seconds.
Commit: `1b07d84cc0a0fdb236fe4ae3bacedc7e1bb7aa1b` on `main` / `origin/main`.
Deployment: `276ade5c-4077-4d8c-8e0d-0c498261492c`.
Canonical URL: https://cookfromvideo.pages.dev
Cloudflare build: Node 22.16.0, pnpm 10.30.3, `pnpm build:pages`, status success.
`pnpm audit` (all dependencies): no known vulnerabilities.

Production manual verification used both the user's existing saved recipe (read-only)
and an isolated synthetic QC account. Chrome and the Codex in-app browser rendered
working PNG previews; real Facebook source image, Vietnamese glyphs, source mode,
all steps and warnings were present. Long fixture produced 1200 × 5315 with step 8
and warning 6 visible. Mobile 390 × 844 had no horizontal overflow. Copy, disabled
Saved state, return focus, Escape, reload persistence and demo save rejection passed.

API checks on the canonical production origin: unsafe image 400; cross-origin 403;
anonymous saved read 401; separate account empty; cross-owner delete 404. An initial
Python default-user-agent request was rejected by Cloudflare (1010); subsequent
standard user-agent API requests reached the application and passed these checks.
No firewall/security setting was changed.

QC03 limitation: clicking the production download reached the OS Save dialog, but
the Mac locked before it could be completed. PNG generation/preview passed; final
production file-on-disk confirmation is pending manual unlock. Local download was
fully completed and inspected (1200 × 1153 PNG). Browser download-event helpers also
could not complete the native download while locked. User was notified to unlock.

QC09 limitation: direct production rejected a non-Facebook URL without Gemini;
opening a saved recipe preserved its contents after that rejection. A successful
analysis response delayed four seconds was tested only through the isolated local
fixture proxy. No successful fresh Gemini request was made on either environment.

Production QA cleanup: all three fixture recipe IDs created by this run were deleted
through the authenticated API (204 each); follow-up list returned zero recipes.
Two synthetic accounts remain because the product has no account deletion API.
The existing user's recipe was not edited or deleted. No production schema,
secret, access-policy or binding changes were made.

Evidence (local, ignored outputs): `outputs/recipe-qc/production-preview.png`,
`production-mobile.png`, `local-mobile.png`, and `rau-cu-ham-kieu-nha.png`.
Post-deploy report edits remain uncommitted so documentation does not trigger a
second deployment. Implementation and pre-deploy QC are committed on main.
