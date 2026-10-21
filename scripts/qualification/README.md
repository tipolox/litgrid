# Reproducing v1.2.0 qualification

Read [the qualification report](../../docs/release/v1.2.0-qualification.md) for baselines, limitations and the current NO-GO. These scripts use fictional rows and local candidate packages. They never create tags or publish packages. Do not invoke the release workflow or registry publication while reproducing qualification.

Use Node satisfying the selected Angular version's engine requirement, pnpm 10.33.0, a .NET 8 SDK where available, and separately installed Playwright/Chromium. Windows PowerShell should use `pnpm.cmd` / `npm.cmd` if unsigned script launchers are blocked. Git ownership checks may require running the authorized Git commands in the user's normal security context; do not edit global ownership policy as part of these scripts.

Create fresh detached checkouts of `206192e999a38c6b944944eabe2724ef4e9f8cef` and `b8fe0987c6acd74e76e772ce0e27bdddcf20e750` in ignored disposable directories. Preserve existing worktrees. Apply only the reviewed qualification fixture/harness changes to the candidate. Install both with `pnpm install --frozen-lockfile`. In the candidate run all tests and standard builds, then the explicit Blazor Release tests/build recorded in the report. Run `node scripts/typecheck-contracts.mjs` from the reviewed qualification tree with its frozen dependencies.

In the **disposable candidate only**, run `node scripts/set-version.mjs 1.2.0`, then rebuild. Pack core, renderer, web, React and Vue using `pnpm --dir packages/<package> pack --pack-destination <absolute-npm-artifact-directory>`. Pack Angular from `dist/grid-angular`. Run `dotnet pack packages/grid-blazor/src/Tipolox.LitGrid.Blazor.csproj -c Release --output <absolute-nuget-artifact-directory>`. Validate with `node scripts/validate-release-artifacts.mjs 1.2.0 <artifact-root>`, whose children are `npm` and `nuget`. No tracked qualification versions should change.

From the repository root, with paths adjusted to your local tool installation:

```text
node scripts/qualification/prepare-consumer.mjs .private/v120-consumer .private/v120-artifacts/npm
```

In that fresh consumer run `npm install --no-audit --no-fund`, `node node_modules/typescript/bin/tsc -p tsconfig.api.json`, and `npm run build`. Start production Next on port 5204 with `node node_modules/next/dist/bin/next start -p 5204`. For StrictMode start `next dev -p 5206` and use its declared `http://localhost:5206` origin. Do not inherit repository source aliases: the preparation script sets an isolated Turbopack root and jsconfig.

Prepare a fresh .NET consumer with `node scripts/qualification/prepare-blazor-consumer.mjs .private/v120-blazor-consumer .private/v120-artifacts/nuget`. From its `publish` directory run `dotnet <generated-project-name>.dll --urls http://127.0.0.1:5207`. This serves local production static assets, not build-only production output without static-asset activation.

```text
node scripts/qualification/consumers-browser.mjs <playwright-directory> <result.json> http://127.0.0.1:5204 http://127.0.0.1:5207
node scripts/qualification/consumers-browser.mjs <playwright-directory> <strict-result.json> http://localhost:5206 http://127.0.0.1:5207
node scripts/qualification/adapters-browser.mjs .private/v120-consumer <playwright-directory> <adapters-result.json>
node scripts/qualification/selection-browser.mjs .private/v120-candidate <playwright-directory>
node scripts/qualification/performance.mjs .private/v120-candidate .private/v110-baseline <playwright-directory> <performance-result.json>
node scripts/qualification/react-performance.mjs .private/v120-candidate .private/v110-baseline <playwright-directory> <react-performance-result.json>
```

The external-query browser harness takes a Playwright **module file URL** as its first argument. The monetary harness uses `LITGRID_PLAYWRIGHT_MODULE=<playwright-directory>`. Run those from the candidate root; see their file headers. Stop other test/compiler workloads before performance sampling, alternate runs on identical equipment and preserve raw samples. The performance harness includes keyed/unkeyed core controls and CPU profile summaries, without changing source algorithms.

`node scripts/qualification/type-audit.mjs <output.json>` compares original and corrected fixtures under the same installed compiler/dependencies. It intentionally reports the broad root failures. Run actual `pnpm exec tsc --noEmit --pretty false` separately and preserve its nonzero exit and raw output. The consumer API fixture is a template copied into the isolated consumer, where it is compiled against installed declarations; it is not a source-import test.

`collect-evidence.mjs` and `summarize-performance.mjs` collect the run's named `.private/v120-*` files into the documented evidence directory; they support Windows UTF-16 command logs. They do not assert that missing checks passed. Review every result and the exact artifact hashes. A successful browser/DOM run is not a screen-reader smoke test or a WCAG claim.
