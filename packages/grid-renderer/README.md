# @tipolox/litgrid-renderer

Lower-level LitGrid virtualization and scroll-mapping utilities. This package exports:

- `createVirtualizer` for fixed-height rows.
- `createVariableVirtualizer` for variable-size rows or columns.
- `calculateDisplayLayout` and `mapDisplayScrollOffset` for capped-spacer display-to-virtual scroll mapping.
- The corresponding options, state, range, and scroll-mapping types.

Most application developers should start with `@tipolox/litgrid-web` or the React, Vue, or Angular integration. Use this package when implementing a viewport or building an integration.

```bash
npm install @tipolox/litgrid-renderer
```

- [Renderer utilities API](https://github.com/tipolox/litgrid/blob/main/docs/api-reference.md#renderer-utilities)
- [Installation guide](https://github.com/tipolox/litgrid/blob/main/docs/installation.md)
- [Repository](https://github.com/tipolox/litgrid)
- [Live demo](https://tipolox.com/litgrid/demo)

Licensed under the [MIT License](https://github.com/tipolox/litgrid/blob/main/LICENSE).
