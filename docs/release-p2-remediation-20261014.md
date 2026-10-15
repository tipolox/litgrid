# LitGrid v1.1.0 P2 remediation and artifact requalification

14 October 2026, Asia/Singapore. PR #25, `feat/blazor-declarative-columns`.
Baseline HEAD: `056919b667f04e1a76208b607a0d33513676da91`, with uncommitted P2
corrections. No feature development, version change in the original checkout,
commit, push, merge, tag, publication, or deployment was performed.

**All three P2 findings are resolved. The modified coordinated local v1.1.0
candidates pass the artifact and fresh-consumer checks below.** This qualifies
the recorded local candidates in the tested configurations; it is not public
release approval.

## 1. Exact findings and root causes

The actual `QUALIFICATION-REPORT.md` and `COMMANDS.md` were read from
`C:/Users/ympau/AppData/Local/Temp/litgrid-v110-artifact-20261014` before changes.

| Finding | Confirmed issue | Root cause |
| --- | --- | --- |
| P2-1 | 73 of 74 npm maps referenced omitted original sources without embedded content, impairing JavaScript debugging and declaration navigation. | The five TypeScript packages shipped `dist` without the referenced `src` files. Angular embedded its bundled JavaScript sources, but its declaration map lacked content. |
| P2-2 | The README packed into NuGet 1.1.0 still said checkout versions remained 1.0.3; the synchronization guide contained similar preparation-state wording. | Temporary implementation/check-out status was left in consumer release documentation. |
| P2-3 | Extracted 1.1.0 release notes omitted the demonstrated older-first registration limit and consumer lockfile/cache migration. | Notes covered Blazor behavior migration but omitted shared-page package and asset delivery requirements. |

Maps and `sourceMappingURL` targets were present. The defect was original-source
availability, rather than runtime imports, intentionally disabled maps, incorrect
map references, or stale code. Fresh output inspection found relative map paths
and mappings matching the historical maps.

## 2. Corrections

- Core, renderer, Web, React, and Vue now package original TypeScript sources
  once, so both JavaScript and declaration maps resolve their existing relative
  references. React includes TSX. Generated source-directory declarations, tests,
  and benchmarks are excluded.
- Angular's normal build completes its maps with `sourcesContent`, including the
  previously unsupported declaration map, through
  `scripts/embed-sourcemap-sources.mjs`. Missing sources and absolute source paths
  fail that step. Five focused CLI regression tests cover source removal,
  declaration maps, existing embedded sources, repeated execution, missing
  sources, absolute paths, and empty output.
- The release artifact validator checks version-3 map structure, relative source
  paths, original-source availability, and packaged `sourceMappingURL` targets.
  It rejects the historical defective map set and accepts the final candidates.
- The Blazor README and synchronization guide remove checkout-state claims.
  The README explicitly describes v1.1.0 Automatic, `ObservableCollection<T>` /
  `INotifyCollectionChanged`, supported `INotifyPropertyChanged` reference rows,
  `RefreshDataAsync()`, optional `DataRevision`, and `DataSyncMode.Legacy`.
- Installation guidance and the extracted changelog explain coordinated versions,
  internal `^1.1.0` requirements, first registration, duplicate-registration
  guards, older-first schema API failure, lockfile review, matching deployments,
  fingerprinting/revalidation/purges, service-worker updates, and page reloads.
  Publication is explicitly described as insufficient to update consumers.
  The root README and all seven package READMEs link to this guidance.

An initial all-embedded alternative added 49,422 compressed bytes to Web. It was
replaced with source packaging to avoid duplicating the largest source in two
maps. Its investigation and interim tarballs are retained in the new QA workspace.

## 3. Files modified

- `CHANGELOG.md`, `README.md`.
- `docs/installation.md`, `docs/blazor-data-synchronization.md`, this report.
- `packages/grid-{core,renderer,web,react,vue,angular}/package.json`.
- `packages/grid-{core,renderer,web,react,vue,angular,blazor}/README.md`.
- `scripts/validate-release-artifacts.mjs`.
- New `scripts/embed-sourcemap-sources.mjs` and
  `scripts/embed-sourcemap-sources.test.ts`.

`pnpm-lock.yaml`, original package versions, Blazor project version, production
grid/interop/synchronization code, experiments, historical reports, and `.serena/`
were not modified. All eight original manifests and the Blazor project remain
1.0.3. Existing commits and unrelated untracked files were preserved.

## 4. Validation executed

Disposable workspace:
`C:/Users/ympau/AppData/Local/Temp/litgrid-v110-p2-20261014`.
The original HEAD was archived and current P2 files overlaid. Version preparation
to 1.1.0 was applied only to that copy. Independent caches and consumer directories
were used; historical qualification outputs were read-only inputs.

