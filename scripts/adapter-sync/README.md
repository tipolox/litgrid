# Default adapter synchronization comparison

Create an unchanged baseline worktree at
`6a0df7b01fd3de0b7e7f5dc386de469f3531d210`. Install the candidate's frozen
lockfile dependencies. Baseline runtime dependencies resolve from that same
installation, so the baseline checkout needs no install.

Provide an existing Playwright Core directory with Chromium installed and an
Angular 22.1.3 `@angular/platform-browser` directory with matching `common` in
its sibling directory. The harness uses candidate Angular core/compiler,
React, Vue, and Lit. It does not modify those external installations.

From the candidate root, with tests/builds and other benchmarks stopped:

```text
node scripts/adapter-sync/browser.mjs <baseline-root> <playwright-core-directory> <angular-platform-browser-directory> <output-directory>/browser.json
node scripts/adapter-sync/summarize.mjs <output-directory>/browser.json <output-directory>/summary.md
node scripts/adapter-sync/browser.mjs <baseline-root> <playwright-core-directory> <angular-platform-browser-directory> <output-directory>/behavior.json --behavior-only
node scripts/external-query-browser-check.mjs <playwright-core-file-url>
```

Ports 5214 and 5178 must be free. Scripts launch local Vite and headless
Chromium and close both. They use fictional data and existing public inputs.
No optimization API, revision counter or synchronization flag is supplied.

The paired run covers each framework/version at 10k/30k/100k rows, with 120
accessor columns over compact keyed rows. Each workload measures unchanged
renders/change detection and unrelated updates with stable/fresh input
references (30 samples each), plus actual configuration changes, immutable
replacements, same-reference edits and schema metadata edits (10 samples each).
That is 2,340 timed updates across 18 baseline/patched workloads.

Fixture/array construction and event-loop yields are outside update timers.
Yields separate updates for PerformanceObserver long-task observation.
Transform timing is injected into both source graphs by the test server;
production files are not instrumented. Setter counters instrument the registered
custom-element constructor, with a mounted-instance identity assertion; a second
module import is not used. CDP task/heap and long-task observations include
surrounding fixture work and do not establish grid-only allocation,
retained leaks or memory savings. The summarizer compacts raw JSON without
dropping numeric samples; inspect its tables or use a JSON viewer.

React uses real StrictMode roots; Vue uses actual reactive props. Angular uses
real JIT bootstrap, public `setInput`, change detection, outputs and destroy.
This source-development matrix does not replace production packaged consumer
or cross-browser testing. Baseline correctness failures are recorded as
controls; candidate failures make the script exit nonzero.

Behavior-only mode checks saved preferences, target namespace defaults,
surviving/removed active columns, local/external inferred shapes and teardown.
`knownLimitations.inferredPersistenceRestored` records the existing unsupported
fresh-mount inferred-persistence case and is outside the supported-case pass
flag. Use explicit schemas for that feature. See
[the milestone report](../../docs/adapter-milestone-a1.md) for interpretation.
