# LitGrid managed serialization: focused architecture investigation

Date: **13 October 2026 (Asia/Singapore)**. Repository: `D:\Work\litgrid-clean`.
Branch: `feat/blazor-declarative-columns`. Investigation only; versions remain
unchanged. Production code and the previous prototype were not edited.

## Recommendation

**The highest-potential next experiment is application-level WebAssembly AOT,
using the existing ordinary serializer first.** It can accelerate the formatting
and generic serializer loops that remain expensive after metadata is cached or
generated. This is a hypothesis: the matching AOT workload is unavailable here,
so there are **no measured AOT results**.

**The best measured optimization is System.Text.Json's generated serialization
fast path, not generated metadata alone.** On the small wide fixture it reduced
managed serialization by about 20% in the main run, with 10–23% reductions in the
two follow-ups. The narrow fixture improved only about 6% in the main run.
These are exploratory medians, not guarantees. Fast-path allocation volume fell
substantially, but it did not eliminate the dominant wide-model formatting work.

Keep normal reflection-backed interop as the simple default. Do not integrate
the previous cooperative transfer as a speed optimization, build a new binary
format, require AOT, or require consumer-written serializers for v1.1.0.
After AOT attribution, consider an **optional** generated-type-info path only
if a small package-owned transfer experiment demonstrates an end-to-end benefit.
For enterprise data volumes, a future remote virtual data provider has greater
scaling potential because it avoids transferring and duplicating all rows.

## Scope and evidence

The complete [previous report](blazor-performance-prototype.md), its raw outputs,
`CooperativeTransfer.cs`, `Experiment.razor`, and `BusinessModels.cs` were read.
Production inspection covered `DataGrid.razor.cs`, `gridBindings.ts`, `index.ts`,
and column field resolution. New files live exclusively in
[the isolated experiment](../packages/grid-blazor/experiments/serialization-investigation/README.md)
and this report. Existing experiments were preserved.

The previous extreme result remains the only 30,000 x 120 measurement:

| Previously measured stage | Result | Interpretation |
| --- | ---: | --- |
| Original ingestion | 105,770 ms | Includes runtime serialization, dispatch, parse, adoption and deferred rendering |
| Separate warmed serialization probe | 102,913 ms | Strong localization evidence; not an exclusive slice of that invocation |
| JavaScript argument parse | 1,647 ms | About 1.56% of original loading time |
| Cooperative managed encoding | 104,841 ms | Generic encoding remained expensive |
| Cooperative awaited batch time | 76,208 ms / 10,904 batches | Includes dispatch, browser work, timer yields and continuations |
| Cooperative ingestion / maximum timer gap | 182,535 ms / 126 ms | Better responsiveness, worse throughput |
| Original / cooperative managed allocation volume | 668.3 / 338.3 MB | Allocation halved while loading became slower; not peak heap |

The warmed probe must not be subtracted from original ingestion to manufacture
an exact dispatch cost. CPU, GC and interop were not exclusively profiled in that
experiment. Its Server warmed whole-collection probes were 5.61 ms for A and
46.09 ms for B, versus roughly 290 and 2,525 ms in WASM. This approximately
50-fold runtime contrast is contextual evidence, not a controlled AOT comparison.

## New controlled experiments

Release net8.0, SDK 10.0.401, actual browser runtime **.NET 8.0.31**,
System.Text.Json informational version
`8.0.31+1219a42122cf5190c7f512850557e38c422430dc`, Chromium 156.0.8078.4,
same machine as the prior experiment. AOT was unset/disabled.
`RuntimeFeature.IsDynamicCodeCompiled` was false; `IsDynamicCodeSupported` was true.
An IL-interpreter deployment can include Jiterpreter acceleration; this was not
a pure-interpreter/Jiterpreter-disabled comparison.

Fixtures were the unchanged original models: **1,000 x 10** and **300 x 120**.
Wide rows contain **115 decimals**, not 120 arbitrary heterogeneous properties:
114 `BalanceNNN` properties plus inherited `Balance`. D therefore formats
**3.45 million decimal values**. This materially changes the diagnosis.
The narrow fixture also contains dates, Unicode/escaping, double, enum and nulls.
No expensive D rerun was performed.

One excluded warmup per mode and three measured repetitions per fixture, with
rotated mode order. Setup, model construction, metadata/context acquisition,
preallocated buffers, validation and result interop were excluded. Every measured
complete serializer was compared byte-for-byte with ordinary reflection output.
Primitive controls are diagnostics, not complete serializers or semantic claims.

