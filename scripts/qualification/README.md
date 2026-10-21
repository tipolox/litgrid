# Reproducing integrated v1.2.0 qualification

Read [the current report](../../docs/release/v1.2.0-qualification.md). Preserve pre-optimization evidence in `docs/release/evidence/v1.2.0`; refreshed evidence goes in `docs/release/evidence/v1.2.0-integrated`.

Use a fresh checkout containing main `dc065d58ca2a7c6b0d99b0676750cfeac7b7800b` plus PR #41's qualification infrastructure, and historical v1.1.0 `b8fe0987c6acd74e76e772ce0e27bdddcf20e750`. Preserve other worktrees. Install frozen dependencies. **Keep package versions unchanged at 1.1.0.** Do not run the version setter, create tags, dispatch release workflows, publish packages or deploy.

This refresh uses Node **22.22.3**, pnpm 10.33.0, TypeScript 6.0.3 and Chromium 156.0.8078.4. Node satisfies Angular 22.1.3's `^22.22.3 || ^24.15.0 || >=26` engine. Windows `npm.cmd`/`pnpm.cmd` can pin an older sibling node.exe; invoke package-manager JavaScript CLI entry points through the selected Node executable when necessary. Record the actual runtime and use `npm install --engine-strict` in fresh consumers.

## Performance

Arguments are absolute paths: `<candidate>` is the fresh integrated checkout, `<v110>` the historical checkout, `<playwright>` the external Playwright package directory. Run one harness at a time with tests/builds/servers stopped. The default keyed workload remains #41's original; optional `legacy` omits rowKey on both versions. Historical v1.1.0 ignores rowKey, so its keyed-configured result has index selection rather than equivalent identity guarantees.

```text
node scripts/qualification/performance.mjs <candidate> <v110> <playwright> <evidence>/keyed-1.json
node scripts/qualification/performance.mjs <candidate> <v110> <playwright> <evidence>/keyed-2.json
node scripts/qualification/performance.mjs <candidate> <v110> <playwright> <evidence>/keyed-3.json
node scripts/qualification/performance.mjs <candidate> <v110> <playwright> <evidence>/legacy-1.json legacy
node scripts/qualification/performance.mjs <candidate> <v110> <playwright> <evidence>/legacy-2.json legacy
node scripts/qualification/performance.mjs <candidate> <v110> <playwright> <evidence>/legacy-3.json legacy
node scripts/qualification/react-performance.mjs <candidate> <v110> <playwright> <evidence>/react-1.json
node scripts/qualification/react-performance.mjs <candidate> <v110> <playwright> <evidence>/react-2.json
node scripts/qualification/react-performance.mjs <candidate> <v110> <playwright> <evidence>/react-3.json
node scripts/qualification/integrated-allocations.mjs <candidate> <v110> <playwright> <evidence>/allocations.json
node scripts/qualification/integrated-interaction.mjs <candidate> <v110> <playwright> <evidence>/first-click.json
node scripts/qualification/integrated-external.mjs <candidate> <playwright> <evidence>/external-keyed.json
node scripts/qualification/summarize-integrated.mjs <evidence>
```

Three alternating 20-sample adoption runs give n=60/version/workload. First ten samples/run/workload/version force GC; the next ten use natural GC. Fixture allocation/imports are outside adoption timers; presentation/scroll/selection/heap are separate observations. React gives n=150 updates/version/case. First-click has n=20/version/workload. External gives n=150 per declared total/key mode with changing identities and GC before each 50-commit batch. Allocation/GC profiling is separate, n=30 per case. Raw JSON is compacted without dropping values; tables retain full ranges and nearest-rank p50/p95.

Remove only the generated `react-performance-fixture.js` and `react-performance.html` from the candidate after sampling. Vite development optimizer/late-update warnings can occur; page errors are checked independently. Frame waits are not pure CPU or compositor paint measurements.

## Tests, types and packages

In the fresh candidate run frozen install, `node scripts/typecheck-contracts.mjs`, all four `packages/grid-web/tests/tsconfig.{compatibility,columnControls,selection,externalQuery}.json` checks, `pnpm test`, `pnpm build`, and Blazor Release tests/build. Record actual broad `tsc --noEmit --pretty false` exit codes/diagnostics before and after builds. `type-audit.mjs` compares old/corrected fixtures under the same compiler; it does not make the root check green.

Pack core/renderer/web/React/Vue from `packages/grid-*`, Angular from `dist/grid-angular`, and NuGet from the Blazor project into a fresh ignored artifact directory. Validate with `node scripts/validate-release-artifacts.mjs 1.1.0 <artifact-root>`. Generate and verify SHA-256 values. These are local unchanged-version archives, not registry publication.

```text
node scripts/qualification/prepare-consumer.mjs <fresh-consumer> <artifact-root>/npm
```

The preparer infers the unchanged archive version. Run supported-Node `npm install --engine-strict --no-audit --no-fund`, strict `tsc -p tsconfig.api.json`, inspect `npm ls`, then `next build` in that consumer. Start production Next on 5314 and development StrictMode on 5316. Next has an isolated Turbopack root; source aliases must not replace installed packages.

```text
node scripts/qualification/prepare-blazor-consumer.mjs <fresh-blazor> <artifact-root>/nuget
```

The Blazor preparer infers the local archive version, uses a fresh per-consumer NuGet cache, and maps Tipolox.LitGrid.Blazor exclusively to the local feed. This prevents an older globally cached 1.1.0 package from substituting for the candidate. `dotnet publish` creates local runnable output only. Serve its DLL from the generated publish directory on 5317. The manifest records paths/version; compare installed static JS with the archive and candidate build.

```text
node scripts/qualification/consumers-browser.mjs <playwright> <production-result.json> http://127.0.0.1:5314 http://127.0.0.1:5317
node scripts/qualification/consumers-browser.mjs <playwright> <strict-result.json> http://localhost:5316 http://127.0.0.1:5317
node scripts/qualification/adapters-browser.mjs <fresh-consumer> <playwright> <adapters-result.json>
node scripts/qualification/selection-browser.mjs <candidate> <playwright>
```

Run the monetary browser harness with `LITGRID_PLAYWRIGHT_MODULE=<playwright>`; external-query takes a Playwright module file URL. Stop only servers started for this qualification. Keyboard/DOM/ARIA checks do not verify spoken screen-reader output or establish WCAG certification. Budgets need separate founder approval and independent review; fitting post-hoc thresholds is not release approval.

`node scripts/qualification/propose-budget.mjs <evidence>` reproduces the descriptive proposed-threshold comparisons. It does not enforce an approved release budget or constitute founder approval.
