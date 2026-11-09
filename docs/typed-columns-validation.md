# #32 implementation and validation report

Validated on 2026-11-09 against GitHub `main` at
`249217f2dec7ecc875b1f4eb6ed527f2e6f47d34` (B1 merged). Issues #32 and #27
were open. Work was isolated on `codex/32-typed-columns`; the completed A3
worktree/branch was not edited or incorporated.

See [the architecture decision and usage examples](typed-columns.md) for the
alternatives, exact contract, compatibility assessment, and residual risks.
The only library implementation file changed is `grid-web/src/types.ts`.
The public addition is the optional parameter on `GridColumn<TRow = unknown>`;
existing package-root re-exports expose it without additional exports.

## Verification results

Environment: Node 22.14.0, pnpm 10.33.0, TypeScript 6.0.3, .NET SDK 10.0.403
targeting the existing net8.0 Blazor projects. CI uses the repository's pinned
Node 22.22.3 and .NET 8 SDK.

| Exact command | Result |
| --- | --- |
| `pnpm.cmd install --frozen-lockfile` | Passed, existing lockfile unchanged. |
| `pnpm.cmd typecheck:all` | Passed; 118 authored TypeScript files owned, both strict projects checked; 29 historical generated declarations excluded by the existing gate. |
| `node scripts/typecheck-contracts.mjs` | Passed, including existing structural mocks and adapter fixtures. |
| `pnpm.cmd test --maxWorkers=2 --pool=threads` | 415 tests passed in 52 files; 0 failures. |
| `pnpm.cmd run build` | Passed for all workspace packages and playground in a fresh validation worktree. |
| `pnpm.cmd --filter @tipolox/litgrid-web exec tsc -p tsconfig.build.json --pretty false` | Passed; refreshed final declarations after comment cleanup. |
| `pnpm.cmd exec tsc -p tsconfig.published-contracts.json --pretty false` | Passed against fresh built declarations. |
| `pnpm.cmd --filter @tipolox/litgrid-angular exec ngc -p ../../tsconfig.typed-columns-angular.json` | Passed with strict Angular template checking; added to Verify CI. |
| `dotnet test packages/grid-blazor/tests/Tipolox.LitGrid.Blazor.Tests.csproj -c Release` | 129 tests passed; 0 failed, 0 skipped. |
| `dotnet build packages/grid-blazor/src/Tipolox.LitGrid.Blazor.csproj -c Release` | Passed; 0 warnings, 0 errors. |

Windows commands use `pnpm.cmd` because local PowerShell policy blocks the
`pnpm.ps1` shim. Git-backed ownership checks used a process-local `safe.directory`
setting for the shared Git metadata; no global Git configuration was changed.

The new fixtures contain **21 `@ts-expect-error` assertions and 14 exact-type
assertions**, plus positive definitions/consumer expressions. They cover valid
and invalid keys, optional fields, synthetic columns, transformed values, typed
callback parameters, strict callback variance, legacy `unknown` inference,
literal widening, empty arrays, optional props, unions/index signatures, all four
public exports, and actual React/Vue component creation and Angular bindings.
Both source and published-contract gates include these fixtures automatically.

As an additional diagnostic audit, a temporary in-memory compiler host removed
only the error directives. It produced exactly 21 diagnostics: TS18046 (2),
TS2339 (2), TS1360 (4), TS2322 (12), and TS2345 (1). Normal fixture compilation
then passes with the directives present.

## Fresh packed consumer

Packed core, renderer, web, React, Vue, and the built Angular distribution into
local `.tgz` files using the following command for each package directory:

```powershell
pnpm.cmd --dir <package-directory> pack --pack-destination <absolute-local-artifact-directory>
```

The Angular package directory was `dist/grid-angular`; the other five were
`packages/grid-{core,renderer,web,react,vue}`. A new private consumer installed
these six tarballs, with local overrides for their transitive LitGrid dependencies,
and the pinned framework dependencies. It used a strict standalone tsconfig with
no `paths` or source aliases and copies of both committed typed-column fixtures.

From the fresh validation worktree, these exact commands passed:

```powershell
pnpm.cmd --dir .private/consumer install --ignore-workspace --ignore-scripts
pnpm.cmd --dir .private/consumer exec tsc -p tsconfig.json --pretty false
pnpm.cmd --filter @tipolox/litgrid-angular exec ngc -p D:/Work/litgrid-p0/.worktrees/issue-32-validation/.private/consumer/tsconfig.json
```

No packages were published. The initial offline install lacked a cached
`@babel/parser` tarball; the ordinary install downloaded the public dependency.

## Runtime neutrality and local limitations

Built unmodified main first and recorded SHA-256 hashes of all emitted `.js`,
`.mjs`, and `.cjs` files under the five TypeScript package `dist` directories,
Blazor `src/wwwroot`, Angular `dist/grid-angular`, and playground `dist`.
The final candidate produced **42 matching JavaScript outputs, 0 changed**.
The temporary comparison command was `node .private/runtime-check.mjs`
(`--record` recorded the baseline). Source maps and declarations were excluded
from this runtime comparison. No runtime helper, row transform, validation,
adapter implementation, or rendering algorithm was added.

The default Windows Vitest fork pool stalled before reporting results and was
stopped. The thread pool completed the full suite successfully. Repeated builds
in the implementation worktree also encountered Windows ENOTEMPTY/EPERM errors
while replacing generated directories. A fresh detached validation worktree at
the same base, containing the proposed source, passed the normal build command.
Repository build/test scripts were not changed to accommodate the local issues.

The material type-system tradeoff is explicit: legacy `GridColumn` callbacks now
use method bivariance to accept opt-in typed columns through existing props.
Opt-in model definitions retain strict callbacks, but the erased grid boundary
does not correlate separately supplied data and columns. Renderer values remain
`unknown`; an accessor explicitly permits any synthetic key. No deep runtime
validation is claimed. These points require independent architectural review.

The PR remains draft for independent architectural review and founder approval.
No merge, release, tag, npm/NuGet publication, deployment, issue closure, or work
on #33/#34 was performed.
