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

To build the Blazor package NuGet artifact:

```bash
dotnet build -c Release packages/grid-blazor/src/Tipolox.LitGrid.Blazor.csproj
```

## Pull Request Guidelines

1. **Focus**: Keep PRs focused on a single feature, bug fix, or documentation update.
2. **Tests**: Add unit or integration tests for new features and bug fixes. Ensure all existing tests pass (`pnpm test` and `dotnet test`).
3. **Builds**: Verify that `pnpm build` succeeds without compilation errors.
4. **Documentation**: Update relevant documentation in `docs/` or `README.md` when adding or modifying public APIs.
5. **No Breaking Changes Without Discussion**: Open an issue before proposing breaking changes to public APIs.
