# @tipolox/litgrid-angular

Angular integration for LitGrid's `yc-grid` Web Component. The standalone `DataGridComponent` provides Angular inputs, typed outputs, and an imperative component API. The Web Component dependency is included.

## Install

```bash
npm install @tipolox/litgrid-angular
```

Requires Angular 17 or later (`@angular/core` and `@angular/common` peers: `>=17.0.0`). Use a modern browser with native Web Component support and a bundler that supports ECMAScript modules.

## Quick start

```ts
import { Component } from '@angular/core'
import { DataGridComponent } from '@tipolox/litgrid-angular'
import type { GridColumn } from '@tipolox/litgrid-angular'

@Component({
  selector: 'app-users-grid',
  standalone: true,
  imports: [DataGridComponent],
  template: `
    <litgrid-data-grid [data]="data" [columns]="columns" [height]="400" />
  `
})
export class UsersGridComponent {
  readonly data = [
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Grace' }
  ]
  readonly columns: GridColumn[] = [
    { key: 'id', header: 'ID', width: 80 },
    { key: 'name', header: 'Name', width: 180 }
  ]
}
```

Import `UsersGridComponent` into your application's standalone component and render `<app-users-grid />`. `height` defines the viewport used for row virtualization.

## Resources

- [Live demo](https://tipolox.com/litgrid/demo)
- [Repository](https://github.com/tipolox/litgrid)
- [Angular guide](https://github.com/tipolox/litgrid/blob/main/docs/angular-guide.md)
- [API reference](https://github.com/tipolox/litgrid/blob/main/docs/api-reference.md)

Licensed under the [MIT License](https://github.com/tipolox/litgrid/blob/main/LICENSE).
