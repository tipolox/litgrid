# Column formatting examples — proposed API only (#34)

These snippets illustrate the [RFC](column-formatting-rfc.md). `align`, `format`
and `GridValueFormat` do not exist in the baseline packages. Do not paste them
into production until the design is approved and implemented. Existing `render`
alternatives at the end work with the current contract.

## Financial amount: a Singapore-dollar ledger

```ts
import type { GridColumn } from '@tipolox/litgrid-web'

interface LedgerRow {
  invoice: string
  amount: number | null // major SGD units, not integer cents
}
const data: LedgerRow[] = [
  { invoice: 'INV-1042', amount: 1234.5 },
  { invoice: 'INV-1043', amount: -18.25 },
  { invoice: 'INV-1044', amount: null },
]
const columns = [
  { key: 'invoice', header: 'Invoice', width: 180 },
  {
    key: 'amount', header: 'Amount (SGD)', width: 180, align: 'right',
    format: {
      kind: 'number', locale: 'en-SG',
      options: {
        style: 'currency', currency: 'SGD', currencyDisplay: 'code',
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      },
    },
  },
] satisfies GridColumn<LedgerRow>[]
```

Typical display is `SGD 1,234.50` (native spacing may differ); numeric ascending
sort uses `-18.25`, `1234.5`, etc., with existing null ordering. A filter
`greaterThan: 1000` uses number units, not a currency string. Copy is `1234.5`,
`-18.25`, or blank. The header makes the currency clear even when formatting is
clipped. Converting cents in an accessor changes the cell/copy value only; if
queries need major units too, materialize an `amount` query field deliberately.

## Timestamp: a support queue in Singapore time

```ts
interface Ticket { id: number; openedAtMs: number | null }
const tickets: Ticket[] = [
  { id: 41, openedAtMs: Date.parse('2026-11-10T00:15:00Z') },
]
const ticketColumns = [
  { key: 'id', header: 'Ticket' },
  {
    key: 'openedAtMs', header: 'Opened (Singapore)', width: 240,
    format: {
      kind: 'dateTime', locale: 'en-GB',
      options: {
        timeZone: 'Asia/Singapore', dateStyle: 'medium', timeStyle: 'short',
      },
    },
  },
] satisfies GridColumn<Ticket>[]
```

The instant displays as 10 Nov 2026 at 08:15 in Singapore, subject to native
punctuation. Local sort/filter compare epoch milliseconds; filter boundaries must
be supplied in milliseconds. Copy is the original numeric timestamp. JSON-backed
rows may instead use `openedAt: '2026-11-10T00:15:00Z'`, which displays the same
instant and copies that exact string. Local sorting of ISO strings with differing
offsets is lexical, not temporal: normalize a query field or sort on the server.
`2026-11-10` and `2026-11-10T08:15:00` are deliberately not accepted as instants.

## Percentage: service reliability with aligned data

```ts
interface Service { name: string; successRate: number | undefined }
const serviceColumns = [
  { key: 'name', header: 'Service', align: 'start' },
  {
    key: 'successRate', header: 'Success rate', width: 140, align: 'right',
    format: {
      kind: 'number', locale: 'en-GB',
      options: { style: 'percent', maximumFractionDigits: 1 },
    },
  },
] satisfies GridColumn<Service>[]
// 0.995 -> 99.5%; 0 -> 0%; undefined -> blank.
```

A `greaterThanOrEqual` filter uses `0.99`, not `99` or `'99%'`; copy retains the
fraction. In RTL, `name` starts at the right while the percentage remains physically
right-aligned. Use `align: 'end'` if the percentage should follow logical flow
(left in RTL). This is text alignment, not a promise of mirrored grid navigation.

## Vue declarations and existing array APIs

```vue
<script setup lang="ts">
import { DataGrid, LitGridColumn, type GridValueFormat } from '@tipolox/litgrid-vue'
const data = [{ amount: 1234.5 }]
const money = {
  kind: 'number', locale: 'en-SG',
  options: { style: 'currency', currency: 'SGD' },
} satisfies GridValueFormat
</script>
<template>
  <DataGrid :data="data">
    <LitGridColumn field="amount" header="Amount (SGD)" align="right" :format="money" />
  </DataGrid>
</template>
```

Alternatively pass a #32 typed object with `:column="amountColumn"`. Keep the
descriptor stable between renders; replace it for a locale switch. An explicit
`:columns` array still wins over the slot. React `columns={columns}`, Angular
`[columns]="columns"`, Vue `:columns="columns"`, and direct `grid.columns = columns`
all use the same schema. Use public `updateColumnSchema(nextColumns)` to reconcile
later direct Web Component updates while retaining user state.

## Blazor JSON mapping (illustrative authoring, proposed types)

```csharp
using System.Text.Json.Nodes;
using Tipolox.LitGrid.Blazor;

var columns = new[] {
    new GridColumn {
        Key = "amount", Header = "Amount (SGD)", Align = "right",
        Format = new GridValueFormat {
            Kind = "number", Locale = "en-SG",
            Options = new JsonObject {
                ["style"] = "currency", ["currency"] = "SGD"
            }
        }
    }
};
```

This maps directly to the JavaScript descriptor above. Declarative
`LitGridColumn<TItem>` gains the same `Align`/`Format` metadata, not a .NET renderer
delegate. DateTimeOffset should serialize with an explicit offset; the shared
browser formatter uses the descriptor's timezone, independent of .NET culture.

## Current-package fallback: hoisted native Intl and `render`

```ts
const sgd = new Intl.NumberFormat('en-SG', {
  style: 'currency', currency: 'SGD', currencyDisplay: 'code',
})
const currentColumns = [{
  key: 'amount', header: 'Amount (SGD)',
  render: (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) ? sgd.format(value) : '',
}] satisfies GridColumn<LedgerRow>[]
```

This already formats JavaScript cells without constructing Intl per cell. It does
not add a column alignment setting or a Blazor callback transport. Clipboard and
queries already retain their current cell/source-value semantics. Under the
proposal, a column containing both `render` and `format` still calls `render`
with the unformatted cell value; the renderer owns its complete presentation.
