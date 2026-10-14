# Blazor serialization: matched interpreter and AOT results

Date: **13 October 2026 (Asia/Singapore)**. Repository: `D:\Work\litgrid-clean`.
Branch: `feat/blazor-declarative-columns`. Experimental benchmark only.
Production LitGrid source and package versions were not changed.

## Decision

**GO: recommend evaluating optional application-level AOT for data-intensive
LitGrid applications. NO-GO: require AOT, classify it as a LitGrid default-path
optimization, or claim it solves standard non-AOT responsiveness.**

AOT improved ordinary reflection-backed serialization **3.77x for 1,000 ordinary
rows** and **2.43x for 300 wide rows**. The unchanged public component loaded
1,000/10,000 ordinary rows **2.41x/2.44x faster**. No generated context, custom
serializer, custom JS transport, or LitGrid API change was supplied to that
component. This establishes an application-compilation benefit for the tested
models, including ordinary business rows, not just a decimal-heavy model.

AOT remained main-thread work. The public 10,000-row maximum timer gap was
**299.8 ms**, versus **755.6 ms** without AOT. Both exceed the previously proposed
250 ms maximum responsiveness budget. AOT must remain optional; acceptable
loading and responsiveness in standard non-AOT WASM remain the primary goal.

There is also a material correction to the historical baseline: the same
unmodified development-host experiment reproduces roughly 248/796 ms reflection
serialization, whereas a standard published non-AOT build takes roughly 50/106 ms
in a paired control. Native relinking and the published debug-level flag alone
do not explain this. Do not use the older development-host results as universal
published-deployment performance or attribute that difference to AOT.

## Environment, installation and AOT proof

Installed SDKs remained 3.1.300, 9.0.102, 9.0.105 and **10.0.401**; the last is
selected. Target **net8.0**; runtime and System.Text.Json build **8.0.31**, same
business-model source, same serializer settings and browser in each matched pair.
The earlier [environment verification](blazor-aot-environment-verification.md)
documents the original missing-toolchain blocker; the user subsequently approved
installation. No SDK or LitGrid package version was changed.

Hardware/browser: Windows 10.0.26200, AMD Ryzen 5 3550H, 8 logical processors,
32,147,910,656 physical-memory bytes; Chromium **156.0.8078.4**, headless,
1280 x 900, external Playwright/Node v22.14.0. No compilation ran during timed
sampling. No other-machine or browser performance claim is made.

Free space was checked first: **C: 96.43 GiB; D: 510.80 GiB**. The approved command:

```powershell
dotnet workload install wasm-tools-net8 --skip-manifest-update
```

It installed 8.0.31 WASM SDK, browser runtime/cross compiler, Mono AOT tasks and
Emscripten **3.1.34** Node/Python/cache/SDK packs. The CLI then reconciled existing
Visual Studio workloads and installed additional MAUI/MacCatalyst packs. It was
interrupted to stop that broader operation. The browser packs were available and
used successfully, but the workload transaction/registration was not completed.
This is an actual environment side effect, not a successful WASM-only installation.
No further installer run or unrelated tooling cleanup was performed. The exact
[installation log](../packages/grid-blazor/experiments/aot-comparison/logs/workload-install.log)
is retained.

Both main builds were independently **published**, not merely built in Release:

- RuntimeFrameworkVersion=8.0.31; PublishTrimmed=true; TrimMode=partial.
- WasmBuildNative=true for both; RunAOTCompilation=false versus true.
- Distinct intermediate/generated-file/output directories; identical SIMD,
  exception handling and native -O2 linking settings in recorded commands.
- Same unchanged experimental project, Probe.Run, models and generated contexts.

Native runtime relinking is not AOT. The AOT
[publish log](../packages/grid-blazor/experiments/aot-comparison/logs/publish-aot.log)
shows Mono/LLVM compilation of 27 assemblies/instantiation units, including
SerializationInvestigation, System.Text.Json and CoreLib. App and JSON `.dll.o`
files appear in the final emcc linker response. The final native WASM is
10,951,269 bytes versus 2,729,187 for the relinked interpreter artifact. The
public-host AOT log similarly includes `Tipolox.LitGrid.Blazor.dll.o`.
**RuntimeFeature.IsDynamicCodeCompiled remained false even in AOT**; that flag
alone would incorrectly reject this verified artifact. IsDynamicCodeSupported
was true. Remaining interpreted/runtime-generated paths are possible.

