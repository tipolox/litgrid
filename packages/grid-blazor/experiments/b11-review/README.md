# B1.1 Extra High review corrections: evidence

This isolated folder preserves before/after assertions and final validation.
No previous B1/B1.1 experiment, result or historical report was overwritten.
The decision and corrected behavior are described in
[the review report](../../../../docs/blazor-b11-review-corrections.md).

## Before correction

- `js-before-threads.log`: seven failing actual-grid/DOM JavaScript regressions.
- `browser-before-inference.json`: six failing real Chromium retry checks,
  including an independently asserted inference reversion failure.
- `dotnet-before.log`: two failing prefix-scan/collectibility tests.
- `retention-before.log`: failed overlapping source-retention assertion.
- `types-before.log`: old-shaped implementation rejected with TS2322.
- `schema-transition-before.log`: ten pass/one fail for the additional stale
  programmatic-schema transition.
- `before-source-hashes.json` and ignored `bin/before-assets/`: source provenance
  and original shipping bundle/map copies. The prior published WASM experiment
  is unchanged and served only for pre-fix real-browser reproduction.

`js-before.log` contains a sandbox worker startup timeout, not semantic test
evidence. Reproduction using the threads pool succeeded and produced assertions.

## Final results

- `js-final.log`: **213 tests, 29 files pass**.
- `dotnet-final.log`: **113 Release tests pass**, repeated under updated SDK.
- `types-compatible-final.log`, `types-blazor-final.log`,
  `types-web-validated.log`: successful compiler checks.
- `workspace-build-final.log`: workspace packages/playground build pass.
- `library-build-final.log`, `browser-build-final.log`,
  `server-build-complete.log`: Release builds pass, zero compiler warnings/errors.
- `wasm-publish-complete.log`: final Release non-AOT WASM publish.
- `wasm-retry-complete.json`, `server-retry-complete.json`: **7 checks pass each**.
- `wasm-modes-complete.json`, `server-modes-complete.json`: **58 checks pass each**,
  with real displayed rows, zero unchanged Automatic dataset work and release
  of subscriptions on replacement/disposal.
- `wasm-correctness-complete.json`, `server-correctness-complete.json`:
  **13 preserved B1.1 correctness checks pass each**, zero performance contexts.
- `browser-regression.log`, `browser-regression-repeat-{2,3}.log`,
  `browser-regression-complete.log`: **13 scenarios in each of four fresh runs**,
  **80 large-grid recovery cycles / 240 expected-cell and focus assertions**,
  plus eight wide-grid focus assertions.
- `asset-verification-complete.json`: regenerated JS/map SHA-256 equality across
  shipping files, published WASM, and actual Server HTTP responses; source-map
  source content and emitted optional capability declarations verified.
- `version-validation-final.log`: every package/library remains **1.0.3**.

Earlier intermediate logs/results are retained. The first final WASM rebuild
encountered a machine SDK upgrade from 10.0.401 to 10.0.402 and a missing targeting
pack. Restore resolved it. A running Server locked a build copy target; stopping
the test host resolved the copy failure. SDK 10.0.402 records workload verification
and optional wasm-tools optimization warnings; final correctness publishes pass.

## Reproduce

```powershell
pnpm.cmd exec vitest run --pool=threads --maxWorkers=2
dotnet test packages/grid-blazor/tests/Tipolox.LitGrid.Blazor.Tests.csproj -c Release
pnpm.cmd exec tsc -p packages/grid-web/tests/tsconfig.compatibility.json
pnpm.cmd exec tsc -p packages/grid-blazor/tsconfig.json --noEmit --rootDir .
pnpm.cmd exec tsc -p packages/grid-web/tsconfig.build.json --noEmit
pnpm.cmd build
```

Build/publish the existing B1.1 hosts into new output/intermediate directories.
The final local WASM artifact is `bin/wasm-final/wwwroot`; use the preserved
B1 static server to serve it. Final SDK is 10.0.402; restore targeting packs first,
then pin runtime 8.0.31 during local publish as in the B1.1 instructions.

```powershell
node packages/grid-blazor/experiments/b1-synchronization/serve.mjs packages/grid-blazor/experiments/b11-review/bin/wasm-final/wwwroot 5224
$env:LITGRID_PLAYWRIGHT_MODULE='C:/path/to/node_modules/playwright'
$env:LITGRID_CHROMIUM_PATH='C:/path/to/chrome.exe'
$env:LITGRID_BROWSER_URL='http://127.0.0.1:5224'
$env:LITGRID_REVIEW_OUTPUT='packages/grid-blazor/experiments/b11-review/new-retry.json'
node packages/grid-blazor/experiments/b11-review/retry-browser.mjs
$env:LITGRID_REVIEW_OUTPUT='packages/grid-blazor/experiments/b11-review/new-modes.json'
node packages/grid-blazor/experiments/b11-review/mode-browser.mjs
$env:LITGRID_B11_CONTEXTS='0'
$env:LITGRID_B11_OUTPUT='packages/grid-blazor/experiments/b11-review/new-correctness.json'
node packages/grid-blazor/experiments/b11-automatic/run.mjs
```

Run the same drivers against the Release Server host, served here on port 5223.
The drivers use the external Playwright/Chromium environment variables above,
or installed `playwright` and its default browser when unset. Choose fresh JSON
output paths: drivers refuse overwrites.
The mode matrix starts with eight rows; it is correctness coverage, not a timing
benchmark. No expensive extreme/performance matrices were rerun.

For the existing suite, run the Release browser host on 5186 and the existing
browser driver with external Playwright. Set `LITGRID_KEYBOARD_REPETITIONS=20`
(the default). The local `.private/browser-regression.mjs` launch shim selects
installed Chromium and imports the repository driver; it was not modified.
Leave `LITGRID_BROWSER_STRESS` unset so the extreme combined transfer is skipped.

`verify-assets.mjs` verifies the final shipping files against `bin/wasm-final`
and a Server on 5223. Select a fresh verification filename using
`LITGRID_REVIEW_ASSET_OUTPUT` if rerunning it. Keep hosts stopped during rebuilds
to avoid Windows file locks.

Versions, lockfiles and package dependencies were not edited. No commits, pushes,
PRs, deployment or package/service publication occurred. `.serena/` was untouched.
