# Blazor cooperative UTF-8 ingestion: attribution and isolated prototype

Date: **13 October 2026 (Asia/Singapore)**. Branch:
`feat/blazor-declarative-columns`; starting commit `fb6a9cf`.
Package versions remain **1.0.3**. Target release discussions concern 1.1.0;
this experiment does not implement that release.

## Decision

**NO-GO for integrating this prototype as a production performance optimization.**
It substantially improves browser scheduling and cancellation, but every measured
WebAssembly workload takes longer to ingest. The extreme D transfer increases
from **105.8 seconds to 182.5 seconds (+72.6%)**. Its maximum timer gap decreases
from **105.8 seconds to 126 ms**. Generic managed encoding still takes approximately
105 seconds, and the many awaited batches add approximately 76 seconds.

The binary approach eliminates the monolithic JavaScript parse and a large
managed string serialization allocation, but it does not eliminate the dominant
generic managed serialization work. There is no demonstrated loading-time
improvement. Local Blazor Server also loads faster through ordinary interop.

Production wrapper, synchronization, grid engine, virtualization, and column APIs
were not changed. Milestone A is preserved in the starting commit. Initially
there were no tracked uncommitted changes; the only untracked entry was
`.serena/`. No direct operations targeted that directory and no onboarding was performed.
No commits, pushes, PRs, releases, deployments, or changes to another repository
were performed. Existing documentation was not overwritten.

## Evidence and repeatability

The test host and fixtures are under
`packages/grid-blazor/tests/browser/Performance/`. Build/run commands and runner
controls are in that directory's [README](../packages/grid-blazor/tests/browser/Performance/README.md).

Retained raw evidence:

- [results.json](../packages/grid-blazor/tests/browser/Performance/results.json):
  the full WebAssembly comparison; A/B/C have two runs per mode, D one per mode.
- [confirmation-results.json](../packages/grid-blazor/tests/browser/Performance/confirmation-results.json):
  repeated C, isolated dispatch controls, semantic and cancellation checks.
- [server-results.json](../packages/grid-blazor/tests/browser/Performance/server-results.json):
  Release Server A/B on loopback, dispatch controls, semantic checks and C cancellation.
- [feedback-results.json](../packages/grid-blazor/tests/browser/Performance/feedback-results.json):
  supplementary controls and a cancellation run with loading-frame observation.
- [loading-feedback.png](../packages/grid-blazor/tests/browser/Performance/loading-feedback.png):
  actual browser capture showing 206 staged rows while the previous sentinel row
  remains visible. Eleven animation-frame callbacks observed loading feedback
  before cancellation completed; the visible dataset still contained one row
  and staging was empty after cancellation.

Machine: Windows `10.0.26200`, AMD Ryzen 5 3550H, 8 logical CPUs, approximately
32.1 GB installed RAM. SDK `10.0.401`, target `net8.0`, Release WebAssembly
interpreter builds, no AOT. Chromium `156.0.8078.4`, headless, viewport 1280×900;
external Playwright and Node `v22.14.0` are **test tooling only**.

Fresh browser contexts isolate each workload/mode. Run 1 is the first transfer
in that context; run 2 is warm. Blazor boot, model construction and grid/schema
preparation are excluded from the ingestion interval. Preparing column keys
serializes one row, so run 1 is **not a completely cold serializer measurement**.
The whole-collection diagnostic serialization runs after legacy ingestion and
is explicitly warm. This distinction also applies to D, which has no warm repeat.

Both modes use identical concrete C# models, rows and serialization settings:
camel-case property naming, case-insensitive reads, depth 32, normal reflection
serialization, default numeric enums unless attributes specify otherwise.
Models contain Unicode, strings, nulls, decimals and dates; the wide model has
ordinary CLR properties, not extension-data dictionaries or handwritten encoders.
Neither mode changes sorting/filtering defaults or the engine. Grid preparation
uses the same explicit schema and retains a one-row sentinel during loading.

These are exploratory individual samples, not confidence intervals or benchmark
guarantees. A desktop unit-test build overlapped part of the initial C experiment;
C was therefore repeated separately. The confirmation also shows substantial
machine variability. No statistical claim relies on the initially overlapping
C sample. D was not repeated: its original ingestion ran once, followed by one
separate attribution serialization probe, and its prototype transfer ran once.

## Measurement boundaries

