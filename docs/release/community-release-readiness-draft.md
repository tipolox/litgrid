# Community Edition release readiness — draft

**Recommendation: NO-GO for release pending qualification and architect review.** This is a draft, not a release authorization.

Base under review: `bfa3ee8dcab77c25e536cea9be4ea3774c23b132` (main); last published tag: `v1.2.3` at `6a0df7b01fd3de0b7e7f5dc386de469f3531d210`. The comparison contains nine commits. **1.3.0 is blocked** by source compatibility breaks in exported structural types. Resolve the breaks and rerun compatibility checks before recommending a minor version; if retained as public breaking changes, strict SemVer points to 2.0.0. No version has been changed.

## Draft changelog and release notes

- Improve React, Vue and Angular adapter synchronization and state preservation (A1, #55); strengthen public contract and TypeScript checks (A2/A2.1, #56 and #58).
- Add Angular 17–22 compatibility qualification (#59).
- Optimize verified index reuse (A3, #61).
- Add full, row, batch and displayed-range targeted refresh APIs (B1, #64).
- Add opt-in typed columns (#32, #65), Vue declarative columns (#33, #66), and column alignment across frameworks (#34A, #69).

Upgrade the six coordinated npm packages and the Blazor NuGet package together where applicable. The first `yc-grid` custom-element registration on a page wins; rebuild consumers and update deployed assets and caches together. These notes are provisional until package and consumer validation is complete.

**Performance risk:** PR #69 merged under a founder-directed exception accepting performance uncertainty. Alignment performance is not qualified; no performance equivalence or independent-host certification is claimed. See [PR #69](https://github.com/tipolox/litgrid/pull/69) and [qualification](../column-alignment-qualification.md). The latter records the pre-merge engineering recommendation and is historical, not the final merge decision.

## Evidence and outstanding gates

- Main was identical to the stated base and PR #70 head was `072b5612f7ee8c89e827249ab73b17217b73d32e` when reconciled. Recheck the eventual release commit and CI.
- [Main Verify 42963970704](https://github.com/tipolox/litgrid/actions/runs/42963970704) and [PR #70 Verify 42966301383](https://github.com/tipolox/litgrid/actions/runs/42966301383) succeeded. Each reported 449 JavaScript tests in 54 files and 137 Blazor tests, plus builds; full authored TypeScript and ownership, public API and adapter fixtures, built declarations and framework integration checks; strict Angular typed-column and Vue declarative-column templates; Chromium framework event lifecycles, Vue columns, alignment geometry and recovery; and a real Blazor browser alignment consumer and Chromium lifecycle check. These results supersede the earlier statement that all JS, Blazor and browser gates were unexecuted. They do not establish packed-artifact consumer qualification.
- PR #69 head `180ac15b933361b405efe39b09d4284eace0c423` also passed [Verify](https://github.com/tipolox/litgrid/actions/runs/42802268363), [B1 browser qualification](https://github.com/tipolox/litgrid/actions/runs/42802268466), and [external-query visual regression](https://github.com/tipolox/litgrid/actions/runs/42802268270).
- Still open: complete the public API and documentation audit, assess framework versions outside the bounded consumer matrix, and qualify the final versioned release artifacts and commit before changing the release recommendation.

## Completed technical rehearsal

[Manual release rehearsal 43004797435](https://github.com/tipolox/litgrid/actions/runs/43004797435) succeeded on main commit `bfa3ee8dcab77c25e536cea9be4ea3774c23b132`, with input version 1.2.3. The validation job packed core, renderer, web, React, Vue and Angular npm tarballs and `Tipolox.LitGrid.Blazor` NuGet; artifact validation passed, a clean Blazor template installed the local NuGet package and built, and a SHA-256 manifest was generated and uploaded. Registry preflight, publishing and GitHub release jobs were skipped. The uploaded archive digest reported by GitHub is `sha256:2d6a345446a9d406842860f14a1ad99ae310626e0a6f8d21ef9cea9ef46fbbc0`; this is the archive digest, not the individual package checksums. [Integrity run 43006882787](https://github.com/tipolox/litgrid/actions/runs/43006882787) downloaded that exact archive, checked the counts and independently verified every file against its manifest. SHA-256 values:

```text
d12fdfc24499c992a35d2893e37e3511d5fb300e9d228532dbad8ac55faa3bc4  npm/tipolox-litgrid-angular-1.2.3.tgz
882bf47f0ee1c96343eb002570740690ec7ab55d5fda0f3ecbd6411563040e5c  npm/tipolox-litgrid-core-1.2.3.tgz
3a45f932554c9c7e905ba817670966714149ecbfd575cb8260fe62abd0a41e68  npm/tipolox-litgrid-react-1.2.3.tgz
0c4a4d1f6b6b3407296da025fd9f3b12d4cf1e15f65944a65dc8a1d361caf945  npm/tipolox-litgrid-renderer-1.2.3.tgz
77af28d7b950a7f028f4b708db48c60027a9585f1a33bea651a90bcecfdc8a29  npm/tipolox-litgrid-vue-1.2.3.tgz
8b7fda58ec6f96e92597aa6edd072a3816b97234e0cf958b336a972940da3642  npm/tipolox-litgrid-web-1.2.3.tgz
d18be38798df39ca22760ece69611afcdbcf1f209f6ada09cb491fbcc2f1c4e9  nuget/Tipolox.LitGrid.Blazor.1.2.3.nupkg
```

These 1.2.3-labeled artifacts contain newer source. They are technical test artifacts, not valid published 1.2.3 packages or qualified 1.3.0 candidates. The final versioned release artifacts require separate qualification.

## Packed consumer execution

[Qualification run 43017915381](https://github.com/tipolox/litgrid/actions/runs/43017915381) passed all jobs. The runner checked out PR test merge `08ed5aba09f1c7184ca6a9dee1ae1b534623216e` (head `05521e4903ee353e237726137d7f23eca7b9a6d3` into main `bfa3ee8dcab77c25e536cea9be4ea3774c23b132`). Packages came from rehearsal run 43004797435, not this test merge; all seven hashes above were verified before use.

- **Web Components:** isolated Vite 8.0.8 build and Chromium rendering, typed `GridColumn<Row>`, alignment class and B1 `refreshRow` after an in-place edit passed.
- **Vue 3.5.32:** isolated Vite build and Chromium declarative-column rendering, alignment class and dynamic column lifecycle passed.
- **React 19.2.5 / Next.js 16.4.2:** strict public declaration checks, production build and Chromium integration, external query and lifecycle checks passed.
- **Angular 17 and 22:** clean CLI consumers passed AOT production builds and Chromium lifecycle smoke checks, on Node 20.19.0 and 22.22.3 respectively. These are boundary versions, not proof for every supported version or every new API.
- **Blazor .NET 8:** a clean local-NuGet consumer built and ran actual components in Chromium; query callback, alignment and `RefreshRowAsync` passed.

The npm lockfile check rejected workspace links, registry resolutions, duplicate nested LitGrid copies and unexpected LitGrid packages. Job logs record each direct `file:` archive resolution. Blazor used an isolated NuGet cache and package-source mapping for the local candidate. Node 22.22.3 was used for Web, Vue, React and Blazor. The test covers selected integrations and Chromium, not all framework versions, browsers or performance equivalence.

The first React/Blazor run exposed an obsolete external-search menu expectation; the fixture was corrected. The first Web/Vue runs exposed an optional structural API type and an incorrect Vite preview directory; the harness was corrected. No production behavior was changed.

**Packed-consumer result: PASS for these bounded configurations; release NO-GO** pending resolution of the structural type compatibility break, architect review, and qualification of the final versioned artifacts. The rehearsal packages are not publication candidates. PR #69's accepted performance uncertainty remains unchanged.


## API and compatibility audit (v1.2.3 → pinned main)

**NO-GO for preparing 1.3.0 as a compatible minor release until the structural-type breaks are resolved.** The factory-created grid and component refs gain useful methods, but TypeScript consumers may implement exported structural types in adapters, test doubles or mocks:

- `@tipolox/litgrid-core` exports `GridEngine`. Main adds required `refreshData` and `getDisplayedRowIndexForKey`; an otherwise valid v1.2.3 implementation of `GridEngine` no longer satisfies that type.
- React exports `DataGridRef` and its `DataGridInstance` alias; Vue exports `DataGridInstance`. All gain four required refresh methods. Existing structural implementations of these public types likewise fail to compile. The Web `DataGridElement` makes the corresponding methods optional, but that does not remedy the other types.
- Resolve by designing and verifying a backward-compatible public type surface without degrading the new concrete API, or treat the changes as breaking and select a major release. Do not assume consumer smoke tests prove compatibility for independently implemented interfaces. Architect review must choose the disposition; no implementation change is proposed here.

Other audit findings and migration boundaries:

- `GridColumn<TRow = unknown>` is opt-in, preserves the untyped default, and checks typed model keys; custom keys need accessors. Typed callbacks require the supplied data to match the row type. No removed root exports were found in the compared Web, React, Angular or Vue index files.
- Targeted refresh uses displayed keyed rows or displayed ranges, not source indices. Callers must notify all edits or use full refresh for structural changes; `render-only` relies on caller guarantees. External mode does not fetch data. Existing Blazor `RefreshDataAsync` remains distinct from the new targeted methods.
- Vue declarative columns are opt-in; use either declarations or the existing columns array under the documented precedence rules. They require a matching current Web Component schema/inference API. The previous Vue default prop value changed internally, so verify applications relying on introspection of component defaults.
- Alignment accepts only the documented values and validates own data properties; existing applications using an unrelated `align` field on column objects may now encounter validation. Invalid Blazor alignment retains the last valid grid and is logged. Coordinate wrapper and Web/bundled assets: the first `yc-grid` registration wins, and mixed old/new bundles can lack refresh/schema methods.
- Angular peer declarations remain `>=17`. Published 1.2.3 has reported Angular 17–22 matrix evidence; the current-source packed smoke covers 17 and 22 boundaries, not every patch, browser, SSR case or intermediate major on this artifact. React and Vue peer requirements were not narrowed. Blazor's new alignment and targeted-refresh members are additive at the inspected C# surface.
- A1 adapter synchronization changes and A3 verified-index behavior should be treated as behavioral fixes/optimizations, not a universal performance guarantee. PR #69's founder-directed performance uncertainty is still accepted and undisputed performance equivalence is not claimed.

## Version-change and final candidate checklist

Only after the compatibility disposition and separate authorization for candidate preparation:

1. In an isolated candidate, synchronize `package.json`; `packages/grid-core/package.json`, `grid-renderer/package.json`, `grid-web/package.json`, `grid-react/package.json`, `grid-vue/package.json`, `grid-angular/package.json`, `grid-blazor/package.json`; and `packages/grid-blazor/src/Tipolox.LitGrid.Blazor.csproj`. `scripts/set-version.mjs` lists and updates these version fields; review its complete diff.
2. Check the six published tarballs' internal dependency ranges resolve to the chosen coordinated version. Source `workspace:^` dependencies are transformed at packing; do not manually assume packed values. Regenerate/check the pnpm lockfile if needed, and confirm no unrelated dependency churn.
3. Move the approved Unreleased notes to an exact version heading in `CHANGELOG.md`; reconcile installation, framework guides, upgrade warnings, API references and release notes with the final disposition. Do not label unreleased features as published.
4. Build and qualify the exact final candidate commit, all six npm tarballs and NuGet, hashes and clean consumers. A release-workflow manual dispatch needs separate founder authorization and fresh verification of its event/ref and no-publish conditions. Do not tag, publish or deploy as part of validation.
5. Record CI and artifact hashes, outstanding compatibility limits, and the PR #69 performance exception for independent architectural review.

The PR-only hard-coded rehearsal workflow is removed from the eventual tree: its run links and hashes above preserve historical evidence. The reusable qualification scripts remain, but no old artifact or checksum is a future release gate. Any replacement must accept and verify the exact final candidate's artifact identity and source SHA rather than silently reusing the 1.2.3 rehearsal.