## Matched methodology and evidence

The [new runner and publishing instructions](../packages/grid-blazor/experiments/aot-comparison/README.md)
document reproducibility. Original experimental source and raw evidence were
preserved. Existing model/options/writer setup and output checks remain outside
the managed elapsed timer. There is no dataset interop or browser task yield
inside that section. These are elapsed active sections, not exclusive OS CPU time.

Main fixtures: **1,000 x AccountRow10** and **300 x AccountRow120**. The latter
contains 115 decimals per row. Both artifacts used camel-case naming, depth 32,
case-insensitive reads, normal enum/date/null/Unicode behavior and the same
metadata-only/default-generation contexts. Complete output bytes were checked
against reflection serialization. Primitive controls are subsets, not substitutes
for complete serializers; raw-token preformatting is excluded from its timer.

Three fresh contexts **per fixture per artifact**, one excluded warmup per mode
per context, ten post-warmup repetitions: **30 measured samples per cell**.
Artifact order alternated and mode order rotated. The main file contains
1,056 observations: 960 measured plus 96 warmups. All **600 measured complete
serializer byte comparisons** passed; the runner recorded no browser errors.

Both published artifacts were served with the same local HTTP MIME, Brotli/gzip
selection and no-store policy. Fresh contexts isolate HTTP caches; they are not
cold operating-system/file caches or representative WAN connections. Startup was
navigation to the app's ready callback; six observations per main artifact.
ResourceTiming encoded/decoded sizes and per-file artifact sizes were retained.

Raw files and derived summaries, under `packages/grid-blazor/experiments/aot-comparison/`:

| Evidence | Purpose |
| --- | --- |
| [matched-results.json](../packages/grid-blazor/experiments/aot-comparison/matched-results.json), [summary](../packages/grid-blazor/experiments/aot-comparison/matched-results-summary.json) | Main published interpreter/AOT matrix |
| [non-aot-runtime-results.json](../packages/grid-blazor/experiments/aot-comparison/non-aot-runtime-results.json), [summary](../packages/grid-blazor/experiments/aot-comparison/non-aot-runtime-results-summary.json) | Stock versus relinked non-AOT; 15 measured samples/cell |
| [debug-level-results.json](../packages/grid-blazor/experiments/aot-comparison/debug-level-results.json), [summary](../packages/grid-blazor/experiments/aot-comparison/debug-level-results-summary.json) | Published debugLevel -1 versus 0; 12/cell |
| [development-host-results.json](../packages/grid-blazor/experiments/aot-comparison/development-host-results.json), [summary](../packages/grid-blazor/experiments/aot-comparison/development-host-results-summary.json) | Existing development artifact versus stock publish; 12/cell |
| [public-component-validation-results.json](../packages/grid-blazor/experiments/aot-comparison/public-component-validation-results.json), [summary](../packages/grid-blazor/experiments/aot-comparison/public-component-validation-results-summary.json) | Unchanged public DataGrid A/B loads; 15/cell |
| [smoke-results.json](../packages/grid-blazor/experiments/aot-comparison/smoke-results.json) | Artifact/output smoke check; excluded from reported aggregates |
| `publish-*.json`, `logs/publish-*.log`, ignored `bin/` outputs | Publish settings, times, warnings, compiler/linker proof and independently published artifacts |

The initial public runner timed out because its observation code read the
write-only `grid.data` property. Its zero-sample file was retained separately.
The corrected runner uses the public row-count API and read-only engine row
inspection, as in the prior prototype. No compiled host or framework code changed
for that correction. Earlier failed publish attempts were also retained, not
included in successful publish-time comparisons.

## Serialization results

Times are median / empirical nearest-rank p95 milliseconds. Thirty post-warmup
samples/cell; tail estimates and single-machine speedups are exploratory.
Allocation columns show median cumulative current-thread bytes, not retained heap
or peak memory. Small counter/timer bookkeeping is included.

