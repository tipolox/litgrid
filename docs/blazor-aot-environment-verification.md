# Blazor interpreter/AOT comparison: environment verification

Date: **13 October 2026 (Asia/Singapore)**.
Repository: `D:\Work\litgrid-clean`.
Branch verified from `.git/HEAD`: `feat/blazor-declarative-columns`.

## Current decision

**BLOCKED pending explicit approval to install the matching WebAssembly tooling.**
This is an environment blocker, not a measured performance NO-GO. No AOT result,
matched interpreter result, startup/download comparison, or compilation-time
measurement has been produced during this stage. The earlier development-host
measurements cannot substitute for a matched published interpreter baseline.

The user's Stage 1 explicitly requires approval before installing system tooling.
No installation, workload update, package publish or deployment was attempted.

## Verified environment

Read the [serialization investigation](blazor-serialization-investigation.md),
the [experiment README](../packages/grid-blazor/experiments/serialization-investigation/README.md),
and inspect its serializer modes, generated contexts, runner and retained evidence.

| Item | Verified state |
| --- | --- |
| Installed SDKs | 3.1.300, 9.0.102, 9.0.105, 10.0.401 |
| SDK selected in repository | 10.0.401; no root global.json |
| Host | Windows 10.0.26200, win-x64 |
| Workload manifest set | 10.0.400-manifests.63b36e85 |
| Installed workloads | android, ios, maccatalyst, maui-windows |
| WASM workloads | Neither wasm-tools nor wasm-tools-net8 installed |
| Available workload ID | `dotnet workload search wasm` lists wasm-tools-net8 |
| Browser AOT/Emscripten packs | No matching packs found under the installed dotnet packs or local NuGet cache |
| Other AOT compiler tasks | Installed MonoAOTCompiler.Task versions 8.0.12 and 9.0.1; these do not supply a complete browser toolchain |
| Experimental project | Microsoft.NET.Sdk.BlazorWebAssembly; net8.0 |
| Existing project package references | Microsoft.AspNetCore.Components.WebAssembly and DevServer 8.0.0, unchanged |
| Resolved framework/runtime assets | Microsoft.NETCore.App and Mono.browser-wasm 8.0.31 |
| Evaluated Release properties | PublishTrimmed=true; TrimMode=partial; RunAOTCompilation unset |
| Other explicit settings | RuntimeFrameworkVersion, WasmBuildNative, WasmEnableSIMD and WasmEnableThreads unset in the evaluated project; do not interpret unset as a verified runtime value |
| Previous browser evidence | Chromium 156.0.8078.4; .NET 8.0.31; IsDynamicCodeCompiled=false; IsDynamicCodeSupported=true |

Commands used included `dotnet --info`, `dotnet --list-sdks`, `dotnet workload list`,
`dotnet workload search wasm`, and read-only MSBuild property evaluation with
`Configuration=Release`. Existing project.assets.json confirms runtime dependency
versions. Existing raw evidence was read, not modified.

## Exact installation requiring approval

Official workload for **SDK 10 targeting net8.0**: **wasm-tools-net8**.

Proposed command, from this repository with SDK 10.0.401 selected:

```powershell
dotnet workload install wasm-tools-net8 --skip-manifest-update
```

The command installs the workload and its required browser compilation/linking
dependencies into the machine's .NET tooling. It downloads tooling and changes
the development environment. `--skip-manifest-update` avoids refreshing workload
manifests; installed SDKs and LitGrid package versions are not being changed by
the proposal. After installation, verify actual pack/runtime compatibility before
publishing either benchmark artifact. Do not silently substitute a newer runtime
or update other workloads if the installed manifests cannot supply the match.

Microsoft's [WASM build-tools documentation](https://learn.microsoft.com/en-us/aspnet/core/blazor/webassembly-build-tools-and-aot?view=aspnetcore-8.0)
specifies wasm-tools-net8 for SDK 10/net8. The official
[workload-install documentation](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-workload-install)
documents the manifest-skip option. Installation has **not** been authorized or run.

## Matched benchmark plan after authorization

1. Reverify the SDK, toolchain, runtime and effective publish properties. Pin both
   runs to runtime 8.0.31 if the matching toolchain supports it; otherwise report
   the mismatch before making changes or comparing results.
2. Independently publish the existing experimental project twice in Release,
   once with RunAOTCompilation=false and once with true. Use the same explicit
   PublishTrimmed=true/TrimMode=partial policy and distinct outputs/intermediates.
   Keep new artifacts and logs separate from old raw evidence and source inputs.
   Reconcile native relinking, SIMD, exception handling and runtime settings so
   incidental publish differences are recorded rather than misattributed to AOT.
3. Preserve publish logs and resolved configuration. Verify compiler invocations,
   AOT outputs and their inclusion/linking in the final WASM artifact. A Release
   build label or RuntimeFeature flag alone is insufficient.
4. Serve the two published wwwroot artifacts with identical local hosting and
   compression settings. Use the same installed browser and machine. Preserve
   the same models, options, metadata/fast contexts, timer boundaries and output
   equivalence checks in both variants.
5. Use the 1,000 x 10 and 300 x 120 fixtures. Measure reflection-array-bytes,
   metadata-array-bytes, fast-array-bytes, and decimal writer/direct-TryFormat/raw
   token controls. Exclude warmups; target ten post-warmup observations per mode
   per fixture in each of three fresh contexts (30 per comparison cell). Rotate
   mode and artifact order. Record contexts and warmups explicitly.
6. Report median, empirical p95 and maximum latency, allocations and collection
   counts. Capture browser timer gaps/long tasks separately; whole-probe gaps can
   include setup and validation outside the managed serialization timer. Do not
   label them exclusive serializer CPU or GC time.
7. Measure fresh-context startup to readiness with equal cache/network policy,
   artifact file sizes and actual transferred compressed startup resources.
   Record clean publish wall time and AOT compiler-stage timing where available.
   Local cold-cache results are not WAN startup predictions. Do not infer startup
   time from artifact size or compare compressed and uncompressed sizes.
8. Proceed to the existing public-component end-to-end A/B fixtures only if small
   results demonstrate substantial improvement. Do not run D unless those results
   support a specific scaling hypothesis. Source generation and AOT remain
   consumer-application concerns, not automatic LitGrid package optimizations.

The prior investigation's decision gates remain proposed policies, not results:
at least 25% median managed improvement on both fixtures and a 50% wide-fixture
target for a substantial-reduction claim. Any AOT recommendation must also weigh
startup/download/build costs, remaining interpreted paths and published reflection
compatibility. No positive or negative claim about those outcomes is made here.

## Deliverable status and v1.1.0

Environment verification and matched methodology are complete. Interpreter/AOT
measurements, new raw results, reflection-versus-fast comparison under AOT,
responsiveness, startup/download/build tradeoffs and publish compatibility checks
are pending the toolchain installation approval. No new raw benchmark files exist.
The previous raw files remain at their original locations.

There is no new evidence supporting an AOT recommendation for v1.1.0. Preserve
the prior release guidance until matched measurements exist. No production code,
package versions, experimental evidence or `.serena/` files were changed. No
commits, pushes, package publication or deployments were performed.
