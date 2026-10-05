# @tipolox/litgrid-web

LitGrid's `yc-grid` Web Component: a virtualized data grid for browser applications. Importing the package registers the custom element.

## Install

```bash
npm install @tipolox/litgrid-web
```

Use a modern browser with native Web Component support and a bundler that supports ECMAScript modules.

## Quick start

Add the element to your page:

```html
<yc-grid></yc-grid>
```

Run this in your application entry point after the element is in the DOM:

```ts
import '@tipolox/litgrid-web'
import type { DataGridElement } from '@tipolox/litgrid-web'

const grid = document.querySelector('yc-grid') as DataGridElement
grid.data = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' }
]
grid.columns = [
  { key: 'id', header: 'ID', width: 80 },
  { key: 'name', header: 'Name', width: 180 }
]
grid.viewportHeight = 400
```

`viewportHeight` defines the viewport used for row virtualization.

## Resources

- [Live demo](https://tipolox.com/litgrid/demo)
- [Repository](https://github.com/tipolox/litgrid)
- [Web Component guide](https://github.com/tipolox/litgrid/blob/main/docs/vanilla-js-guide.md)
- [API reference](https://github.com/tipolox/litgrid/blob/main/docs/api-reference.md)

Licensed under the [MIT License](https://github.com/tipolox/litgrid/blob/main/LICENSE).
