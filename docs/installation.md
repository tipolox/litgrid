# Install LitGrid

LitGrid provides separate packages for Web Component, React, Angular, and Vue applications.
Choose the package that matches your application.

## Requirements

- A modern browser with native Web Component support.
- A bundler that supports ECMAScript modules.
- Node.js and a package manager when installing from a package registry.
- React applications also need a React runtime compatible with the
  `@tipolox/litgrid-react` package.
- Angular applications need Angular 17 or later.
- Vue applications need Vue 3.5 or later.

## Package registry

### Web Component

Install the Web Component package:

```bash
pnpm add @tipolox/litgrid-web
```

```bash
npm install @tipolox/litgrid-web
```

```bash
yarn add @tipolox/litgrid-web
```

Import it once in your application entry point to register the `yc-grid`
custom element:

```ts
import '@tipolox/litgrid-web'
```

### React

Install the React wrapper:

```bash
pnpm add @tipolox/litgrid-react
```

```bash
npm install @tipolox/litgrid-react
```

```bash
yarn add @tipolox/litgrid-react
```

The React package includes `@tipolox/litgrid-web`; do not install both
packages for a React application. Verify the integration with a component
import:

```tsx
import { DataGrid } from '@tipolox/litgrid-react'
```

### Angular

Install the standalone Angular wrapper:

```bash
pnpm add @tipolox/litgrid-angular
```

```bash
npm install @tipolox/litgrid-angular
```

```bash
yarn add @tipolox/litgrid-angular
```

Import the standalone component in the Angular component that renders the
grid:

```ts
import { DataGridComponent } from '@tipolox/litgrid-angular'
```

### Vue

Install the Vue wrapper:

```bash
pnpm add @tipolox/litgrid-vue
```

```bash
npm install @tipolox/litgrid-vue
```

```bash
yarn add @tipolox/litgrid-vue
```

Import the component in a Vue single-file component:

```ts
import { DataGrid } from '@tipolox/litgrid-vue'
```

## Local workspace development

Clone the repository, install its workspace dependencies, then start the
playground:

```bash
pnpm install
pnpm dev
```

The workspace uses pnpm and links internal packages with the `workspace:*`
protocol. Applications inside this repository should depend on the workspace
package names rather than relative source paths:

```json
{
  "dependencies": {
    "@tipolox/litgrid-web": "workspace:*"
  }
}
```

Use `@tipolox/litgrid-react` instead when working on a React integration.
Use `@tipolox/litgrid-angular` for an Angular integration.
Use `@tipolox/litgrid-vue` for a Vue integration.

## Next step

After installation, follow the [Getting Started guide](../README.md#getting-started)
for the first `yc-grid`, React `DataGrid`, or Angular `DataGridComponent`
or Vue `DataGrid` instance. The [Web Component Guide](vanilla-js-guide.md),
[Angular Guide](angular-guide.md), and [Vue Guide](vue-guide.md) cover those
integrations in detail.