| Fixture / serializer | Interpreter ms | AOT ms | Median speedup | Allocated bytes: interpreter / AOT |
| --- | ---: | ---: | ---: | ---: |
| 1,000 x 10, reflection array | 41.85 / 54.30 | 11.10 / 18.70 | **3.77x** | 354,872 / 306,872 |
| 1,000 x 10, generated metadata | 40.90 / 56.30 | 13.85 / 20.20 | 2.95x | 354,872 / 306,872 |
| 1,000 x 10, generated fast path | 42.85 / 60.00 | 6.10 / 10.20 | 7.02x | 274,616 / 250,616 |
| 300 x 120, reflection array | 110.00 / 135.40 | 45.25 / 72.00 | **2.43x** | 3,180,288 / 1,524,288 |
| 300 x 120, generated metadata | 105.65 / 124.60 | 58.50 / 97.60 | 1.81x | 3,180,288 / 1,524,288 |
| 300 x 120, generated fast path | 62.60 / 86.90 | 13.50 / 21.00 | 4.64x | 1,514,432 / 686,432 |

Reflection reduction was **73.5% ordinary / 58.9% wide**, passing the prior small
experiment's 25%-both/50%-wide policy gates. Context medians varied: ordinary
reflection interpreter 39.45–42.10 ms, AOT 10.35–16.60 ms; wide interpreter
101.55–121.65 ms, AOT 40.00–51.05 ms. The direction was consistent across contexts.

Within AOT, fast writing reduced reflection median time another **45.0% ordinary /
70.2% wide**. It offers additional benefit, not a prerequisite for the measured
reflection gain. Metadata-only generation did not improve on reflection in this
warm AOT matrix; it was slower. Do not recommend metadata generation alone as a
throughput solution.

Within standard interpreted publishing, generated fast writing had **no ordinary
row improvement** (42.85 versus 41.85 ms), but reduced wide time **43.1%** in the
main run. The stock control found about **29.4%** wide reduction (69.3 versus
98.2 ms), showing session variability and model dependence. This changes the
earlier simplistic 10–23% characterization: fast generation's benefit depends on
runtime/deployment/workload, and still is not a universal default solution.
Consumer types are not automatically known to a library's source generator.

### Decimal controls: 34,500 values from the wide fixture

| Control | Interpreter median / p95 ms | AOT median / p95 ms | Allocated bytes: interpreter / AOT |
| --- | ---: | ---: | ---: |
| Utf8JsonWriter decimal values | 52.25 / 66.20 | 14.15 / 16.50 | 828,160 / 160 |
| Direct decimal.TryFormat, reused UTF-8 span | 36.05 / 41.10 | 10.90 / 16.50 | 160 / 160 |
| Preformatted raw tokens | 10.85 / 13.50 | 5.50 / 6.90 | 160 / 160 |

AOT improves near-allocation-free formatting too, supporting an execution-cost
benefit independent of GC pauses. It eliminates the writer control's observed
approximately 24 allocated bytes per value. This is consistent with the earlier
generic/value-type-dispatch hypothesis; no allocation stack or exclusive managed
CPU profile was captured, so the exact boxing site is not claimed proven.
These subset times must not be added/subtracted into an exclusive CPU breakdown.
The raw-token result omits formatting and is not a proposed default serializer.

## Important non-AOT baseline correction

The extra controls tested specific hypotheses; no extreme workload was rerun.

| Paired control | Ordinary reflection median ms | Wide reflection median ms | Finding |
| --- | ---: | ---: | --- |
| Stock published / relinked published, both non-AOT | 42.90 / 42.80 | 98.20 / 96.80 | No material throughput difference; native relinking does not explain the large historical gap |
| Debug-enabled / debug-disabled stock publishes | 43.00 / 48.10 | 100.80 / 98.45 | No large debug-flag-only effect; do not blame debugLevel alone |
| Existing Release development host / stock publish | 247.70 / 49.80 | 795.75 / 105.65 | Published configuration/hosting/managed artifacts materially differ; older slow results reproduced |