| Stage | Instrumentation and interpretation |
| --- | --- |
| Managed enumeration | Independent traversal through `IEnumerable<T>` in the diagnostic; prototype times each `MoveNext`. Array creation is excluded. |
| Managed serialization | Independent `JsonSerializer.SerializeToUtf8Bytes` of a `data` envelope after the legacy load; prototype times ordinary generic row serialization and writer flushes. Probe timing is not the exact runtime's internal serialization interval. |
| Interop dispatch | Actual call/acknowledgement elapsed time is recorded. Separate 30-call warmed controls measure empty and 64 KiB optimized byte[] round trips without dataset parsing/rendering/yields. Large legacy serialization and dispatch cannot be exactly separated at the public IJSRuntime boundary. |
| JavaScript parsing | Test-only `JSON.parse` wrapper times large incoming legacy argument JSON. Prototype times each `TextDecoder` and `JSON.parse` separately. The wrapper is restored after each observation. |
| Adoption | Synchronous call to the shipped adapter's `updateInputs`, which sets data on the unchanged grid. |
| Deferred rendering | `grid.updateComplete` plus two animation frames. This includes scheduling/frame waits; it is not an exclusive engine CPU measurement or a full paint profile. |

The legacy endpoint timestamp includes managed serialization, dispatch, and
JavaScript argument parsing. The JSON envelope in the test endpoint contains the
same `data` enumerable; preparation handles the scalar inputs/schema separately.
This reproduces the production transfer mechanism and shipped adoption code,
but is not a complete navigation/boot or public-component lifecycle benchmark.

**CPU limitation:** exclusive operating-system CPU time per stage was not
measured. CDP `Performance.TaskDuration` deltas record renderer main-thread task
elapsed time, which is an activity/CPU proxy, not true process CPU time. Stopwatch
measurements are elapsed active sections, not invented CPU values. Exact large
payload dispatch attribution needs runtime profiling below the public interop
boundary; subtracting the separately warmed serializer probe would be misleading.

Managed allocation counters use `GC.GetAllocatedBytesForCurrentThread`.
WebAssembly is single-threaded here; totals are cumulative allocations, not live
heap/peak memory. Prototype totals include interop and bookkeeping; the separate
encoding counter excludes much of that work. Server continuations may change
threads, so **cross-await Server allocation totals are not reliable and are not
used for conclusions**.

A 10 ms browser interval measures the maximum elapsed timer gap; this includes
timer scheduling delay. Long Tasks entries record tasks at least 50 ms. CDP heap
and backing-storage sizes are sampled before/after each operation. `heapPeak`
in raw results is only the highest opportunistic `performance.memory` sample;
it cannot observe a peak while the browser is blocked and is not a validated
peak-memory measurement. Sampling/report calls and instrumentation add overhead
to both paths. Each observation drains callbacks for 60 ms after recording its
operation time.

## WebAssembly baseline and comparison

Payload sizes below are UTF-8 bytes for the legacy diagnostic `data` envelope,
not wire-byte counts for framework protocol messages.

| Fixture | Rows × properties | Serialized bytes |
| --- | ---: | ---: |
| A | 1,000 × 10 | 250,449 |
| B | 10,000 × 10 | 2,544,189 |
| C | 30,000 × 6 | 4,812,796 |
| D | 30,000 × 120 | 74,141,362 (70.71 MiB) |

All elapsed times and timer gaps in the following table are milliseconds.

| Fixture/run | Legacy load | Prototype load | Legacy max gap | Prototype max gap |
| --- | ---: | ---: | ---: | ---: |
| A first | 443.0 | 771.3 | 427.6 | 74.4 |
| A warm | 364.7 | 733.8 | 353.4 | 26.5 |
| B first | 3,257.1 | 5,245.6 | 3,239.6 | 52.1 |
| B warm | 2,996.0 | 4,713.3 | 2,983.6 | 21.5 |
| C first | 5,592.0 | 9,359.8 | 5,587.8 | 60.5 |
| C warm | 7,342.1 | 9,018.3 | 7,330.2 | 22.0 |
| D first, single run | 105,770.4 | 182,535.0 | 105,753.3 | 126.0 |

Independent C confirmation: legacy first/warm **7,829.0 / 6,029.5 ms**;
prototype **12,059.3 / 14,067.3 ms**. Maximum gaps were legacy
**7,770.6 / 6,018.8 ms**, prototype **66.6 / 42.6 ms**. The absolute times
vary, but the direction of the speed/responsiveness tradeoff is consistent.

### Independent legacy attribution

