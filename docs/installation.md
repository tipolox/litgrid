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
- Blazor applications need .NET 8.0 or later.

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

### Blazor

Install the Blazor NuGet package into your .NET 8+ project:

```bash
dotnet add package Tipolox.LitGrid.Blazor
```

The `Tipolox.LitGrid.Blazor` NuGet package is fully self-contained. It embeds its required JavaScript assets (`litgrid-blazor.js`) as static web assets (`_content/Tipolox.LitGrid.Blazor/litgrid-blazor.js`). Blazor consumers do **not** need Node.js, npm, or pnpm installed separately.

Add the component namespace to `_Imports.razor` or directly in your Razor component:

```razor
@using Tipolox.LitGrid.Blazor
```

## Upgrading to v1.1.0

LitGrid v1.1.0 is a coordinated release of all six public npm packages and
`Tipolox.LitGrid.Blazor`. Upgrade every LitGrid wrapper used by an application
together, including independently built bundles or microfrontends on the same page.
For Blazor, review the [breaking synchronization default and migration options](blazor-data-synchronization.md):
use supported notifications, replacement, `DataRevision`, `RefreshDataAsync()`, or
`DataSyncMode.Legacy` for applications relying on v1.0.3 parent-update behavior.

- Update the installed wrapper(s) to 1.1.0 and regenerate the consumer lockfile.
  Web requires core and renderer at `^1.1.0`; React, Angular, and Vue require Web
  at `^1.1.0`. Check the resolved graph with `pnpm list --depth Infinity` or
  `npm ls` and remove overrides/pins that keep older internal LitGrid packages.
  Review and commit the application lockfile, then rebuild every affected bundle.
  Update Blazor's NuGet reference to 1.1.0 and restore/rebuild its static assets.
- `yc-grid` is shared by all wrappers. Its first registration wins. LitGrid's
  registration guard avoids a duplicate `customElements.define` exception, but
  does not replace an existing constructor or establish version compatibility.
  If Web 1.0.3 registers first, loading 1.1.0 leaves that older constructor active
  and the new `updateColumnSchema` API unavailable. Do not remove the guard or try
  to register the same name again; deliver matching versions and reload the page.
- Deploy matching application bundles and Blazor static assets together. Use
  fingerprinted asset URLs where supported; for stable URLs, revalidate or purge
  stale CDN/browser entries. Update service-worker precache manifests and retire
  old caches through the application's normal update flow. Check that delivered
  JavaScript matches the new build, then reload open pages so registration starts
  with the coordinated assets. Verify an upgrade with a previously cached client,
  as well as a fresh installation, before rollout.

Publishing coordinated packages does not update consumer lockfiles, deployed
assets, caches, or custom elements already registered in an open page. The
coordinated 1.1.0 bundles were tested together; arbitrary mixed versions are not
guaranteed compatible.

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
for the first `yc-grid`, React `DataGrid`, Angular `DataGridComponent`,
Vue `DataGrid`, or Blazor `DataGrid<TItem>` instance. The [Web Component Guide](vanilla-js-guide.md),
[React Guide](react-guide.md), [Angular Guide](angular-guide.md),
[Vue Guide](vue-guide.md), and [Blazor Guide](blazor-guide.md) cover those
integrations in detail.
