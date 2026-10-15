# Managed serialization investigation (13 October 2026)

This is isolated test tooling. It links the **unchanged** models from the previous
performance prototype and does not reference or modify production LitGrid code.
Read [the investigation report](../../../../docs/blazor-serialization-investigation.md)
for conclusions and limitations. The previous prototype and its evidence remain intact.

## Run

```powershell
dotnet restore packages/grid-blazor/experiments/serialization-investigation/SerializationInvestigation.csproj
dotnet build packages/grid-blazor/experiments/serialization-investigation/SerializationInvestigation.csproj -c Release --no-restore
dotnet run --project packages/grid-blazor/experiments/serialization-investigation/SerializationInvestigation.csproj -c Release --no-build --urls http://127.0.0.1:5188
```

When NuGet network access is restricted and the packages already exist, the measured
host was restored using the local package cache:

```powershell
$litgridPackageCache = Join-Path $env:USERPROFILE '.nuget/packages'
dotnet restore packages/grid-blazor/experiments/serialization-investigation/SerializationInvestigation.csproj --source $litgridPackageCache --packages $litgridPackageCache -p:NuGetAudit=false --ignore-failed-sources
```

In another terminal, use an external Playwright installation and Chromium:

```powershell
$env:LITGRID_PLAYWRIGHT_MODULE = 'C:/path/to/node_modules/playwright'
$env:LITGRID_CHROMIUM_PATH = 'C:/path/to/chrome.exe'
# Always select a new output filename to preserve previous observations.
$env:LITGRID_SERIALIZATION_OUTPUT = 'packages/grid-blazor/experiments/serialization-investigation/new-results.json'
node packages/grid-blazor/experiments/serialization-investigation/run.mjs
```

Defaults: narrow = 1,000 original AccountRow10 objects; wide = 300 original
AccountRow120 objects. No 30,000 x 120 execution is included.
One warmup per mode is excluded; three measured repetitions rotate mode order.
Fixture construction, context/contract creation, preallocated writer buffers,
primitive extraction/preformatting, byte-equivalence checks, and result interop
are outside the managed timer. Buffer allocation/final copying differ between
byte-returning and preallocated-writer modes, deliberately.

Controls:

- `LITGRID_SERIALIZATION_FIXTURES=wide` or `narrow,wide`.
- `LITGRID_SERIALIZATION_MODES=reflection-array-bytes,fast-array-bytes,...`.
- `LITGRID_BROWSER_URL=http://127.0.0.1:5188`.
- `LITGRID_SERIALIZATION_OUTPUT=...`.

The formatting-isolation run used:

```powershell
$env:LITGRID_SERIALIZATION_FIXTURES = 'wide'
$env:LITGRID_SERIALIZATION_MODES = 'reflection-array-bytes,fast-array-bytes,fast-with-unused-converter,primitive-decimal,primitive-raw-decimal,primitive-decimal-tryformat-utf8,primitive-decimal-tryformat-chars'
$env:LITGRID_SERIALIZATION_OUTPUT = 'packages/grid-blazor/experiments/serialization-investigation/new-formatting-results.json'
node packages/grid-blazor/experiments/serialization-investigation/run.mjs
```

`primitive-double` changes numerical representation and is **only a diagnostic**.
`primitive-raw-decimal` formats all values before timing and is **not a candidate
serializer**. Byte equivalence is checked for complete serializers only; the
primitive modes' `equivalent` field is not a semantic-comparison result.
The unrelated Guid converter is a fast-path eligibility control, never a LitGrid API.

## Retained evidence

- `results.json`: 144 observations (36 warmups, 108 measured). All 84 measured
  complete-serializer samples matched reflection output byte-for-byte. The final
  runner assertion failed because Chromium requested an absent favicon (one 404);
  all measurement loops completed. An inline favicon was subsequently added.
- `formatting-confirmation-results.json`: 28 observations; successful runner,
  no browser errors. The two direct-TryFormat controls also accumulate a decimal
  checksum in this earlier revision, so use the next file for cleaner isolation.
- `formatting-isolation-results.json`: 28 observations; successful runner,
  no browser errors; integer checksum and unrelated-converter control.

The first run predates the extra controls and serializerBuild field. Generated
compiler output under `obj/generated` is inspectable, but not a deliverable source
dependency. `FastContext` emits both metadata and serialization handlers;
`MetadataContext` emits metadata only. Ordinary options are reused. The fresh
options control creates an independent resolver to prevent equivalent-options
cache sharing from concealing contract creation.

The allocation measurement includes small timer/counter bookkeeping. It excludes
setup and post-timer output validation. Counters are current-thread cumulative
allocations and collection counts, not retained heap, peak memory, or GC pause time.

## Future AOT experiment (not executed)

On SDK 10 targeting net8.0, install the matching `wasm-tools-net8` workload in a
suitable test environment. Publish matched interpreter and AOT artifacts:

```powershell
dotnet publish packages/grid-blazor/experiments/serialization-investigation/SerializationInvestigation.csproj -c Release -p:RunAOTCompilation=false -o packages/grid-blazor/experiments/serialization-investigation/artifacts/interpreter
dotnet publish packages/grid-blazor/experiments/serialization-investigation/SerializationInvestigation.csproj -c Release -p:RunAOTCompilation=true -o packages/grid-blazor/experiments/serialization-investigation/artifacts/aot
```

Serve the published `wwwroot` directories with the same static-host/compression
settings. Use new result filenames and record runtime, trimming, download bytes,
boot time, toolchain, and compilation settings. A successful **build** alone does
not demonstrate AOT: AOT happens during **publish**. No AOT tooling was installed
and no AOT artifact was published during this investigation.