Times are milliseconds. Serialization is the separate warmed probe; it must not
be added to ingestion time. Pre-endpoint time is inclusive of serialization,
dispatch and parse. C's probe can exceed its original load due to the separate
measurement and system variability.

| Fixture/run | Enumeration probe | Serialization probe | Pre-endpoint | JS parse | Adoption | Deferred render |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A first | 0.6 | 258.2 | 376.9 | 5.3 | 0.1 | 61.0 |
| A warm | 0.3 | 290.4 | 346.8 | 6.9 | 0.1 | 17.1 |
| B first | 3.0 | 2,511.5 | 3,209.0 | 52.2 | 0.6 | 42.0 |
| B warm | 3.3 | 2,524.5 | 2,983.9 | 50.1 | 0.1 | 11.4 |
| C first | 14.2 | 6,161.5 | 5,548.0 | 136.8 | 0.4 | 39.6 |
| C warm | 10.8 | 4,944.6 | 7,330.9 | 219.6 | 0.2 | 10.2 |
| D first | 9.1 | 102,912.7 | 105,737.4 | 1,647.2 | 0.3 | 27.3 |

The measured D JavaScript parse is only approximately **1.56%** of the original
105.8-second load. Adoption and deferred rendering are negligible relative to
managed serialization. The serializer probe is similar in scale to the actual
pre-endpoint delay, identifying serialization as the primary bottleneck without
pretending that the probe is an exact split of the runtime's invocation.

Warmed independent byte[] dispatch control medians (30 calls each):
**0.500 ms for both 0 bytes and 65,536 bytes** in the confirmation run.
These controls exclude dataset JSON parsing, adoption, browser task yields and large
object serialization; they are not an estimate of the entire original transfer.
The supplementary control run is retained separately in `feedback-results.json`.

### Prototype attribution

Encoding/await times are milliseconds. Await includes dispatch, decoding,
parsing, staging, intentional timer yield, and managed continuation scheduling;
parse/decode values overlap that interval and must not be added to it again.

| Fixture/run | Enumeration | Encoding | Batch count | Awaited batch time | Decode | Parse | Deferred render |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A first | 2.5 | 377.2 | 48 | 291.8 | 1.3 | 3.5 | 42.1 |
| A warm | 3.8 | 382.8 | 50 | 278.1 | 1.1 | 2.9 | 29.3 |
| B first | 16.4 | 2,922.4 | 373 | 2,130.0 | 12.6 | 16.2 | 39.5 |
| B warm | 14.4 | 2,687.0 | 344 | 1,867.8 | 7.9 | 14.9 | 24.2 |
| C first | 42.5 | 5,162.6 | 673 | 3,801.7 | 15.0 | 31.5 | 31.2 |
| C warm | 44.2 | 5,020.7 | 658 | 3,635.1 | 12.7 | 29.7 | 18.1 |
| D first | 86.4 | 104,840.6 | 10,904 | 76,207.6 | 338.6 | 512.3 | 30.4 |

D adoption was 0.8 ms. The largest observed batch was only **10,231 bytes**;
the elapsed-work budget triggered well before the 64 KiB target. Its largest
individual parse was **2.7 ms**, versus **1,647.2 ms** for the original parse.
Its total batch payload was 74,152,256 bytes; per-batch brackets add a small
framing overhead. The complete adopted dataset count was checked for every run.

The 8 ms budget is a scheduling target, not a deadline. D still recorded five
Long Tasks of **57, 57, 62, 61 and 76 ms**, compared with one **105,744 ms**
legacy task. Timer gaps can exceed any individual task due to ordering, GC and
runtime continuations. Main-thread TaskDuration was **105,770 ms** for legacy D
and **130,430 ms** for prototype D: total main-thread activity increased while
the work was spread over many smaller tasks.

## Prototype architecture and actual scheduling

`CooperativeTransfer.SendAsync<T>` accepts an ordinary `IEnumerable<T>` and
ordinary `JsonSerializerOptions`. It uses generic System.Text.Json serialization
and a reusable `ArrayBufferWriter<byte>`/`Utf8JsonWriter`. Complete rows are framed
as independently parseable JSON arrays. A batch ends after 64 KiB, 128 rows, or
approximately 8 ms of elapsed managed work, whichever happens first after a row.

Each batch becomes one exact-size `byte[]` and goes through standard optimized
Blazor interop. The browser tests assert receipt as `Uint8Array`, not Base64 or a
JSON number array. The browser decodes/parses only that batch, appends rows to a
private staging array, updates loading text, and awaits `setTimeout(..., 0)`
before acknowledging it. The managed producer awaits the acknowledgement:
**one batch is in flight, with no unbounded transfer queue**.

