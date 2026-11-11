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

- Remote main was identical to the stated base when checked. Recheck before release and qualify the eventual release commit.
- On PR #69 head `180ac15b933361b405efe39b09d4284eace0c423`, [Verify](https://github.com/tipolox/litgrid/actions/runs/42802268363), [B1 browser qualification](https://github.com/tipolox/litgrid/actions/runs/42802268466), and [external-query visual regression](https://github.com/tipolox/litgrid/actions/runs/42802268270) reported success. These are PR-head results, not a complete release qualification at the merge SHA. The available workflow-run query returned no PR-triggered runs for the merge SHA; this does not establish the absence of push CI.
- Complete JS, Blazor, browser and framework compatibility gates on the exact candidate. The local checkout was not the requested main; the available alignment worktree could not be independently verified as the merge tree. A local Blazor test attempt there failed because the .NET targeting pack was unavailable. Do not treat it as candidate evidence.
- Build and inspect all six npm tarballs and the NuGet package; record hashes and test clean consumers against those exact artifacts, including supported framework versions. These checks remain open.
- Complete public API and README, installation and framework documentation audit. Confirm B1 availability language and compatibility boundaries against the candidate.
- Record exact candidate and artifact hashes, CI links and outcomes, and architect disposition before changing this recommendation. Draft PRs #67 and #68 and Intl value formatting are out of scope.
