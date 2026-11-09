# Column alignment and display formatting (#34)

This implementation follows the separately retained [design PR #67](https://github.com/tipolox/litgrid/pull/67)
at `4a8591bfe98fa285ad9f64f32345aa82af239959` and its
[architectural approval](https://github.com/tipolox/litgrid/pull/67#issuecomment-6745283654).
It is submitted for independent review; no release or merge is implied.

## Public contract

`GridColumn<TRow = unknown>` gains two optional metadata fields:

```ts
align?: 'start' | 'center' | 'end' | 'left' | 'right'
format?: GridValueFormat
```

`GridColumnAlign` and `GridValueFormat` are type-only exports from the Web,
React, Vue and Angular package roots. The existing typed-key, accessor and
renderer signatures are unchanged. Formatting does not infer a stored data type.

```ts
type GridValueFormat =
  | {
      kind: 'number'
      locale: string
      options?: Pick<Intl.NumberFormatOptions,
        | 'currency' | 'currencyDisplay' | 'currencySign' | 'useGrouping'
        | 'minimumFractionDigits' | 'maximumFractionDigits'
      > & { style?: 'decimal' | 'currency' | 'percent' }
    }
  | {
      kind: 'dateTime'
      locale: string
      options: Pick<Intl.DateTimeFormatOptions, 'dateStyle' | 'timeStyle'>
        & { timeZone: string }
    }
```

These seven number and three date/time option names are the entire allowlist.
No unit, granular date-parts, significant-digit or rounding-mode API is added.
`useGrouping` accepts native Booleans and native `auto`/`always`/`min2` values;
the latter's type availability follows the consumer's TypeScript Intl library.
String `'true'`/`'false'`, numeric strings and other coercions are rejected.
Fraction digit counts retain the native numeric option semantics.

Locale is explicit. Date/time also requires an explicit supported timezone.
Well-formed unsupported locales use native negotiation; invalid locales,
timezones, currency syntax and option combinations reject schema adoption.
Currency uses native Intl validation (a syntactically valid three-letter code
does not establish that a real-world currency exists). Browser/ICU versions can
vary in punctuation and locale coverage. No implicit .NET/thread/browser culture
or currency is inferred. Descriptors contain plain JSON-safe data; getters,
symbols, unsupported fields, wrong types and prototype objects are rejected.

## Values and precedence

1. Obtain the existing cell value from `accessor(row, displayedRowIndex)` or
   literal row-key lookup. Missing keys use the existing empty-string fallback.
2. If `render` is present, it receives that unformatted value and owns the entire
   result. It overrides `format`; its descriptor is still validated on adoption.
3. Otherwise `format` produces plain text. Best fit measures that same text in
   its existing bounded sample. Formatting does not interpret HTML.
4. Without either field, the existing rendering/default serializer remains.

Number formatting accepts finite JavaScript numbers, including zero/negative
zero. Null, undefined, missing values, numeric strings, Boolean, bigint, objects,
NaN and infinities display blank. Currency uses major units; percentages use
fractions (`0.125` → `12.5%`). Display rounding does not change stored precision.

Date/time accepts valid Date objects, finite in-range epoch **milliseconds**, or
strict Gregorian timestamps `YYYY-MM-DDTHH:mm:ss[.S{1,7}](Z|±HH:mm)`. Calendar
dates, time and offset components are checked; impossible dates do not roll over.
Date-only and offset-free strings, leap seconds, 24:00 and invalid values display
blank. .NET fractional seconds beyond milliseconds are truncated without rounding.
The offset identifies the instant; `options.timeZone` determines display.

Malformed descriptors fail before active schema/cache mutation. Malformed cell
values display blank. Custom placeholders/indicators use existing `render`.

## Queries, copy and state

Local sorting/filtering still read the core's source field, **not** an accessor
or formatted label. Quick search still scans the existing raw primitive row
values. Filter with `1000`, `0.99` or epoch milliseconds as appropriate; the grid
does not parse localized currency/percent/date input. Existing date strings are
sorted lexically; normalize an epoch query field or use server sorting when
different offsets occur. Synthetic/accessor-only keys can hide query controls
with existing `sortable: false, filterable: false`; imperative APIs remain active.

Both clipboard methods retain accessor/property values and the existing default
serialization. Thus `12.5%` copies as `0.125`, currency as a number, ISO strings
unchanged, and Date objects through existing JSON serialization. No new copy mode,
delimiter/quoting change, export API or complete-dataset fetch is introduced.

External queries remain consumer-owned raw keys/operators/values. Format, locale
and alignment updates do not change query revision, page or selection. Existing
B1 row/range refresh remains available.

Use `updateColumnSchema(nextColumns)` for direct Web Component reconciliation.
Metadata edits preserve keyed user width/order/visibility and active column.
Declared width/hidden changes, explicit reordering, removal/readdition and
persistence namespace switches retain their existing rules. Formatting is schema
metadata, not persisted column state; state version stays 1. Direct `columns`
assignment retains its existing replacement behavior after successful validation.

## Alignment and framework behavior

Body cells use effective flex justification; header labels fill the label region
and align their text independently of header controls. Physical left/right stay
physical; start/end follow inherited direction. Center centers. Custom renderer
content is positioned by its outer cell; its internal layout remains its own.
No default alignment, automatic numeric alignment or extra cell wrapper is added.
Roles, logical indices, keyboard navigation and accessible formatted text remain.
This qualifies **text-level RTL alignment**, not mirrored/full RTL grid support.
Text bidi ordering follows the inherited direction and native Intl output; alignment
does not force Latin numeric runs to LTR. Review sign/symbol ordering for the chosen
locale, or use the existing renderer for application-specific bidi isolation.

React/Vue/Angular propagate both fields and detach option snapshots at existing
synchronization opportunities. Nested option edits are detected when an existing
input update triggers synchronization; no deep watcher or new setter loop is
added. Replace objects/arrays when immediate reactive updates are required.

Imperative schema adoption throws a contextual TypeError named
`GridColumnPresentationError`, retaining the last valid grid. Vue reports through
its normal error handler and Angular through its update/error boundary. React
reports this specific presentation failure through `console.error`, keeps the
mounted grid, and retries at the next input synchronization; throwing from its
effect would unmount the valid grid. Other React errors retain their existing
behavior. A failed attempt never becomes the adapter's successful snapshot.

Vue supports both `:columns` and inline `<LitGridColumn align="right"
:format="money" />`, or `:column="typedColumn"`. Existing explicit-array
precedence, empty slot, inference, fragments and dynamic declaration rules remain.

Blazor adds nullable `Align`/`Format` on `GridColumn` and `LitGridColumn<TItem>`.
`GridValueFormat` contains `Kind`, `Locale` and `JsonObject? Options`. Detached,
structurally equal snapshots detect mutable options without retaining the user's
JsonObject. .NET validates the structural allowlist/types; browser Intl validates
native locale/zone/currency/range support before adopting any browser schema.
Do not substitute .NET culture/timezone support for browser locale negotiation.
Known presentation failures are logged through the existing Blazor logger instead
of escaping render lifecycle and terminating a Server circuit. Invalid child
metadata blocks synchronization while retaining valid registry entries; correction
or removal clears that bounded error state. Unrelated errors retain their behavior,
and explicit refresh still surfaces failures to its caller.
Both declared and opted-in programmatic metadata edits preserve keyed user state;
entirely unconfigured programmatic inputs retain their historical replacement
path. No .NET per-cell callbacks or .NET format-string language is introduced.

## Examples

```ts
import type { GridColumn } from '@tipolox/litgrid-web'
interface RecordRow { amount: number | null; openedAtMs: number; success: number }
const columns = [
  { key: 'amount', header: 'Amount (SGD)', align: 'right', format: {
    kind: 'number', locale: 'en-SG', options: {
      style: 'currency', currency: 'SGD', currencyDisplay: 'code',
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    },
  } },
  { key: 'openedAtMs', header: 'Opened (Singapore)', format: {
    kind: 'dateTime', locale: 'en-GB', options: {
      timeZone: 'Asia/Singapore', dateStyle: 'medium', timeStyle: 'short',
    },
  } },
  { key: 'success', header: 'Success rate', align: 'end', format: {
    kind: 'number', locale: 'en-GB', options: {style: 'percent', maximumFractionDigits: 1},
  } },
] satisfies GridColumn<RecordRow>[]
```

```csharp
new GridColumn {
    Key = "amount", Align = "right",
    Format = new GridValueFormat {
        Kind = "number", Locale = "en-SG",
        Options = new System.Text.Json.Nodes.JsonObject {
            ["style"] = "currency", ["currency"] = "SGD"
        }
    }
};
```

Intl instances are compiled on schema adoption and reused by unchanged keys and
descriptors. Removed/disconnected entries are released; reconnect compiles active
metadata again. There is no global cache, per-cell formatter construction or
unconfigured Intl work. Date string parsing and output strings still cost work in
opted-in visible cells. See the implementation validation report for measurements.

Plain formatting compiles into a renderer function on detached **internal** column
definitions only when no consumer renderer exists. Public input objects remain
unchanged. Cell rendering uses the original renderer/default-serialization body;
best-fit and column-state restore reuse that same compiled path. Alignment classes
are cached at adoption and applied by the existing class getters. Teardown drops
generated renderer closures as well as cache entries, and reconnect preserves
keyed user order/width/visibility while restoring the presentation plan.