The timer is a browser task boundary. A plain promise microtask, `Task.Yield`, or
`Task.Run` is not used as a claim of browser responsiveness. Timer clamping,
continuation overhead and repeated framework dispatch are real costs reflected
in the awaited-batch measurements. The raw `progressFrames` field in the earlier
results counts yielded batches; it is not a count of painted animation frames.
Actual loading animation-frame opportunities and a rendered screenshot were
collected separately in the feedback check.

The old dataset stays in the unchanged grid throughout ingestion. Only a
successful final commit calls the existing adapter with the complete staged
array. Row counts are checked during staging; supplementary checks also verify
the old sentinel's value. No partial array is assigned to the engine. The final
commit is the atomic visibility boundary. Cancellation before that boundary
retains the previous dataset; cancellation cannot undo an already committed load.

A managed CancellationToken and the browser cancel flag are checked around
batch boundaries. `finally` releases browser staging on cancellation, a failing
enumerator, a serialization failure or a rejected row. Real UI cancellation was
tested on C. Full-run click-to-report completion was **203.0 ms**, confirmation
**282.2 ms**, feedback check **184.3 ms**; these include Playwright actionability
and the final 60 ms observation drain, not just cancellation-handler latency.
All retained the prior row and released staging. Legacy interop has no equivalent
mid-serialization cancellation point in this experiment.

The prototype rejects rows exceeding 1 MiB before dispatch. This is a **soft
post-serialization limit**: a single large string/converter can allocate or run
for a long time before the check. It is not a hard bounded managed writer.
The ordinary tested models stayed below 11 KiB per transmitted batch. A hard
writer cap and a policy for slow/large rows would be required for production.

The host's JS module is a test asset representing code that a wrapper package
would ship internally. Consumer models need no custom JavaScript, npm, Node,
per-cell calls, or specialized encoders. The prototype is not currently a public
shipping API. Its single staging slot is sufficient for this host; production
would need per-grid sessions, sequence IDs, cancellation/disposal coordination,
and protection against overlapping updates.

## Memory observations

Main-thread activity and cumulative managed allocations for the first transfers
are recorded below. TaskDuration is an elapsed-activity proxy, not OS CPU time;
the C sample retains the concurrency caveat stated above.

| Fixture | Legacy TaskDuration ms | Prototype TaskDuration ms | Legacy allocated bytes | Prototype allocated bytes |
| --- | ---: | ---: | ---: | ---: |
| A | 435.7 | 602.8 | 1,344,136 | 687,440 |
| B | 3,253.4 | 3,837.7 | 16,135,952 | 5,961,192 |
| C | 5,588.0 | 6,798.3 | 31,481,824 | 11,635,200 |
| D | 105,770.0 | 130,430.0 | 668,303,656 | 338,310,880 |

WebAssembly D cumulative managed allocation volume:

| Path | Managed allocations during ingestion | CDP JS heap before | CDP JS heap after |
| --- | ---: | ---: | ---: |
| Legacy | 668,303,656 bytes (637.34 MiB) | 4,458,888 bytes | 69,292,008 bytes (66.08 MiB) |
| Prototype | 338,310,880 bytes (322.64 MiB) | 4,452,156 bytes | 64,533,700 bytes (61.54 MiB) |

Allocation volume approximately halves, while time increases. This does **not**
prove half the peak memory. Source CLR rows and the final JS objects still coexist
in both paths. In a real replacement, the entire old JS dataset also remains
alive until commit; this experiment's old dataset has only one sentinel row, so
it does not measure worst-case old-plus-new retention.

The prototype retains a reusable managed batch buffer and one copied interop
byte array at a time, plus the complete private JS staging array. Transient
decoded strings and parsed batch arrays are eligible for collection after each
append. Legacy D's sampled backing storage changed from 12,258,423 to 74,868,602
bytes; prototype changed from 12,258,427 to 2,126,358 bytes. These observations
are affected by GC and cannot be added to cumulative managed allocations or
interpreted as total process/WASM linear-memory peaks.

The independent D serializer probe allocated 325,502,016 bytes; it was outside
the measured ingestion interval. Browser heap samples do not establish the size
or peak of the managed WASM linear heap. No OS resident-set peak or reliable
Server live-heap peak was measured. Memory-pressure/large-old-dataset testing is
an integration gate, not a completed compatibility claim.

## Serialization compatibility