Raw evidence:

- [Main results](../packages/grid-blazor/experiments/serialization-investigation/results.json):
  144 observations, including 36 warmups. All 84 measured complete serializer
  comparisons passed. The runner completed its measurements but failed its final
  error assertion on one unrelated favicon 404; this was fixed afterward.
- [Formatting confirmation](../packages/grid-blazor/experiments/serialization-investigation/formatting-confirmation-results.json):
  successful runner, 28 observations, no browser errors. Its TryFormat checksum
  used decimal arithmetic; use the cleaner isolation below for attribution.
- [Formatting isolation](../packages/grid-blazor/experiments/serialization-investigation/formatting-isolation-results.json):
  successful runner, 28 observations, no browser errors; integer checksum and
  unrelated-converter control.

Times below are medians in milliseconds; parentheses are the three-run min–max.
Allocations are representative warmed current-thread totals, in bytes.
Payloads were 250,440 bytes (narrow array) and 686,254 bytes (wide array).

| Main-run mode | Narrow time | Wide time | Narrow / wide allocations |
| --- | ---: | ---: | ---: |
| Warm reflection, whole array to byte[] | 266.3 (253.7–278.7) | 828.2 (827.7–844.5) | 510,872 / 3,199,488 |
| Fresh options + independent reflection resolver | 276.6 (264.3–308.2) | 949.9 (893.6–978.5) | 572,944 / 3,667,240 |
| Generated metadata only, whole array to byte[] | 288.3 (261.2–291.0) | 826.2 (809.7–826.4) | 510,872 / 3,199,488 |
| Generated fast path, whole array to byte[] | 250.4 (227.4–260.5) | 661.1 (660.6–670.5) | 306,616 / 1,514,432 |
| Warm reflection, whole array to string | 308.0 (301.1–336.5) | 919.5 (915.1–949.4) | 761,312 / 3,885,744 |
| Warm reflection, preallocated whole-array writer | 270.0 (267.6–289.6) | 839.7 (807.2–869.2) | 260,416 / 2,513,216 |
| Warm reflection, per-row calls into same writer | 314.1 (267.2–325.9) | 843.6 (812.5–927.1) | 260,160 / 2,512,960 |
| Generated fast path, preallocated whole-array writer | 230.7 (223.5–249.9) | 673.7 (669.1–711.6) | 56,160 / 828,160 |

These samples are small and somewhat variable. Several differences overlap the
run ranges. Writer-mode buffer creation and final copying are excluded, so their
allocation counts are not whole-operation memory budgets. Allocation counters
include a small amount of measurement bookkeeping. No confidence intervals,
exclusive OS CPU time, GC pause profile, retained heap or process peak were measured.

### Formatting and converter controls

For 300 wide rows, extract the same **34,500 decimal values** before timing:

| Clean isolation mode | Median ms (min–max) | Timed allocated bytes |
| --- | ---: | ---: |
| Complete reflection array | 886.2 (833.1–963.7) | 3,199,488 |
| Complete generated fast array | 683.3 (677.8–689.8) | 1,514,432 |
| Generated context with unrelated Guid converter | 839.4 (821.5–874.7) | 3,199,488 |
| Utf8JsonWriter decimal values, without property names | 543.8 (532.5–549.5) | 828,160 |
| Direct decimal.TryFormat to reused UTF-8 span | 419.4 (418.9–477.1) | 160 |
| Direct decimal.TryFormat to reused character span | 434.9 (421.0–505.3) | 160 |
| Write preformatted raw decimal tokens | 122.9 (122.4–123.7) | 160 |

All measured primitive controls and generated fast-path sections in the clean
isolation recorded zero GC collections. One of the three reflection sections
also recorded none; the other two each recorded one collection. Even a
near-allocation-free formatting loop takes hundreds of milliseconds. This
supports a substantial execution/formatting cost independent of GC pauses.
The main-run decimal-writer median was 531.6 ms against 828.2 ms for complete
reflection encoding: about 64% as much elapsed time for a subset of the work.
This is localization evidence, **not** an additive/exclusive CPU breakdown.

The main-run double-writer control took 862.8 ms for these values, slower than
decimal writing. Decimal-to-double conversion was outside its timer. Neither
that diagnostic nor preformatting is a proposed model conversion or serializer.
Raw-token timing omits formatting and cannot be advertised as a loading speedup.

## Most likely bottleneck and revised assumptions

