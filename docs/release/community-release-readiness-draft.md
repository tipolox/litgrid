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
- Still open: verify the individual package hashes from the uploaded manifest and run clean Web, React, Angular, Vue and component-level Blazor consumers against the exact artifacts. Complete the public API and documentation audit, including compatibility and migration review. Record the exact artifacts, logs and release-candidate CI before changing the recommendation.

## Completed technical rehearsal

[Manual release rehearsal 43004797435](https://github.com/tipolox/litgrid/actions/runs/43004797435) succeeded on main commit `bfa3ee8dcab77c25e536cea9be4ea3774c23b132`, with input version 1.2.3. The validation job packed core, renderer, web, React, Vue and Angular npm tarballs and `Tipolox.LitGrid.Blazor` NuGet; artifact validation passed, a clean Blazor template installed the local NuGet package and built, and a SHA-256 manifest was generated and uploaded. Registry preflight, publishing and GitHub release jobs were skipped. The uploaded archive digest reported by GitHub is `sha256:2d6a345446a9d406842860f14a1ad99ae310626e0a6f8d21ef9cea9ef46fbbc0`; this is the archive digest, not the individual package checksums. The individual manifest and package hashes remain to be independently retrieved and verified.

These 1.2.3-labeled artifacts contain newer source. They are technical test artifacts, not valid published 1.2.3 packages or qualified 1.3.0 candidates. The final versioned release artifacts require separate qualification.

## Outstanding consumer work

Test clean Web Components, React, Vue and Angular applications using the exact packed artifacts and resolve every transitive LitGrid dependency locally. Check installation, exports, declarations, builds, browser behavior, relevant new APIs and supported framework versions. The successful Blazor template build establishes installation and build only; a consumer using actual LitGrid components and newer APIs remains open. The PR remains NO-GO while these checks and the complete compatibility/documentation audit are unfinished.