Eight browser checks passed in both WebAssembly and Server. Supported semantic
checks compare the **actual adopted engine rows** with ordinary Blazor interop
results for the same source, not a simulated JS-only serializer.

| Case | Result and boundary |
| --- | --- |
| Names, `[JsonPropertyName]`, decimal/double/int, numeric enums, nulls, dates, strings, Unicode | Passed against actual ordinary interop using AccountRow10. Normal JS number precision limitations are shared with legacy. |
| Nested objects and dictionaries | Passed, including null/Unicode/object values. |
| Attribute custom value converter | Passed for Currency. |
| Attribute string enum converter | Passed; unannotated enums also retain numeric behavior. |
| Declared polymorphism | Passed for an attributed Party/Customer hierarchy with a type discriminator. Arbitrary undeclared/runtime-only polymorphism is not established. |
| Lazy `IEnumerable<T>` | Passed for a repeatable 257-row generator; the prototype enumerates once. Enumerator failure after staging a batch releases staging and keeps old data. Blocking MoveNext/disposal is not made preemptible. |
| Attribute custom collection converter | Tested and rejected, requiring legacy whole-collection serialization. Row framing cannot preserve a converter that transforms the collection itself. |
| ReferenceHandler.Preserve | Tested and rejected. Cross-row reference state and `$id`/`$ref` semantics require a compatibility path. |
| Oversized row | Tested rejection with staging cleanup and no dataset adoption. The check is after encoding, not a hard allocation limit. |
| Options-registered custom row converters | Generic row serialization accepts options by design; this exact configuration was not separately tested against runtime interop. No blanket compatibility claim. |
| Options-registered custom collection converter | Guard checks converter provenance, but registration-only collection converter variants were not separately tested. Legacy fallback until covered. |
| Extension data, ignore policies, custom metadata resolvers, converter cross-row state, arbitrary object/dynamic rows | Not exhaustively tested. Whole-collection comparison tests are needed before advertising support. Stateful converters may behave differently across calls. |
| AOT/trimming | Not tested. `wasm-tools` is not installed; no AOT or trimmed artifact was built or externally published. Ordinary reflection works in the Release interpreter host. Production needs a trimmed/AOT reflection-enabled consumer test and an optional metadata path, not a mandatory source generator. |

Enumerable materialization, enumeration side effects, collection-level
attributes, reference handling and declared element type are compatibility
decisions, not incidental transport details. The public wrapper would need to
fall back before enumeration/side effects where possible; a failure halfway
through a one-shot enumerable cannot safely be followed by automatic re-enumeration.

## Blazor Server investigation

The dedicated Server host links the same C# experiment/models and serves the same
JS module. It uses ordinary interactive Server components, Release `net8.0`, an
unchanged wrapper reference, in-memory test data-protection keys, and loopback
WebSocket/SignalR transport. It has no npm/Node consumer dependency.

| Fixture/run | Legacy load ms | Prototype load ms | Legacy max gap ms | Prototype max gap ms |
| --- | ---: | ---: | ---: | ---: |
| A first | 101.1 | 138.5 | 58.0 | 41.5 |
| A warm | 35.4 | 70.2 | 21.1 | 17.2 |
| B first | 235.0 | 410.9 | 120.9 | 56.3 |
| B warm | 211.2 | 298.6 | 89.3 | 22.9 |

B warm managed encoding was **64.75 ms**, with **79 batches** and **196.8 ms**
awaited batch time. Server warmed dispatch-control medians were **1.606 ms** for
empty bytes and **3.249 ms** for 64 KiB. Semantic and cleanup tests passed; C UI
cancellation completed in **140.8 ms**, retained the previous row and cleared
staging. Normal byte[] transport reached the browser as Uint8Array.

This establishes functional feasibility for the tested Server cases, not broad
production suitability. Serialization already runs off the browser main thread
in Server, and the strict acknowledgement policy pays network round-trip cost
per batch. WAN latency, reconnect/disconnect, backpressure under congestion,
Server message limits, concurrent circuits, Server C/D loading and process memory
were not measured. Keep ordinary Server interop as the default. A different
Server batching/transport policy would need dedicated evidence.

## Complexity, remaining bottlenecks and next task

The isolated implementation is moderately complex: generic framing, serialization
policy, producer backpressure, browser staging, atomic commit, cancellation,
failure cleanup, interop instrumentation and separate host modes. Production
integration adds materially more lifecycle/compatibility work. Binary transport
alone is not sufficient justification for that maintenance burden.