Stock publishing uses **WasmBuildNative=false, RunAOTCompilation=false** and the
prebuilt runtime; it requires no native runtime compilation. Its native WASM hash
exactly matches the existing development artifact. Both report .NET 8.0.31.
Development is untrimmed/debug-enabled; publishes use partial trimming and different
boot/hosting configuration. The published debug control still has trimmed managed
artifacts. **The individual cause of the development-versus-publish difference
remains unresolved.** Do not call this a proven trimming, hot-reload, debug or
Jiterpreter optimization. A publish/hosting difference is measured; its internal
mechanism is a next profiling question.

Practical implication: establish performance in a real published **non-AOT**
consumer before proposing serialization replacements. The original 102.9-second
D probe remains valid historical development-host evidence, but cannot be
normalized to a published D estimate or used as its measured baseline.

## Public component validation and responsiveness

The small matrix justified a larger representative validation. New test-only
hosts reference existing production DataGrid source/version 1.0.3 and original
AccountRow10 models. No custom serializers, generated contexts or alternate
transport are supplied. Model properties are explicitly preserved for trimming
in the host; this compatibility setup is disclosed rather than assumed universal.

Sources are created outside timing. Load assigns the source through normal Data
parameters/StateHasChanged. Completion checks new adopted array identity,
row count, first/last IDs, balance and JsonPropertyName alias, then waits for
updateComplete and two animation frames. Three fresh contexts per artifact,
one excluded warmup plus five measured loads/fixture/context: **15/cell**.
All 60 measured loads and 12 warmups passed checks, with no browser errors.

| Fixture | Interpreter median / p95 ms | AOT median / p95 ms | Speedup | Maximum timer gap: interpreter / AOT ms |
| --- | ---: | ---: | ---: | ---: |
| A: 1,000 x 10 | 135.7 / 173.6 | 56.4 / 67.8 | **2.41x** | 169.9 / 53.6 |
| B: 10,000 x 10 | 675.1 / 766.4 | 276.2 / 312.2 | **2.44x** | 755.6 / 299.8 |

For 15 samples, nearest-rank p95 is the maximum; it is not a stable production
tail guarantee. A/B managed allocation medians were interpreter 610,512/6,133,992
bytes versus AOT 585,488/5,892,968 bytes. Aggregate collection counts across the
15 measured B loads were 12 versus 6; no exclusive GC pause time was measured.
Long tasks remained: A 12 versus 2; B 11 versus 9 across measured loads.

The main microprobe's timer gaps include setup and output verification; they are
not exact blocking intervals of its isolated serializer timer. The public loads
are the more relevant responsiveness evidence. AOT shortens work but does not
introduce cooperative scheduling or cancellation. **Non-AOT 10,000-row loading
still blocks for hundreds of milliseconds**, so the primary default-experience
goal is not met by recommending AOT.

The 30,000 x 120 fixture was deliberately not run: ordinary A/B already establish
application-level benefit and remaining responsiveness limitations. No D loading
time, D peak memory or enterprise-scale guarantee is extrapolated as a result.

## Startup, download and build tradeoffs

The main artifact includes all benchmark serializers/contexts, so its sizes are
project-specific, not LitGrid package-size overhead. Whole uncompressed wwwroot
sizes exclude `.br`/`.gz` duplicates but include unused assets; startup bytes count
actual encoded resources requested, excluding the small HTML document.

| Main serialization host metric | Interpreter | AOT |
| --- | ---: | ---: |
| Encoded startup resource bytes, median | 2,004,177 (1.91 MiB) | 3,735,576 (3.56 MiB) |
| Decoded startup resource bytes, median | 6,377,583 | 14,606,983 |
| Uncompressed wwwroot artifacts | 8.05 MiB | 15.90 MiB |
| App ready median, six fresh contexts | 1,035.2 ms | 1,234.5 ms |
| Ready min–max | 950.2–1,176.9 ms | 1,084.2–2,281.7 ms |
| Successful independent publish wall time | 106.46 s | 293.87 s |

AOT requested **86.4% more compressed startup resource bytes**, about 1.65 MiB
extra, and added about 199 ms to the observed local median in this host. AOT's
recorded target stages were 36.45 s managed AOT and 110.41 s LLVM assembly-bitcode
compilation, plus 70.41 s linking; the total publish also includes C# compilation,
trimming, compression and copies. Concurrent per-assembly durations are not summed
as wall time. Stock non-AOT publishing took **40.62 s**, much less than the relinked
baseline, with similar serialization throughput.

