# Vue declarative columns (#33)

## Architecture decision

Read direct `LitGridColumn` VNodes in the DataGrid default slot during its render.
Flatten Vue fragments in declaration order and ignore comments/whitespace. Do not
mount these metadata components, execute arbitrary component render functions,
inspect DOM, or create a component per cell. Work is O(columns), independent of
row count. Reconcile the final snapshot after Vue's render with the existing
public `updateColumnSchema` and `inferColumns` APIs.

Provide/inject registration would need a separate ordering protocol and batched
mount/update/unmount coordination. Registration order alone is incorrect for
keyed moves. Reject it here. Slot analysis gives the source order synchronously,
including compiler-generated `v-if` comments and `v-for` fragments. Its explicit
limit is direct declarations/fragments: HTML wrappers, custom wrapper components,
Teleport, Suspense and nested grids in this metadata slot are rejected. Do not
reach into private VNode/component internals to discover their eventual output.
The smaller existing alternative remains `:columns` with `GridColumn<TRow>[]`.

## Consumer API

```vue
<script setup lang="ts">
import { DataGrid, LitGridColumn, type GridColumn } from '@tipolox/litgrid-vue'
interface User { id: number; name: string }
const users: User[] = [{ id: 1, name: 'Ada' }]
const label = {
  key: 'label', accessor: (user, index) => `${index + 1}: ${user.name}`
} satisfies GridColumn<User>
</script>

<template>
  <DataGrid :data="users" :height="400">
    <LitGridColumn field="id" header="ID" :width="80" />
    <LitGridColumn field="name" header="Name" :width="220" />
    <LitGridColumn :column="label" />
  </DataGrid>
</template>
```

`field` maps literally to the core `key`. Inline metadata supports `header`,
`width`, `hidden`, `sortable`, `filterable`, `accessor`, and `render`, with the
same meanings as `GridColumn`. Boolean bare attributes mean true; use `:hidden="false"`
for false. `render` is a core renderer returning its existing supported values,
not a Vue cell component/slot. Arbitrary Vue VNode cell rendering is not added.

Alternatively, pass a whole `GridColumn<TRow>` as `:column`. This retains #32's
checked model keys and typed callback rows. Combining `column` with `field` or
inline metadata throws. Inline string fields are not checked against DataGrid's
separately supplied data type; no generic parent/child type inference is claimed.
New root exports: `LitGridColumn` and `LitGridColumnProps`. Existing public Web
Component APIs and other framework adapters are unchanged.

## Identity, sources and lifecycle

| Case | Contract |
| --- | --- |
| Registration/teardown | Each render supplies one complete metadata snapshot. No registry, child lifecycle hooks, or mount-order dependency. Unmount discards the snapshot and existing grid event listeners. |
| Declaration order | Depth-first fragment/slot order. The initial schema allows existing persisted order to restore. Any subsequent key-sequence change applies the complete new declaration order. |
| `v-if` | False removes the schema key. If every column disappears, the schema stays explicitly empty. |
| `v-for` | Current iteration order supplies schema order. Use stable Vue `:key` values as usual. |
| Vue `key` | Reserved for VNode identity. It never supplies or overrides a grid key. Changing only it causes no schema setter call. |
| Dynamic `field`/`column.key` | Remove the old grid key and add the new one. Keyed user state does not transfer. |
| Metadata | Compare supported fields, including callback identity, through existing shallow schema synchronization. No deep watchers. Hoist callbacks if stable identity is desired. |
| Duplicate grid keys | Throw a diagnostic before schema synchronization. Duplicate Vue keys do not supply distinct grid identities. |
| Explicit `:columns` array plus slot | Array wins, including `[]`. The slot is not evaluated. Definitions are never merged. |
| Omitted/undefined columns and no slot | Existing inferred-column behavior. |
| Explicit `:columns="[]"` | Existing inferred-column behavior, unchanged. |
| Slot present, columns omitted/undefined | Declarative mode, including an empty slot: disable inference. |
| Leaving declarative mode | Restore inference, then use normal array/no-slot synchronization. |
| Remount | New snapshot and grid; no retained registration. A storage key can restore the normal persisted state. |

Use visibility for temporary hiding when user customization should survive:

```vue
<DataGrid :data="users">
  <LitGridColumn v-for="field in fields" :key="field" :field="field" />
  <LitGridColumn v-if="showExtra" field="extra" />
</DataGrid>
```

## User state and boundaries

The shared schema reconciler preserves widths, visibility and user order for
unchanged keys/metadata. Updating a declared width or hidden value intentionally
replaces that key's corresponding user override. Removing a key prunes its
customization; adding it again uses declaration defaults. Membership changes and
declaration reorder deliberately reapply declaration order; header/callback-only
updates preserve user order. Persistence namespace switches remain atomic and
restore the target namespace's state under the existing public API contract.

The normal array/no-slot path retains its existing watcher, schema comparison,
setter behavior and inference. Declarative snapshots use one post-render
synchronization, and all rendering/query/selection/navigation stays in the Web
Component. No changes to B1 refresh or external-result adoption are introduced.
Declarative mode requires a current grid exposing the public schema and inference
capabilities; legacy structural mocks remain supported on the array path.

Review risks: the deliberately bounded direct-slot syntax, the explicit policy
that key-sequence edits override user order, and the existing loss of per-key
customization after removal. This adapter does not cache removed state or add a
second persistence model. Error handling follows Vue's normal error handler;
invalid declaration renders retain the last successfully synchronized schema.
