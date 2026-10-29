# Adapter synchronization comparison

Create an unchanged baseline worktree at
`6a0df7b01fd3de0b7e7f5dc386de469f3531d210`. Install the candidate's frozen
lockfile dependencies. Baseline framework/runtime dependencies are deliberately
resolved from that same installation; the baseline checkout needs no install.

Provide an existing Playwright Core directory with Chromium installed, and an
Angular 22.1.3 `@angular/platform-browser` directory with matching `common` in
its sibling directory. The harness uses the candidate's Angular core/compiler,
React, Vue, and Lit. It does not modify those external installations.

From the candidate root, with tests/builds and other benchmarks stopped:

```text
node scripts/adapter-sync/browser.mjs <baseline-root> <playwright-core-directory> <angular-platform-browser-directory> <output-directory>/browser.json
node scripts/adapter-sync/summarize.mjs <output-directory>/browser.json <output-directory>/summary.md
node scripts/adapter-sync/browser.mjs <baseline-root> <playwright-core-directory> <angular-platform-browser-directory> <output-directory>/behavior.json --behavior-only
node scripts/external-query-browser-check.mjs <playwright-core-file-url>
```

Ports 5214 and 5178 must be free. The scripts launch headless Chromium and
local Vite, then close both. They use fictional data and do not dispatch CI,
publish, or contact application services.

The paired run covers each framework, version, 10k/30k/100k rows and
legacy/revision mode. Each grid has 120 columns backed by compact-row
accessors. Timed operations are unrelated updates with stable/fresh references
(30 samples each), replacements, signaled same-reference edits, and metadata
edits (10 each). Fixtures and array construction are outside update timers.
Transform instrumentation is injected into both runtime source graphs by the
test server; production files are not instrumented. CDP task/heap observations
include the surrounding fixture checks and do not measure retained leaks.

The summarizer compacts raw JSON without dropping samples; use its Markdown
tables or a JSON viewer to inspect it.

Angular uses real JIT bootstrap, public `setInput`, change detection, outputs
and destroy. React uses real StrictMode roots; Vue uses real reactive props.
This source-development matrix does not replace production packaged consumer
or cross-browser testing. Baseline correctness failures are recorded as
controls; candidate failures make the script exit nonzero.

Behavior-only mode separately checks saved preferences, target namespace
defaults, surviving/removed active columns, local/external inferred shapes,
and teardown. `knownLimitations.inferredPersistenceRestored` records the
existing unsupported fresh-mount inferred-persistence case and is deliberately
not included in the supported-case pass flag. Use explicit schemas for that
feature. See [the report](../../docs/adapter-milestone-a1.md) for interpretation.
