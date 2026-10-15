# B1.1 automatic synchronization validation

Isolated test hosts use the production `DataGrid<Row>` lifecycle, serializer,
semaphore and shipping JavaScript. `ObservedGrid` only decorates the component's
injected runtime, preserving the Interactive Server circuit runtime. Row has ten
serialized business properties and an ignored diagnostic subscription count.
Counted sources observe serialization and subscription enumeration. The browser
observes the actual production `data` setter, not a simulated adoption path.

## Reproduce

```powershell
dotnet restore packages/grid-blazor/experiments/b11-automatic/Host.csproj -p:NuGetAudit=false
dotnet publish packages/grid-blazor/experiments/b11-automatic/Host.csproj -c Release --no-restore `
  -o packages/grid-blazor/experiments/b11-automatic/bin/validated-final `
  -p:RuntimeFrameworkVersion=8.0.31 -p:PublishTrimmed=true -p:TrimMode=partial `
  -p:RunAOTCompilation=false -p:WasmBuildNative=false -p:EmitCompilerGeneratedFiles=false `
  -p:IntermediateOutputPath=obj/validated-final/ -p:OutputPath=bin/validated-final/
node packages/grid-blazor/experiments/b1-synchronization/serve.mjs packages/grid-blazor/experiments/b11-automatic/bin/validated-final/wwwroot 5217
```

Restore with the SDK-selected build pack, then pin .NET 8.0.31 during publish,
as in B1. The local SDK is 10.0.401. Non-AOT published WASM is the primary
performance environment. No builds or other suites run during timed sampling.
The preserved B1 server/runtime instrumentation and static server are reused.

```powershell
$env:LITGRID_PLAYWRIGHT_MODULE='C:/path/to/node_modules/playwright'
$env:LITGRID_CHROMIUM_PATH='C:/path/to/chrome.exe'
$env:LITGRID_BROWSER_URL='http://127.0.0.1:5217'
$env:LITGRID_B11_CONTEXTS='3'
$env:LITGRID_B11_WARM_REFRESHES='3'
$env:LITGRID_B11_OUTPUT='packages/grid-blazor/experiments/b11-automatic/new-wasm-results.json'
node packages/grid-blazor/experiments/b11-automatic/run.mjs
```

The runner uses the external Playwright/Chromium paths above, or installed
`playwright` and its default browser when unset. Outputs are created exclusively and refuse
to overwrite an existing run. Three fresh contexts per workload/source/mode test
1,000 and 10,000 rows, notifying list and observable sources, and Automatic/Legacy.
The module is preloaded before mounting; model preparation is outside timing.
Tracker profiling runs after timed actions, so initial binding has no previous
tracker benchmark. Three matched refreshes after cold initial binding warm both
modes' update paths outside measurements. Completion includes synchronization, `updateComplete`, and two
animation frames. No-op actions include a separate 40 ms quiet validation window
which is excluded from reported elapsed time. Timings are end-to-end observations,
not exclusive serialization CPU or browser paint guarantees.

Counters separate transfers, adoptions, enumerations, visits, and interop calls.
Polling uses an O(1) progress probe. Subscription counters use event accessors
without allocating invocation-list arrays. Isolated tracker profiling reflects
the actual internal tracker only in this test host, with trimming preservation;
it measures synchronous thread allocation, retained managed heap, setup and
disposal while keeping the publisher/tracker alive. Its small residual allocation
includes reflection/diagnostics. It does not measure JS storage or peak heap.

## Interactive Server

```powershell
dotnet restore packages/grid-blazor/experiments/b11-automatic/server/ServerHost.csproj -p:NuGetAudit=false
dotnet build packages/grid-blazor/experiments/b11-automatic/server/ServerHost.csproj -c Release --no-restore
dotnet run --project packages/grid-blazor/experiments/b11-automatic/server/ServerHost.csproj -c Release --no-build --urls http://127.0.0.1:5218
# Run the same runner with URL 5218, CONTEXTS=1, and a fresh output path.
```

This is loopback functional coverage, including a true Task.Run notification on
Server; WASM Task.Run is not evidence of multithreaded WASM. Circuit disconnection
and WAN/device profiling remain separate release QA. The fixture catches the
expected JS refresh exception and returns a diagnostic boolean, allowing retry
validation without enabling detailed Server error disclosure.

## Authoritative evidence

- `wasm-validated-results.json`: final published WASM matrix, 288 observations.
- `server-validated-results.json`: final Server matrix, 96 observations.
- Each also includes 13 additional correctness checks and tracker measurements.
- `validated-summary.json`: medians/ranges derived by `summarize.mjs` from those two files.
- `dotnet-validated-final.log`: 109 passing Release tests.
- `js-complete.log`: 202 passing JavaScript tests.
- `regression-validated-browser.log`: 13 existing browser scenarios, including keyboard,
  accessibility assertions, persistence and large-grid virtualization.
- Build/publish, TypeScript and earlier diagnostic run logs are preserved.

```powershell
$env:LITGRID_B11_SUMMARY='packages/grid-blazor/experiments/b11-automatic/new-summary.json'
node packages/grid-blazor/experiments/b11-automatic/summarize.mjs packages/grid-blazor/experiments/b11-automatic/wasm-validated-results.json packages/grid-blazor/experiments/b11-automatic/server-validated-results.json
```

Earlier runs are not the authoritative performance comparison. Initial restore
failed in the restricted sandbox's separate incomplete NuGet cache; owner-cache
restore succeeded. Parallel builds initially exposed a fixed-wait .NET test and
an existing JS timeout; condition-based waiting and isolated reruns pass. An
equal-row test initially used value equality to check reference membership and
was corrected. The initial Server runner assumed detailed exception text; the
test-only catch fixes that assumption. Earlier subscription probes allocated
`GetInvocationList()` arrays and warmed tracking before initial mount; final
sampling removes those biases and uses incremental observable membership.
Subsequent cold/warm comparisons exposed scratch-table allocation for notifying
plain lists; final reconciliation stages counts in its reused table. Earlier
`measured`, `warmed`, `complete` and `final` result filenames are diagnostic history,
not evidence for the final staged-count implementation.

B1 reports, hosts, raw measurements and experiments are unchanged. Package
versions remain 1.0.3. No service/package publication, commit or push occurred.
