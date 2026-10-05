# @tipolox/litgrid-react

React integration for LitGrid's `yc-grid` Web Component. The `DataGrid` component provides React props and an imperative ref API. The Web Component dependency is included.

## Install

```bash
npm install @tipolox/litgrid-react
```

Requires React and React DOM matching the package's peer dependency range: `^19.2.5`. Use a modern browser with native Web Component support and a bundler that supports ECMAScript modules.

## Quick start

```tsx
import { DataGrid } from '@tipolox/litgrid-react'

const data = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' }
]
const columns = [
  { key: 'id', header: 'ID', width: 80 },
  { key: 'name', header: 'Name', width: 180 }
]

export function UsersGrid() {
  return <DataGrid data={data} columns={columns} height={400} />
}
```

Render `UsersGrid` in your React application. `height` defines the viewport used for row virtualization.

## Resources

- [Live demo](https://tipolox.com/litgrid/demo)
- [Repository](https://github.com/tipolox/litgrid)
- [React guide](https://github.com/tipolox/litgrid/blob/main/docs/react-guide.md)
- [API reference](https://github.com/tipolox/litgrid/blob/main/docs/api-reference.md)

Licensed under the [MIT License](https://github.com/tipolox/litgrid/blob/main/LICENSE).
