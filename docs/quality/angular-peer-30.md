# Angular peer compatibility investigation — Issue #30

**Investigation date:** 2026-11-02 (Asia/Manila). **Repo baseline:** `b6ce2e7f081dfdc22bd6045db6a3887274a8c9fa`. **Tested package:** npm `@tipolox/litgrid-angular@1.2.3`, the current published version.

## Decision

**Published v1.2.3 passed the representative clean-consumer Angular 17–22 matrix.** Do not narrow the `>=17.0.0` Angular peer range on the basis of a build-tool version discrepancy alone. Angular partial compilation is designed for library-to-consumer version skew; actual linker, AOT and runtime behavior must be measured. This validation is not evidence for every historical Angular 17.x patch, every feature, or the unreleased `main` build.

## Reproduction and primary evidence

- [Exact successful six-job GitHub Actions run](https://github.com/tipolox/litgrid/actions/runs/41474499466) on PR #59 head `7d82f7abd7706d7ccc5f178b2e795d8671ddc89a`.
- Runner: `ubuntu-latest`, Google Chrome 156.0.8078.47, Node 20.19.0 for Angular 17–19 and Node 22.22.3 for Angular 20–22.
- Test source: `scripts/compat/angular-consumer-smoke.mjs`, `scripts/compat/angular-browser.cjs`, and `.github/workflows/angular-peer-matrix.yml`.
- Each job creates a fresh Angular CLI application outside the monorepo, installs the published LitGrid v1.2.3 npm package, executes `ng build --configuration production` (production AOT/linker), serves Angular, then runs Chrome to verify actual grid mounting and runtime operation.
- Runtime checks: initial two rows and columns, selection-change output delivery, changed row and column Angular inputs, updated count of three rows, newly added column, and no browser page errors.

## Exact consumer matrix

| Angular | CLI | Core / Compiler CLI | TypeScript | Node | Installer | Production AOT | Chrome runtime |
|---|---|---|---|---|---|---|---|
| 17 | 17.3.17 | 17.3.12 / 17.3.12 | 5.4.5 | 20.19.0 | npm | PASS | PASS |
| 18 | 18.2.21 | 18.2.14 / 18.2.14 | 5.5.4 | 20.19.0 | npm | PASS | PASS |
| 19 | 19.2.27 | 19.2.25 / 19.2.25 | 5.7.3 | 20.19.0 | npm | PASS | PASS |
| 20 | 20.3.42 | 20.3.34 / 20.3.34 | 5.9.3 | 22.22.3 | npm | PASS | PASS |
| 21 | 21.2.29 | 21.2.25 / 21.2.25 | 5.9.3 | 22.22.3 | pnpm 10.33.0 | PASS | PASS |
| 22 | 22.2.5 | 22.2.4 / 22.2.4 | 6.0.3 | 22.22.3 | npm | PASS | PASS |

These are observed installed versions recorded in GitHub logs, not claims that all patches/minors in each major were exercised. The matrix runs the latest matching CLI major, so exact patch versions should be refreshed when repeating the test.

## Harness failures investigated, not product regressions

1. The first run generated absolute temporary fixture directories as relative Angular CLI paths, then failed to find `package.json` before dependency installation. Fixed by running `ng new ... --directory .` inside the temporary directory.
2. Angular 21 on Node 22.22.3 with bundled npm 10.9.8 failed before installing the library with npm Arborist `Cannot read properties of null (reading 'edgesOut')`. Reproduced and isolated; switching that fixture to pnpm 10.33.0 with an explicit fixture `packageManager` allowed installation and all AOT/browser tests to pass. This is not evidence that LitGrid failed on Angular 21.
3. Earlier red matrix runs are kept as historical engineering evidence; the last six-job run is green.

## Source-level context

- `packages/grid-angular/package.json` currently advertises `@angular/core` and `@angular/common` peers `>=17.0.0` and uses Angular 22 compiler tooling.
- `packages/grid-angular/tsconfig.lib.json` sets `angularCompilerOptions.compilationMode = partial`, consistent with [Angular's guidance for published libraries](https://angular.dev/tools/libraries/angular-package-format).
- The Angular wrapper delegates grid state and rendering to the shared Web Component. No Angular peer-policy modification, production source change, published package upgrade, or release was performed in this investigation.

## Limitations and follow-up

- **Published-package matrix:** the six-major suite installs npm v1.2.3; the separate Angular 17/22 packed-current-source suite below tests the unreleased code. Repeat current-source qualification for future release candidates.
- The historical v1.1.0 npm artifact was not independently reconstructed here; v1.2.3 is the relevant presently published baseline.
- Tests cover production build, bootstrap, input synchronization and selection output in Chrome, not server-side rendering, every grid API, all browser engines, every compiler patch, or backward support for all Angular 17–22 subversions.
- Angular 17–19 are outside Angular's current official support window; independently decide whether maintaining that broad LitGrid support contract is strategically desirable. See [Angular release policy](https://angular.dev/reference/releases). Do not silently narrow the published peer range in v1.x.
- Future stable CI could test published packages against the support matrix during release qualification and run a separate packed-`main` subset before release. Retain correct Node and TypeScript versions per [Angular compatibility table](https://angular.dev/reference/versions).

## Current unreleased `main` package qualification

An additional **non-publishing packed-current-source** qualification ran after the published matrix. This builds the current `main` baseline in CI, packs local Core, Renderer, Web, and Angular npm tarballs using the release packaging path (without changing package versions or publishing), installs those tarballs into independent Angular consumer projects, and runs the same AOT + Chrome assertions.

- Source baseline: `b6ce2e7f081dfdc22bd6045db6a3887274a8c9fa` (PR #59 changes only test harness, workflow, and documentation).
- CI workflow run: https://github.com/tipolox/litgrid/actions/runs/41561065498 (PR branch head `ba2fbe05a47c0c2e94237b9528045a2333ad3b0c`).
- Build and pack four current-source packages: **PASS**.
- Angular 17.3.12 / CLI 17.3.17 / TypeScript 5.4.5 / Node 20.19.0: **production AOT and Chrome runtime PASS**.
- Angular 22.2.4 / CLI 22.2.5 / TypeScript 6.0.3 / Node 22.22.3: **production AOT and Chrome runtime PASS**.
- Published v1.2.3 matrix (Angular 17–22): **6/6 PASS** at the same workflow run.

This confirms the current unreleased package builds link and run in both the oldest and newest advertised framework majors in tested configurations. It does not extend validation to each intermediate major for *unreleased* artifacts, nor to Angular SSR or full-grid API coverage. **No product code, version, or peer range changes were required.**

## Workflow placement and cost

The compatibility matrix runs only for changes to `scripts/compat/**` or its workflow and may also be manually dispatched after merge. It is not a replacement for every-PR `Verify`. The packed-current-source subset builds once and shares its artifacts between two consumer jobs, avoiding duplicate package builds.

## Proposed issue disposition

**Current question answered for published v1.2.3 and current-source endpoint consumers:** no verified older-Angular incompatibility. Keep peer range unchanged and retain the matrix as automated smoke evidence. Review draft PR #59 independently; merge only on owner authorization. Any narrower policy or major-version support change requires a separate product decision.
