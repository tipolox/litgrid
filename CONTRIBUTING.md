# Contributing to LitGrid

Thank you for your interest in contributing to LitGrid! This guide covers the development workflow, testing, and pull request expectations.

## Prerequisites

- **Node.js**: >= 20.x
- **pnpm**: >= 9.x
- **.NET SDK**: 8.0 or later (for building and testing the Blazor wrapper)
- A modern browser with native Web Component support

## Repository Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/tipolox/litgrid.git
   cd litgrid
   ```

2. Install workspace dependencies:
   ```bash
   pnpm install
   ```

3. Build all workspace packages:
   ```bash
   pnpm build
   ```

## Development Workflow

### Workspace Packages

The repository is organized as a pnpm workspace:

- `packages/grid-core`: Framework-agnostic grid data engine, sorting, filtering, selection, and transforms.
- `packages/grid-renderer`: Pure virtualization calculations, row/column slicing, and capped scroll mapping.
- `packages/grid-web`: Custom Element (`<yc-grid>`) implemented with Lit.
- `packages/grid-react`: React wrapper (`DataGrid`).
- `packages/grid-angular`: Angular standalone component (`DataGridComponent`).
- `packages/grid-vue`: Vue 3 component (`DataGrid`).
- `packages/grid-blazor`: Blazor component (`DataGrid<TItem>`) and interop script.
- `apps/playground`: Vite + React interactive development playground.

### Running the Playground

Start the playground for interactive development and testing:

```bash
pnpm dev
```

### Running Tests

Run the TypeScript unit and integration test suite:

```bash
pnpm test
```

Run the Blazor package unit and interop tests:

```bash
dotnet test packages/grid-blazor/tests/Tipolox.LitGrid.Blazor.Tests.csproj
```

### Building Packages

Build all packages and verify builds:

```bash
pnpm build
```

To build the Blazor package in Release configuration:

```bash
dotnet build -c Release packages/grid-blazor/src/Tipolox.LitGrid.Blazor.csproj
```

## Pull Request Guidelines

1. **Focus**: Keep PRs focused on a single feature, bug fix, or documentation update.
2. **Tests**: Add unit or integration tests for new features and bug fixes. Ensure all existing tests pass (`pnpm test` and `dotnet test`).
3. **Builds**: Verify that `pnpm build` succeeds without compilation errors.
4. **Documentation**: Update relevant documentation in `docs/` or `README.md` when adding or modifying public APIs.
5. **No Breaking Changes Without Discussion**: Open an issue before proposing breaking changes to public APIs.

## Maintainer Release Process

This section is for repository maintainers, not normal contributors. The release workflow publishes future tagged releases through GitHub Actions Trusted Publishing; it does not use registry tokens or API-key secrets.

1. Ensure `main` is clean and synchronized.
2. Prepare the synchronized semantic version:

   ```bash
   pnpm run release:version <VERSION>
   ```

3. Update `CHANGELOG.md` with a non-empty `## <VERSION>` entry.
4. Run release validation locally:

   ```bash
   node scripts/validate-release-version.mjs <VERSION>
   ```

5. Run the quality checks:

   ```bash
   pnpm install --frozen-lockfile
   pnpm test
   pnpm build
   dotnet test packages/grid-blazor/tests/Tipolox.LitGrid.Blazor.Tests.csproj -c Release
   dotnet build packages/grid-blazor/src/Tipolox.LitGrid.Blazor.csproj -c Release
   ```

6. Review the diff and commit the release preparation using the project's human-readable commit style:

   ```text
   Release: prepare vX.Y.Z
   ```

7. Push `main`.
8. Create an annotated tag:

    ```bash
    git tag -a v<VERSION> -m "Release v<VERSION>"
    ```

9. Push the tag. The `Release` workflow validates the tagged commit, checks its changelog entry, packages and validates the candidate artifacts, builds a clean Blazor consumer, and confirms that all target npm and NuGet versions are absent.
10. The protected `release` environment waits for approval.
11. A second maintainer approves the protected publish job.
12. The protected job publishes the six npm packages and the Blazor NuGet package through OIDC Trusted Publishing.
13. Only after every registry publication succeeds, the workflow creates the GitHub Release for the existing tag using that version's curated changelog notes.

Use `workflow_dispatch` with a version such as `1.1.0` for a non-publishing validation/dry run. It validates, tests, builds, packs, checks artifacts, builds the clean consumer, generates checksums, and uploads a release candidate, but it cannot publish packages, create a release, or create a tag.

Registry publication is not transactional. If a publish fails after one or more packages are published, the workflow fails without skipping duplicates, retrying the remaining packages, or creating a GitHub Release. Recover a partial release deliberately as a maintainer; do not use a normal rerun as automatic recovery.

`scripts/set-version.mjs` modifies the synchronized versions for the npm packages and the Blazor NuGet project. `scripts/validate-release-version.mjs` verifies that those versions match. `scripts/extract-changelog.mjs` read-only extracts the exact changelog section used as GitHub Release notes.