**Repeated interpreted numeric formatting and generic serialization machinery
are the most likely dominant managed costs for D. Cold reflection metadata
discovery is not the primary explanation.** This is an evidence-supported
diagnosis, not an allocation-stack or sampled managed CPU profile.

System.Text.Json caches contracts and property accessors. Its .NET 8
[resolver implementation](https://github.com/dotnet/runtime/blob/v8.0.31/src/libraries/System.Text.Json/src/System/Text/Json/Serialization/Metadata/DefaultJsonTypeInfoResolver.Helpers.cs)
selects an emit-based cached accessor when dynamic code is supported. This host
reports support, so it would be wrong to assert every property uses
`PropertyInfo.GetValue`. Emitted accessors still execute under the WASM runtime;
they do not provide desktop-JIT-quality optimization. Generated metadata removes
runtime contract discovery but retains generic converter/property traversal.
Its near-identical warm wide time and allocations make it an unlikely large win.

The [decimal writer](https://github.com/dotnet/runtime/blob/v8.0.31/src/libraries/System.Text.Json/src/System/Text/Json/Writer/Utf8JsonWriter.WriteValues.Decimal.cs)
calls Utf8Formatter; its
[generic formatting helper](https://github.com/dotnet/runtime/blob/v8.0.31/src/libraries/System.Private.CoreLib/src/System/Buffers/Text/Utf8Formatter/FormattingHelpers.cs)
dispatches through `IUtf8SpanFormattable`. Writer controls allocated approximately
24 bytes per decimal value, whereas direct decimal.TryFormat allocated almost
nothing. This is consistent with value-type/generic dispatch overhead in this
interpreter. The exact boxing/allocation site remains **unprofiled**. Fast code
still calls the same public decimal writer and therefore retains those costs.

The extreme model is decimal-heavy; do not generalize its precise cost mix to
all consumer models. Narrow-row costs also include string escaping, date/double
formatting and generic dispatch. Nor does `Serialize<T>` automatically select a
compile-time generated serializer: a generic API still uses reflection contracts
unless a generated context/type info is explicitly supplied and eligible.

## Production implications and separation of costs

`DataGrid.OnAfterRenderAsync` sends a dictionary of inputs through ordinary
`IJSObjectReference.InvokeVoidAsync`. `GetGridInputs` inserts the `IEnumerable<TItem>`
into its `data` value; the JavaScript binding assigns received data to the unchanged
grid. There is no production row-by-row custom serializer to optimize away.
Column metadata caches are unrelated to serializing millions of row values.

`OnParametersSet` marks inputs pending even for a same-reference mutable list.
Column-registration-only changes can omit data, but parameter updates can resend
it. Avoiding unnecessary transfers might save entire serializations in some apps;
silently caching by collection reference would break supported in-place mutations.
Any future explicit data-version/refresh contract needs separate API design.

The .NET 8
[JSRuntime source](https://github.com/dotnet/aspnetcore/blob/v8.0.0/src/JSInterop/Microsoft.JSInterop/src/JSRuntime.cs)
creates options once and synchronously serializes the argument array to a string
before dispatch. Options already persist across calls. Its protected options
contain framework converters and are not a normal public per-component
configuration hook. Defining a consumer JsonSerializerContext alone does not
make ordinary grid interop use it.

| Cost | What the evidence establishes |
| --- | --- |
| Managed execution/serialization | Slow without any dataset dispatch in the new probe; generated fast code helps, formatting remains costly |
| Allocation/GC | Fast code lowers allocation 40% narrow / 53% wide; writer reuse lowers copying. Slow no-GC samples show pauses are not the sole cause. Allocation CPU cost can still exist without a collection |
| Interop | New timer excludes dataset interop. Prior tiny byte[] controls do not establish large payload cost. Faster encoding must be tested with actual transport |
| Scheduling | Previous 10,904 acknowledgements/yields added about 76 seconds. New managed sections contain no yields or per-row stopwatch bookkeeping |
| Responsiveness | AOT/fast code shorten a blocking task but do not make it cooperative. No new responsiveness improvement is claimed; the previous 126 ms gap came with slower loading |

Typed envelopes did not materially outperform a production-shaped dictionary in
the new warm reflection controls (wide medians 855.3 vs 844.3 ms). Changing the
input object's shape is not a promising large optimization by itself.

## Alternatives and developer tradeoffs

| Alternative | Evidence / potential | Tradeoff and decision |
| --- | --- | --- |
| Reuse options, JsonTypeInfo and writers | Fresh isolated resolver adds cost; cached and preallocated paths still slow | Essential hygiene, mostly already present. Do not promise a large production speedup |
| Source-generated metadata only | Wide 826 vs 828 ms; same allocations | Helps cold discovery/trimming and known contracts; poor throughput candidate here |
| Generated serialization fast path, with metadata fallback | Wide gain 10–23% across sessions; narrow about 6% in main run | Best measured candidate. Consumer model declarations needed; eligibility and integration matter |
| WebAssembly AOT | Not measured; targets execution cost left by fast code and decimal formatting | Highest next-test upside. Application publish/toolchain choice; larger download, slower builds, possible remaining interpreted paths |
| Whole collection, reusable writer | Comparable wide time; lower copy allocations | Prefer semantic simplicity for throughput. Still monolithic and full-memory unless carefully streamed |
| Per-row serialization | Narrow regression; no material wide advantage | Adds root-call/flush work and changes collection/reference semantics. Useful only if a separately justified scheduling policy needs it |
| Whole-collection async streaming | Not measured | Can preserve more collection semantics and bound transient output. Async alone does not yield browser tasks or remove formatting cost; fast-path eligibility for large streaming payloads must be verified |
| JSON byte[] without thousands of acknowledgements | Not an end-to-end result in this investigation | Removes the managed UTF-16 output and uses framework byte[] support; needs package-owned decode/adopt path, copy/memory testing and unchanged semantics |
| New binary/columnar format or another serializer | No measured advantage here | Requires JS decoder and generic contract mapping; attributes/converters/polymorphism may differ. Schema-once transfer could shrink bytes but does not establish CPU savings. Defer |
| Preformat/cache full datasets | Diagnostic raw tokens are much faster | Merely shifts first-load work; stale data, retained memory and mutation semantics. Not a default solution |
| Remote virtual data provider | No implementation/measurement here | Changes the scaling problem by bounding rows transferred and retained; strategically stronger for enterprise workloads |

The distinction between generated metadata and optimized writing follows
[Microsoft's source-generation modes](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation-modes).
Generation should include metadata fallback. Unsupported options, converters or
contracts can prevent optimized writing; test actual settings. The unrelated
converter control is important because framework interop options contain
converters even when ordinary rows contain no interop references. Copying those
options into a generated context is not a demonstrated fast-path integration.

### Compatibility and ordinary developers

An already-built generic library cannot discover every consumer's model at its
own build time. LitGrid can generate its internal types, but consumers must name
their row, collection and reachable nested/runtime types for generated contracts.
A public optional JsonTypeInfo/resolver hook could accept declarations made by
the normal STJ generator; developers would not write serialization methods or JS.
Unknown models must retain a reflection fallback where the consumer supports it.
Do not add automatic Razor/model discovery tooling for this release.

The default continues to accept ordinary IEnumerable<TItem> with existing behavior.
An optional path would have to preserve camel-case/JsonPropertyName mapping,
ignore rules, enums, dates, decimal numeric output, nested/dictionary/object data,
custom converters and resolvers, polymorphism, collection converters, reference
state, one-shot enumeration, errors and atomic adoption. These were not all tested
here: only the two original concrete models were compared across new serializers.
The prior prototype's compatibility results cannot be inherited by a new transport.

JavaScript number precision limitations remain; do not change decimals to double,
strings or scaled integers as a transparent performance fix. Limiting serialization
to visible columns would change sorting/filtering, exports and row-event data.

WASM AOT is distinct from Native AOT and is not a ban on reflection, but trimming,
metadata preservation and unsupported runtime-only features require consumer
publish tests. Verify non-AOT, trimmed interpreter, AOT, and Server consumers.
Keep Server's ordinary interop default; it has different CPU and network economics.

The [AOT build documentation](https://learn.microsoft.com/en-us/aspnet/core/blazor/webassembly-build-tools-and-aot?view=aspnetcore-8.0)
describes application-level publish compilation and its download-size tradeoff.
`dotnet workload list` here had mobile/MAUI workloads, no `wasm-tools` or
`wasm-tools-net8`. SDK 10 targeting net8 requires the matching older-target
workload. Nothing was installed and no AOT result is claimed.

## Recommended next prototype and decision gates

**First: repeat this isolated serializer probe on matched published interpreter
and AOT artifacts.** No LitGrid transport change. Start with the same 1,000 narrow
and 300 wide rows; compare ordinary reflection, metadata-only and fast generation,
plus decimal writer/TryFormat controls. Hold runtime version, trimming, options,
browser and hardware constant. Record cold boot, compressed download size and
build cost separately from warm serialization. Confirm AOT via publish outputs,
not a Release build label or RuntimeFeature alone. Obtain managed allocation/CPU
profiling where available; do not invent exclusive GC or CPU splits.

Predeclare these investigation gates (policy choices, not measured guarantees):

1. After warmup, collect at least ten rotated repetitions across three fresh
   contexts per fixture. A candidate must improve median managed serialization
   **at least 25% on both fixtures**, with no material regression in tail time or
   compatibility. For a claim of **substantial** reduction, target **at least 50%
   on the wide fixture**. Existing generated fast-path results do not pass the
   broad 25% gate and are not sufficient for a default-path change.
2. If small fixtures pass, validate A (1,000 x 10) and B (10,000 x 10) end-to-end
   with the unchanged public component. Require at least 25% median loading
   improvement and no more than 10% regression on other tested workloads or
   Server. Track timer gaps separately; speed does not establish responsiveness.
3. Only then run D once per matched interpreter/AOT configuration to test the
   specific scaling hypothesis: decimal-heavy managed cost is accelerated,
   without allocation/memory regressions erasing the gain. Do not repeat D for
   an inconclusive small-model optimization. Label single D samples exploratory.
4. Report application download/boot/build overhead and a measured break-even
   number of loads: added cold-start cost divided by per-load saving. AOT can be
   optional even if its first-load tradeoff prevents a universal recommendation.
5. For any later package-owned generated-byte[] candidate, require byte/semantic
   equivalence, no double serialization (do not pass a prebuilt JSON string
   through ordinary string interop), bounded copies, disposal/cancellation/error
   cleanup, one-shot enumeration, and trimming/AOT publish tests. Retain atomic
   data visibility and existing mutable-data behavior. Test old-plus-new dataset
   retention and process/WASM memory, not just sampled JS heap.

If AOT fails these speed gates, document it and preserve the original default.
The next narrow runtime hypothesis would be formatting/value-type dispatch,
including a controlled newer-runtime comparison or package-owned numeric converter
control. The direct-TryFormat result does not prove such a converter would improve
complete encoding: raw writing adds work and converter registration disables the
generated fast path. A custom serialization engine is not the automatic fallback.

A cooperative prototype, if later pursued, needs a separate responsiveness gate:
for example <=100 ms p95 and <=250 ms maximum timer gap on the tested machine,
with <=10% loading regression against its corresponding faster baseline.
These are proposed budgets, not hard scheduling guarantees. Resolve encoding
throughput first instead of tuning thousands of timer acknowledgements now.

## Virtual provider assessment

**Yes: remote, bounded data windows offer more meaningful enterprise scalability
than optimizing complete-dataset transfer.** AOT can reduce per-value CPU, but
still performs O(rows x properties) encoding, transfers all bytes, and retains
the full CLR source plus JS rows. Grid rendering virtualization only bounds DOM
work; local pagination after assigning the complete Data collection does not
reduce this transfer. A provider can reduce initial and ongoing work to a bounded
window and perform sort/filter/search where the data already resides.

Future design must address range requests, total count, stable row IDs, remote
sort/filter semantics, cancellation/versioning of stale responses, bounded cache,
selection across unloaded rows, exports/aggregates, edits and error states.
It must connect to the engine's data/index assumptions rather than masquerade as
a serializer tweak. Preserve the simple in-memory Data API for ordinary apps and
make remote providers opt-in. No provider API was implemented in this task.

## Proposed v1.1.0 release strategy

Ship the existing declarative-column work with its normal API and synchronization
behavior once its own release checks pass. **Do not make a serialization-speed
claim or bundle the slower cooperative prototype.** Keep reflection-backed data
interop and Blazor Server behavior as defaults. Document bounded input windows
and the distinction between rendering virtualization and data virtualization.

Keep this harness and both investigation reports as engineering evidence.
Treat AOT as consumer deployment guidance pending measurements, not a LitGrid
package requirement. Consider an additive generated-type-info option in a later
minor release only after an isolated integration passes the stated gates; otherwise
defer it. Plan the virtual provider as a separate enterprise architecture milestone.

This investigation changed no production files or versions, made no commits or
pushes, and performed no package/site publication. The isolated host builds;
complete-model output comparisons and both focused follow-up runners passed.
No broad production regression suite was rerun because production was unchanged.
`.serena/` was left untouched.