| Evaluation question | Answer |
| --- | --- |
| Demonstrably faster? | No; slower in every retained workload/mode comparison. |
| Significantly more responsive? | Yes for WebAssembly; gaps shrink by orders of magnitude and real loading/cancel UI works, but deadlines are not guaranteed. |
| Portion of original delay eliminated? | The monolithic parse is removed; D parse total decreases by approximately 1.135 seconds (about 1.07% of original load). End-to-end delay is not eliminated and increases by 76.8 seconds. Managed allocation/string overhead is lower but its exact exclusive time is not isolated. |
| Remaining overhead? | Generic managed encoding, per-row flushing/bookkeeping, approximately 10,900 D interop calls, timer/continuation waits, GC and final full-data retention. |
| Normal generic behavior? | Preserved for the explicitly tested ordinary models, attributes, nested/dictionary values, polymorphism and repeatable lazy sequences. Not all collection/reference/converter behavior. |
| Memory cost? | Full staging plus old data until commit, source CLR rows, temporary buffer/byte[]/strings. Lower measured allocation volume; unknown true process peak and large-old-dataset overhead. |
| Server suitability? | Feasible locally for tested cases; slower, with a round-trip sensitivity that argues against using this policy by default. |
| Integration requirements? | Independent runtime attribution, materially better speed/overhead, strict buffer quotas, serializer compatibility/fallback policy, per-grid session/lifetime/version controls, large-old-data memory tests, cross-browser/AOT/trimming and network Server validation. |

**Proposed next implementation task:** first profile the dominant generic encoder
with the same business models, reusable serializer metadata/writers, and optionally
AOT when the toolchain is available. Keep reflection support as an ordinary consumer
path. Then compare two generic cooperative candidates before changing the wrapper:
(1) a larger adaptive slice
with a browser task scheduler such as MessageChannel to avoid nested timer
clamping and reduce interop calls; (2) System.Text.Json whole-collection streaming
to a bounded asynchronous sink that yields at browser task boundaries, preserving
collection semantics where possible. Investigate whether per-row writer flushes
and instrumentation explain encoding overhead before optimizing them. Neither
alternative is claimed faster without measurements. Reuse identical fixtures,
test one-shot/converter failures, add hard caps and true memory profiling, and
set an explicit responsiveness budget alongside a maximum loading-time regression.

For immediate production needs, document/use server-side paging or bounded data
windows rather than transferring 3.6 million values to a browser. That is a
different data-volume decision, not an equivalent speed benchmark, and does not
justify changing the existing grid engine or API in this task.

## Validation and changed files

Release WebAssembly and Server experimental hosts build successfully. All **68
existing .NET tests** pass. Eight serialization/cleanup checks, full dataset
counts, optimized byte[] transport, cancellation, loading feedback and absence
of unexpected browser errors pass in the retained experiment outputs.

The standard browser runner initially failed its keyboard active-cell assertion
at `tests/browser/run.mjs:251` during the 30,000-row scenario. An isolated copy
of the committed host then passed **all 13 scenarios**, and a retry against the
experimental host also passed **all 13 scenarios**, with no production changes.
This was not reproduced consistently and remains a timing-sensitive validation
observation, not an attributed production regression. Logs are retained in
`.private/performance-{regression,control-regression,regression-retry}.log`.
The extreme legacy browser stress option was not run again.

Modified existing test files:

- `packages/grid-blazor/tests/browser/App.razor`: selects the isolated experiment
  only for `?performance`; ordinary browser fixtures remain available.
- `packages/grid-blazor/tests/browser/BrowserHost.csproj`: excludes the nested
  Server project from WebAssembly compilation/content.

Created experimental files:

- `tests/browser/Performance/{BusinessModels.cs,CooperativeTransfer.cs,Experiment.razor,run.mjs,README.md}`.
- `tests/browser/wwwroot/performance-prototype.js`.
- `tests/browser/Performance/Server/{ServerHost.csproj,Program.cs,App.razor,wwwroot/host.css}`.
- `tests/browser/Performance/{results.json,confirmation-results.json,server-results.json,feedback-results.json,loading-feedback.png}`.
- This new report, `docs/blazor-performance-prototype.md`.

The abbreviated test paths above are relative to `packages/grid-blazor/`.
Ignored `.private/` scratch contains runner logs, a Playwright launch shim,
the loading screenshot source and a committed-host control project. `bin/` and
`obj/` contain local build outputs. These are not package files or production
framework changes.
