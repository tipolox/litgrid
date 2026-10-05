# @tipolox/litgrid-core

Lower-level LitGrid engine package, without browser or UI dependencies. It exports `createGridEngine`, the `GridEngine` contract, and configuration/state types for data transforms and row/cell selection.

The engine handles sorting, quick search, filters, pagination, and selection. Read transformed rows with `getRows()` or slices with `getVisibleRows(startIndex, endIndex)`.

Most application developers should start with `@tipolox/litgrid-web` or the React, Vue, or Angular integration. Use this package when working directly with the engine or building an integration.

```bash
npm install @tipolox/litgrid-core
```

- [Core engine API](https://github.com/tipolox/litgrid/blob/main/docs/api-reference.md#core-engine)
- [Installation guide](https://github.com/tipolox/litgrid/blob/main/docs/installation.md)
- [Repository](https://github.com/tipolox/litgrid)
- [Live demo](https://tipolox.com/litgrid/demo)

Licensed under the [MIT License](https://github.com/tipolox/litgrid/blob/main/LICENSE).
