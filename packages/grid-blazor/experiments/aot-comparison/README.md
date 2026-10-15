# Matched published interpreter/AOT experiment

Date: 13 October 2026. This folder adds isolated tooling and evidence; the existing
`serialization-investigation` project, source models and raw evidence are preserved.
The public host references unchanged LitGrid 1.0.3 source. No package is published.

## Preparation and publishing

The approved command was `dotnet workload install wasm-tools-net8 --skip-manifest-update`.
Free space before installation was C: 96.43 GiB, D: 510.80 GiB. It installed the
8.0.31 WASM SDK, browser runtime/cross compiler, Mono tasks and Emscripten 3.1.34.
The CLI then reconciled existing Visual Studio mobile/MAUI workloads. It was
interrupted to stop that broader operation; additional MAUI/MacCatalyst packs had
already been installed. See `logs/workload-install.log`. The browser packs work,
but this is not a successfully completed workload transaction/registration. Do
not rerun installation automatically as part of this benchmark.

From repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File packages/grid-blazor/experiments/aot-comparison/publish.ps1 interpreter
powershell -NoProfile -ExecutionPolicy Bypass -File packages/grid-blazor/experiments/aot-comparison/publish.ps1 aot
```

The script refuses to overwrite a published artifact or log. Use `-Attempt N`
only after a failed publish that produced no final output. It creates separate
intermediates, generated-file paths, published outputs under ignored `bin/`, logs
and JSON wall-time records. Both variants pin runtime 8.0.31, Release, partial
trimming, and native runtime relinking; AOT is the differing setting. Both use
SIMD and exception handling in their recorded linker commands. Source and
package versions are unchanged. Native relinking itself is not AOT.

Successful main publishes: `publish-interpreter-attempt3.json`, `publish-aot.json`.
Initial interpreter attempts encountered existing generated-file access and path
errors; they are retained, excluded from clean successful publish wall time.
AOT logs contain Mono compiler and LLVM object generation and final linker input
for the app/System.Text.Json/CoreLib. RuntimeFeature.IsDynamicCodeCompiled remains
false even in this AOT artifact; do not use it as sole AOT proof.

## Serve and sample

```powershell
node packages/grid-blazor/experiments/aot-comparison/serve.mjs
# In another terminal, supply external test tooling:
$env:LITGRID_PLAYWRIGHT_MODULE='C:/path/to/node_modules/playwright'
$env:LITGRID_CHROMIUM_PATH='C:/path/to/chrome.exe'
$env:LITGRID_AOT_OUTPUT='packages/grid-blazor/experiments/aot-comparison/new-matched-results.json'
node packages/grid-blazor/experiments/aot-comparison/run.mjs
```

The static server uses the same Brotli/gzip selection, MIME and no-store policy
for both variants. Ports: interpreter 5190, AOT 5191. Fresh browser contexts
are not cold operating-system/file caches. CPU profiling/publish processes must
not run alongside timed sampling.

The runner calls the unchanged Probe.Run. Main run: 3 fresh contexts per fixture
per variant, 1 warmup per mode/context, 10 post-warmup repetitions = 30 samples
per comparison cell. Artifact order alternates by context, mode order rotates.
The two fixtures are original AccountRow10 x 1,000 and AccountRow120 x 300.
All complete serializer outputs are compared byte-for-byte; primitive controls
are diagnostic subsets, not complete serializers. Setup, extraction, preformatting,
output checking and result interop remain outside the managed timer. Browser
heartbeat/long-task measurements cover the complete probe invocation, including
those excluded sections. Startup is navigation to the app's ready callback.

Each output filename must be new; the runner uses exclusive creation. Controls:

- `LITGRID_AOT_CONTEXTS` (default 3), `LITGRID_AOT_REPETITIONS` (default 10).
- `LITGRID_AOT_MODES` (comma-separated Probe mode names).
- `LITGRID_AOT_VARIANTS` (default interpreter,aot).
- `LITGRID_AOT_OUTPUT` (always choose a new filename).

Summarize a newly completed run:

```powershell
node packages/grid-blazor/experiments/aot-comparison/summarize.mjs new-matched-results.json
```

Summaries preserve raw observations. Medians use the average middle pair for even
counts; empirical p95 uses nearest rank. Small-cell tail statistics are exploratory.

## Controlled follow-ups

- `stock-interpreter`: same project/runtime/publish/trimming, WasmBuildNative=false,
  RunAOTCompilation=false. Published stock runtime; no native compiler needed.
- `stock-debug`: same stock publish with BlazorEnableDebugging=true/WasmDebugLevel=-1.
  Its boot manifest confirms -1 rather than 0. This did not recreate the earlier
  development-host slowdown.
- `development`: the untouched previous Release development artifact, served by
  `dotnet run --no-build` at port 5196. It reproduces the historical slower results.
  Its native WASM hash matches the stock published runtime. Development versus
  published hosting/configuration/managed artifacts are different; do not attribute
  the full difference to debugging, trimming or Jiterpreter without isolation.

Serve extras by setting `LITGRID_SERVER_VARIANTS=stock-interpreter,stock-debug`;
ports 5192/5195. Do not start a second server on an already occupied port.
For development use the original project with `--urls http://127.0.0.1:5196`.

Retained controls: `non-aot-runtime-results.json` (15 post-warmup samples/cell),
`debug-level-results.json` (12/cell), `development-host-results.json` (12/cell).
Each uses three contexts per fixture/variant and new output files; summaries
describe comparison variants explicitly. `smoke-results.json` validates the main
artifacts, but is not used in aggregate performance conclusions.

## Public component validation

`public-host` preserves test-model public properties explicitly for trimming;
it does not supply custom serializers, generated contexts, or alternate data
transport. It uses ordinary DataGrid/Data/Columns parameters and standard interop.
Models are prepared outside timing, then loaded through StateHasChanged.
Known trimming preservation here does not prove arbitrary consumer models safe.

Restore its existing dependencies, then publish public-interpreter/public-aot
with the same script. Serve them with `LITGRID_SERVER_VARIANTS=public-interpreter,public-aot`
(5193/5194). Set `LITGRID_PUBLIC_OUTPUT` to a new result path, run `public-run.mjs`,
then pass that file's name to `public-summarize.mjs`. The runner refuses to
overwrite an existing result. Successful evidence is
`public-component-validation-results.json`; the default-name file retains the
earlier zero-sample harness failure.

It verifies new JS array identity through read-only engine inspection, public row
count, IDs/balance/JsonPropertyName, waits
for grid.updateComplete plus two animation frames, records cumulative managed
allocation/collection deltas, timer gaps and long tasks. These are elapsed loads
and activity observations, not exclusive OS CPU, GC pause or peak memory profiles.
Three fresh contexts per variant; one excluded warmup and five measured loads per
fixture/context (15/cell). Fixtures A/B are 1,000/10,000 original ordinary rows.
No 30,000 x 120 run is included.
