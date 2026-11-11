# Community Edition release readiness — draft

**Recommendation: NO-GO for release pending qualification and architect review.** This is a draft, not a release authorization.

Base under review: `bfa3ee8dcab77c25e536cea9be4ea3774c23b132` (main); last published tag: `v1.2.3` at `6a0df7b01fd3de0b7e7f5dc386de469f3531d210`. The comparison contains nine commits. Recommend evaluating **1.3.0** for additive public APIs, subject to a complete compatibility audit; no version has been changed.

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

**Packed-consumer result: PASS for these bounded configurations; release NO-GO** pending the wider compatibility/documentation audit, architect review, and qualification of final versioned 1.3.0 artifacts. The rehearsal packages are not publication candidates. PR #69's accepted performance uncertainty remains unchanged.