Public-component startup requested 2,174,484 versus 3,972,023 encoded resource
bytes. Full-grid readiness medians were **2,092.2 versus 2,078.7 ms**, only three
contexts each; ranges overlapped and no meaningful AOT startup improvement or
penalty can be concluded there. Its successful publishes took **125.06 versus
486.76 s**. Build and startup economics vary with the application.

These are local cold-HTTP-cache observations, not bandwidth-constrained first-use
predictions. More downloaded bytes can penalize slower networks; cached repeat
loads have different economics. For the isolated host only, the observed 199 ms
median startup delta divided by warm reflection savings corresponds to roughly
seven ordinary or four wide serializations. This is a calculated illustration,
not a measured complete-application break-even or a WAN recommendation.

## Compatibility and ordinary developer impact

AOT is selected in the **consuming application's publish configuration**. An
ordinary developer can retain the same LitGrid Data/Columns/component API and
normal model classes, obtain the matching tooling, and evaluate RunAOTCompilation.
No custom JS or serialization pipeline is required for the reflection improvement
shown here. AOT does not automatically become a library capability or default.

WASM AOT is not Native AOT and does not eliminate every interpreted path. Validate
trimmed model metadata and actual published consumers. The microhost's generated
contexts root its model properties; the public host uses explicit preservation.
These tested graphs do not prove arbitrary runtime-only consumer types safe.
Nested/dynamic/object graphs, custom converters/resolvers, polymorphism, reference
handling, one-shot enumerables, disposal, browser diversity and Server/network
behavior were not comprehensively retested in this AOT task. Existing semantics
and JS number precision limitations remain; decimal types were not changed.

Generated fast writing requires known model/collection contracts and eligible
options. Generated metadata alone is not the fast path. Ordinary JS interop does
not automatically consume a model's JsonSerializerContext, and framework converter
options can prevent fast writing (the unrelated-converter control retains this
constraint). Do not mandate model discovery tooling or generated contexts for the
default developer experience based on this benchmark.

## Default non-AOT next step and v1.1.0

1. Keep the current reflection-backed public API and use published non-AOT
   consumer benchmarks as the release baseline. Investigate the reproduced
   development/publish discrepancy separately before diagnosing all interpreter
   deployments as the historical slow case.
2. For the next **default responsiveness** prototype, use small published A/B
   fixtures first. Compare a simpler, lower-call-count cooperative policy with
   the unchanged standard path. Adaptive larger batches and a cheap browser-task
   boundary are hypotheses; preserve the existing experiment and collection/
   converter/one-shot semantics. Do not integrate the old 10,904-acknowledgement
   prototype or claim it is faster from these AOT results.
3. Proposed gate: <=100 ms p95 and <=250 ms maximum timer gap with <=10% median
   loading regression, plus actual output and lifecycle compatibility. These are
   engineering budgets, not browser deadlines. If the generic prototype cannot
   meet them, bounded data windows are the simplest supported practical guidance;
   a remote virtual provider remains a separate future scalability project.
4. Keep generated fast writing optional and evidence-driven. Its wide non-AOT
   gain is promising, but ordinary-row benefit was absent and arbitrary consumer
   models are unknown to the library. Do not add a complex mandatory serializer
   integration solely because it benchmarks well under AOT.

For **v1.1.0**, proceed with declarative columns under its existing release checks;
retain standard non-AOT and Server behavior. Document optional AOT with the
measured CPU/load gains, compilation and download tradeoffs, and remaining main-
thread blocking. Make no claim that v1.1.0 itself improves managed serialization
or solves full-dataset responsiveness. AOT is optional deployment guidance,
not a prerequisite for LitGrid consumers or a substitute for the primary default
performance work.

No production files or package versions were modified; the three original
serialization raw-file SHA-256 hashes matched before/after. No commits, pushes, package publication or
deployments were performed. `.serena/` was left untouched. Local dotnet publish
outputs are test artifacts only. No AOT/default optimization was merged into
LitGrid.
