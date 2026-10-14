# B1 synchronization validation

Isolated test hosts use the production `DataGrid<T>` with ordinary interop and
the original `AccountRow10` business model. No custom serializer or ingestion
prototype is used. Final performance evidence is `baseline-final-results.json`
and `complete-results.json`; all earlier observations/logs are retained.

The original wrapper is from commit `fb6a9cf69383ac452a5bbb16b896ec07ec3f63d9`.
An ignored `.private/b1-baseline-library` holds its C#/Razor sources and original
shipping JS bundle. `B1LibraryProject` selects this library without reverting
the working implementation. The corrected baseline and after fixtures have the
same Razor bindings. Baseline requested-versioned sessions still use the original
legacy behavior (`supportsRevision=false`); they do not pretend the API existed.

## Publish and serve

On this SDK 10.0.401 installation, restore with its SDK-selected build pack first,
then pin .NET 8.0.31 **during publish**, not restore. Pinning during restore selects
incompatible old build targets and fails to generate `blazor.boot.json`. Local
outputs are ignored test artifacts; nothing is published to a package service.

```powershell
dotnet restore packages/grid-blazor/experiments/b1-synchronization/Host.csproj
dotnet publish packages/grid-blazor/experiments/b1-synchronization/Host.csproj -c Release --no-restore `
  -o packages/grid-blazor/experiments/b1-synchronization/bin/new-after `
  -p:RuntimeFrameworkVersion=8.0.31 -p:PublishTrimmed=true -p:TrimMode=partial `
  -p:RunAOTCompilation=false -p:WasmBuildNative=false `
  -p:EmitCompilerGeneratedFiles=false -p:CompilerGeneratedFilesOutputPath= `
  -p:IntermediateOutputPath=obj/new-after/ -p:OutputPath=bin/new-after/
node packages/grid-blazor/experiments/b1-synchronization/serve.mjs packages/grid-blazor/experiments/b1-synchronization/bin/new-after/wwwroot 5200
```

For the baseline, supply `-p:B1LibraryProject=<absolute original library csproj>`
to **both** restore and publish and choose fresh intermediate/output directories.
Preserve its original shipping bundle. Do not regenerate that bundle with B1 code.

## Run

Use external Playwright and an already installed Chromium. Do not build or run
other browser tests during timed measurements. Use a new output filename; runners
refuse to overwrite existing raw files. The default is three independent browser
contexts for each workload/mode. Model preparation and boot are outside timing;
initial mount has no prior dataset. The JS module is preloaded before timing,
but component import/init calls and first managed serializer use are measured.

```powershell
$env:LITGRID_PLAYWRIGHT_MODULE='C:/path/to/node_modules/playwright'
$env:LITGRID_CHROMIUM_PATH='C:/path/to/chrome.exe'
$env:LITGRID_BROWSER_URL='http://127.0.0.1:5200'
$env:LITGRID_B1_VARIANT='after'
$env:LITGRID_B1_OUTPUT='packages/grid-blazor/experiments/b1-synchronization/new-results.json'
node packages/grid-blazor/experiments/b1-synchronization/run.mjs
# For the five additional correctness scenarios, select a new output and run:
node packages/grid-blazor/experiments/b1-synchronization/correctness.mjs
```

`ObservedRuntime` decorates actual Blazor interop and counts imports, component
sync calls, and payload keys. `ObservedRows` counts serializer enumeration and
row visits without pre-serializing. The browser observes the actual production
data setter for adoption. Completion waits for component synchronization, Lit
`updateComplete`, and two animation frames. A 10 ms heartbeat records gaps;
Long Tasks and cumulative managed allocations are retained. Allocation is not
peak memory; elapsed time is not exclusive serialization CPU. Server allocations
can cross threads and are diagnostic only. Browser-side helper invocations are
excluded from the reported production-wrapper interop call count.

Server circuit services require their concrete runtime type. The Server host
therefore uses `ObservedGrid`, a test-only subclass that changes only the injected
runtime reference before initialization. Rendering, synchronization, public APIs,
and disposal remain inherited from the production component. This avoids changing
the runtime used by Blazor's circuit infrastructure. WASM measurements mount the
ordinary production `DataGrid<T>` directly.

`run.mjs` covers initial mount, unchanged parent updates, item/list mutations,
reference replacement, programmatic column/config/scalar changes, namespace
changes, unannounced mutations, refresh, both revision transitions, and scrolling.
`correctness.mjs` adds declarative child-only updates, namespace persistence,
an actual throwing JavaScript data setter followed by forced-refresh retry,
rapid revisions, and pending-sync disposal/remount. The pending-sync test delay
is test-only and is canceled through the production lifetime token.

## Interactive Server

```powershell
dotnet build packages/grid-blazor/experiments/b1-synchronization/server/ServerHost.csproj -c Release
dotnet run --project packages/grid-blazor/experiments/b1-synchronization/server/ServerHost.csproj -c Release --no-build --urls http://127.0.0.1:5202
```

Set `LITGRID_BROWSER_URL` to that URL, `LITGRID_B1_VARIANT=server`,
`LITGRID_B1_CONTEXTS=1`, and fresh output paths, then run both runners. This is
loopback functional validation, not representative WAN or disconnect profiling.

Final summaries: `node .../summarize.mjs` creates `summary.json` exclusively.
Choose explicit input names to summarize other completed observations.

Earlier files are excluded from the final comparison: first harness runs had
literal scalar/namespace string bindings, and the first refresh test requested
an extra legacy parent rerender. They are retained to explain the corrections.
The standard browser suite also reproduced its previously documented intermittent
large-grid keyboard assertion, then passed all 13 scenarios on retry.