| Check | Result |
| --- | --- |
| Frozen-lockfile offline workspace installation; isolated release-version validation | PASS |
| Normal complete workspace build, including prebuild cleanup and Angular packaging | PASS |
| JavaScript suite, including five new map completion cases | 218 tests / 30 files passed |
| Release .NET suite | 120 tests passed |
| Package TypeScript builds, structural API compatibility fixture, Blazor TypeScript check with workspace root | PASS |
| Final fresh npm public declarations with `skipLibCheck: false` | PASS |
| Final fresh Angular strict compiler / templates / injection checks | PASS |
| Final fresh npm production build and coordinated dependency graph | PASS |
| Final six npm packs and NuGet Release pack; release artifact validator | PASS |
| Actual 1.1.0 changelog extraction and migration-content checks | PASS |
| All seven packed READMEs match their build inputs and include upgrade guidance | PASS |
| Final fresh npm Chromium runtime suite: Web, React, Angular, Vue | 18 checks passed; no browser errors |
| Fresh package-only WASM and Interactive Server mode/revision/refresh/notification/disposal suites | 58 checks each passed |
| WASM and Server retry/schema suites | Seven checks each passed |
| WASM and Server B1.1 correctness suites | 13 checks each passed |
| Published keyboard/declarative WASM fixture | 13 scenarios passed, with 20 large-grid focus repetitions |
| Final Interactive Server UI fixture | Eight scenarios passed |
| Final real Server socket interruption / retained-circuit fixture | 56 checks over six cycles passed; no browser errors |
| Final npm + independently extracted NuGet mixed-bundle fixture | Constructor, rendering/update, single callback and disposal checks passed |
| Actual registry Web 1.0.3 older-first fixture | Confirmed the documented preserved old constructor and unavailable `updateColumnSchema` |
| Served Blazor JS/map hashes from Server and both WASM hosts | Six of six match the new package |

The final npm checks were repeated in a new empty `consumers/npm-final` directory
after source packaging replaced the embedded-only alternative. Its lockfile
records the final file-tarball integrities; overrides resolve unpublished
transitive candidates locally. Consumers do not use workspace source aliases.
NuGet consumers resolve 1.1.0 as a package, with no ProjectReference.

Initial Server startup exposed shared Windows profile DPAPI/EventLog access
errors. Only the disposable fixture was adjusted to keep key storage in its own
directory; Server mode/retry/correctness/UI/reconnect checks were repeated.
Final runtime logs contain zero fail/warn/Exception/error entries. The
Windows-specific fixture's DPAPI call emits CA1416 during its compilation; that
warning is confined to the fixture. Other retained setup errors and their
corrected commands are documented in the new workspace's `COMMANDS.md`.
Optional WASM tooling and npm large-chunk warnings remain visible.

## 5. Package and source-map verification

All **74 maps** parse, retain their historical mappings, and resolve original
sources in both final tarballs and an independently installed package graph:
**72 use packaged originals; two Angular maps embed content**. Packaged originals
and embedded authored sources match the source copy. Angular's already embedded
synthetic generated barrel remains identical. No absolute map source paths,
missing map targets, unavailable originals, tests, or benchmarks were found.

All npm runtime JS and public declaration bytes are identical to the prior
qualified outputs. The Blazor JS and map are also identical, with all 30 embedded
sources verified. The NuGet README changed. The rebuilt DLL has different MVID
and PDB build-directory provenance; normalized metadata and all **453 method
bodies** were independently compared and are identical.

| npm package | Prior compressed bytes | Final compressed bytes | Increase |
| --- | ---: | ---: | ---: |
| Angular | 7,787 | 7,963 | 176 |
| Core | 12,031 | 15,761 | 3,730 |
| React | 7,455 | 9,478 | 2,023 |
| Renderer | 6,268 | 7,973 | 1,705 |
| Vue | 7,232 | 9,202 | 1,970 |
| Web | 49,980 | 75,511 | 25,531 |

The total compressed npm increase is 35,135 bytes. Runtime JavaScript size and
behavior are unchanged. `artifacts/SHA256SUMS.txt` identifies the exact seven
final candidates. NuGet generated props/targets/nuspec contain no absolute
build-machine paths.

Preservation checks cover 900 historical-evidence and Serena files, with zero
content or modification-time changes. The Serena symbol cache still matches the
historical report's exact SHA-256. Original QA directories and unrelated
experiments were not targeted for writes. Disposable host PIDs are recorded and
stopped after validation.

## 6. Qualification applicability and remaining release gates

The prior qualification remains applicable to its unchanged original artifacts
and recorded hashes. It does **not** qualify modified outputs by itself. The new
artifact checks, source-map/source-byte inspection, fresh npm installation and
runtime checks, and fresh NuGet WASM/Server qualification cover the new local
candidates. Evidence and reproducible commands are retained in the new workspace;
the historical evidence remains intact.

Final platform QA should include Firefox/WebKit, manual accessibility, and an
actual upgrade from a persistent browser/service-worker/CDN cache using matching
application assets. Where required by release policy, add WASM AOT, a separate
Angular AOT-only runtime, other supported framework versions, and real deployment
network conditions. The reconnect fixture uses a five-second framework interop
deadline and 60-second circuit retention; it does not establish normal one-minute
deadline timing or expired-circuit behavior. Performance baselines were not
regenerated. The older-first fixture tests Web registration while local overrides
align core/renderer; it does not qualify a complete old dependency stack.
Public registry delivery, provenance, replication, and publication
controls were not exercised.

**Recommendation:** the P2 corrections are ready for review and the coordinated
v1.1.0 local release candidate is ready for final platform QA in the stated scope.
Run release workflow validation on the final authorized source/version commit,
verify candidate checksums, and retain the separate publication authorization
gate. This report grants no public release approval.
