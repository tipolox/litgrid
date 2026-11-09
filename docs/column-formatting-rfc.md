# RFC: additive column alignment and display formatting (#34)

Status: **DESIGN ONLY — awaiting architect and founder review.**
Parent: [#27](https://github.com/tipolox/litgrid/issues/27).
Decision requested: approve the bounded contract below, or approve alignment alone.
No runtime implementation, release target, or performance qualification is implied.

## Recommendation and review gate

**GO for design review** of two optional column fields: `align` and `format`.
Use a small serializable descriptor delegating to native `Intl`; retain `render`
for arbitrary custom presentation. Keep transforms and clipboard behavior intact.
**NO-GO for production implementation until both the architect and founder review
this design.** After approval, implementation still needs the acceptance gates
below. Width constraints, formatted-value queries, clipboard modes, export APIs,
framework-native renderers and full RTL layout are outside this proposal.

Alignment can ship independently if formatting's validation, interop or measured
cost is unacceptable. Do not silently narrow the formatting contract while claiming
cross-framework parity. No change to package versions is proposed.

## Verified baseline and evidence

On 2026-11-10 (Asia/Singapore), fetched `origin/main` and verified it against
GitHub's merged #66: **`0b1a3135c91c86fb6fd87bc4504fe1a90ad0c4b8`**, matching
the supplied last verified SHA. Work is isolated in
`.worktrees/column-formatting-34`, branch `codex/34-column-formatting-design`.
The original workspace and A3 worktree are not edited.

- #66 (#33, Vue declarations) is merged at that SHA. Post-merge **push**
  [Verify run 42649708858](https://github.com/tipolox/litgrid/actions/runs/42649708858)
  succeeded on exactly that main SHA; [job 129272429264](https://github.com/tipolox/litgrid/actions/runs/42649708858/job/129272429264)
  and all **23 steps** succeeded, including source/published TypeScript, Angular
  and Vue consumers, JavaScript tests/builds, both browser checks and Blazor checks.
  The commit-workflow connector filters to PR events, so its empty result was
  insufficient; the push run and jobs were checked through GitHub's Actions API.
- #65 (#32, typed columns) is merged at
  `603437fcb13e931db576656f0f832a88d180acaa`. Reviewed the current type and
  [typed-column decision](typed-columns.md), including compatibility bivariance.
- Reviewed #34, parent #27, #32/#33, #65/#66 metadata, current source and tests,
  [Vue decision](vue-declarative-columns.md) and its validation report.
- Source inventory below is pinned to this baseline. Existing CI establishes
  baseline health; it does **not** validate the proposed API or its performance.

## 1. Current capability inventory

| Capability | Actual behavior at baseline |
| --- | --- |
| `key`, `header` | Literal string identity; label falls back to key. No nested-path lookup. Typed model keys are optional authoring checks. |
| `width` | Number or string in public type. Resolver recognizes a number or integer `px` string; other strings fall back to 160px. Resize/state normalization has a shared 64px floor. Declarative Blazor validates positive finite pixel widths more strictly. No per-column min/max. |
| `hidden` | Initial visibility plus keyed user overrides, chooser and persistence; hiding is presentation, not a query exclusion. |
| `sortable` | Defaults enabled. Hides/guards header sort actions when false; imperative `sortBy` still works, existing sort state is retained, and external mode still exposes query intents. |
| `filterable` | Defaults enabled. Hides/guards header column-filter controls; imperative filters, retained filters and quick search remain active. |
| `accessor(row, rowIndex)` | Used by cell rendering, best-fit and clipboard. Wins over property lookup. Callback index is current displayed row index, not a stable source identity. Does not feed core sort/filter/search. |
| `render(value, row, rowIndex)` | Receives accessor/property value; takes complete precedence over default display. Supports current Lit-compatible results, including templates/Nodes. No automatic framework-native cell renderer. Clipboard ignores it. |
| Default display | `null`/`undefined` → empty text; objects → `JSON.stringify`; other values → `String`. Missing property → empty string. Existing exceptional JSON cases are not normalized by this RFC. |
| Local sort | Core reads own/inherited `row[key]` on non-array objects when present, otherwise the whole row. Numbers compared numerically only when both are numbers; other values lowercased/string-compared using runtime `localeCompare`; nullish normalizes to empty string. No schema/accessor or declared display locale. |
| Local column filters | Same core field/whole-row lookup. AND across filters. Text uses locale lowercase/string comparison; numeric left operand coerces right operand with `Number` if possible. Empty means null/undefined/empty string. No date parser or localized currency parser. |
| Quick search | Scans primitive string/number/boolean/bigint values in object values, including hidden/non-column fields; primitive rows supported. No formatted labels, accessors or nested object traversal. |
| External mode | Sort/filter/search/page are query state; supplied result rows are rendered without local transforms. Server mapping, types, collation and date boundaries are consumer-owned. |
| Clipboard | Selected cells or rows, current visible-column order, current engine rows/page. Uses accessor/property plus default serialization; ignores render. TSV, no header, nullish empty, objects JSON. Sparse cell selections produce blank holes in a bounding rectangle. Existing tabs/newlines are not escaped. No full-dataset fetch. |
| Export | No public CSV/XLSX/export-value contract found. Clipboard is not a general export API. |
| Alignment/RTL | No column alignment field. Text may inherit direction, but headers, resize/reorder positions, horizontal scroll and ArrowLeft/Right contain physical assumptions. No verified full RTL grid contract. |
| State/reconciliation | `updateColumnSchema` preserves keyed user order/width/visibility on metadata updates; declared width/hidden changes replace corresponding overrides; removed keys lose customization. Explicit order updates and persistence namespace switches retain existing rules. Best-fit cache is cleared. Direct `columns` assignment has different replacement/reset semantics. |

Source anchors (relative paths refer to the verified tree):

- [`GridColumn`](../packages/grid-web/src/types.ts), [`DataGrid`](../packages/grid-web/src/components/DataGrid.ts):
  `getCellValue`, `formatCellValue`, `renderCell`, `computeColumnBestFit`,
  `getColumnCapabilities`, `updateColumnSchema`, clipboard methods and style/navigation.
- Core [`sorting`](../packages/grid-core/src/features/sorting/sorting.ts),
  [`filtering`](../packages/grid-core/src/features/filtering/filtering.ts),
  [`quick search`](../packages/grid-core/src/features/quick-search/quickSearch.ts).
- Clipboard [`cells`](../packages/grid-web/src/clipboard/serializeSelectedCells.ts)
  and [`rows`](../packages/grid-web/src/clipboard/serializeSelectedRows.ts);
  [`sizing`](../packages/grid-web/src/sizing/columnSizing.ts),
  [`column state`](../packages/grid-web/src/columnState/columnState.ts).
- React/Vue/Angular `gridBindings.ts` enumerate supported column fields and retain
  shallow snapshots; new fields cannot be added to the type alone.
- Vue [`marker`](../packages/grid-vue/src/LitGridColumn.ts) and
  [`parser`](../packages/grid-vue/src/declarativeColumns.ts) explicitly enumerate metadata.
- Blazor [`model`](../packages/grid-blazor/src/Models/GridColumn.cs),
  [`declaration`](../packages/grid-blazor/src/Components/LitGridColumn.cs) and
  [`registry`](../packages/grid-blazor/src/Columns/ColumnRegistry.cs) carry serializable
  metadata, not .NET callbacks executed for each browser cell.

## 2. Missing affordances ranked by practical value

| Rank | Need / practical example | Decision |
| --- | --- | --- |
| 1 | Align ledger amounts and ratios, including logical RTL alignment | Add `align`; low conceptual and runtime cost. |
| 2 | Reusable localized amount/percent/timestamp display without custom renderers | Add one `format` descriptor with two native Intl families, subject to review and measurement. |
| 3 | Explain values used by sort/filter/copy; prevent misleading computed-column affordances | Document now. For synthetic keys use `sortable: false, filterable: false` or materialize query fields; these flags only control UI. |
| 4 | Type-appropriate number/date filter entry | Defer. Current text input and generic operator list need a separate query/type/parsing design. Formatting is not a data type. |
| 5 | Copy exactly what is displayed, or export a machine-readable file | Defer public modes/callbacks until actual product requirements. Preserve raw copy now. |
| 6 | Per-column width floor/ceiling for identifiers, money and long descriptions | NO-GO now: existing width, resize, best-fit and shared minimum cover demonstrated needs. No concrete failing app case establishes precedence across resize, restore and viewport sizing. |
| 7 | New resize/reorder/hide flags, comparators, filter models, cell classes | Defer without concrete demand; do not build a broad behavior catalog. |

## 3. Recommended minimal public API (proposed, not available)

```ts
export type GridColumnAlign = 'start' | 'center' | 'end' | 'left' | 'right'

export type GridValueFormat =
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

// Add these to the common metadata part of GridColumn<TRow = unknown>:
// align?: GridColumnAlign
// format?: GridValueFormat
```

One existing shared column schema, two optional fields, two type-only exports.
The shared schema currently lives in `grid-web`, not the DOM-free `grid-core`.
Re-export types from the existing JavaScript adapter roots as for `GridColumn`.
No formatter factory, new generic parameter, grid locale prop or wrapper-specific
format shorthand in the first increment. Standard Intl options reuse the platform
vocabulary; no separate currency/date/percent fields or proprietary expression DSL.
Use `options.style: 'currency' | 'percent' | 'decimal'` as usual. The seven
number options and three date-time options shown above are the complete initial
allowlist. Units, significant-digit/rounding modes, granular date parts, calendars
and numbering-system overrides are deferred; use existing `render` when needed.

Descriptors are immutable snapshots: JSON-safe, own string-keyed data only,
with finite number, string or Boolean option values of the native option's type.
No functions, symbols, prototype getters, locale arrays, arbitrary extension keys
or non-serializable values. Absent options use native defaults. Unknown kinds,
unknown option names, wrong types, empty/invalid locale/timezone, missing required
currency and Intl construction errors reject the schema with column-key context.
Implementation must enforce exactly the option list above; new platform options
are not silently accepted. Do not coerce option strings into numbers or Booleans.
Unsupported well-formed locales use native locale negotiation; Intl/ICU/browser
versions can vary in punctuation and supported locales. Validation cannot promise
identical bytes on every environment.

Date-time formatting requires an explicit supported timezone (including `UTC`).
Locale is mandatory in both variants: no implicit browser/.NET/thread locale,
currency, timezone, locale-derived alignment or date/number inference. A locale
switch replaces descriptors. Applications needing host defaults resolve them
explicitly outside the grid. Descriptor validation happens before state changes,
including when `render` currently overrides display. Prior valid schema survives
a rejected update; retries follow existing adapter error handling.
`align` must be one of the five declared strings; invalid explicit values reject
the schema by the same atomic rule. Omitted fields remain valid defaults.

## 4. Exact value and operation semantics

Call these distinct values **source field**, **cell value**, **display text**.
Avoid calling all three simply the raw value.

| Stage | Required behavior |
| --- | --- |
| Source field | Core sort/filter lookup stays exactly as baseline, even if an accessor exists. Missing-key/whole-row fallback is preserved, not endorsed as a computed-value query. |
| Cell value | Evaluate existing accessor once for a normal rendered cell; otherwise existing property/empty-string lookup. No transformation of stored row data. |
| Display | If `render` exists, call it with cell value/row/display index; do not format its input or result. Otherwise if `format` exists, produce plain text with the compiled formatter. Otherwise take the unchanged default display path. |
| Best fit | Same presentation precedence as rendering. Measure formatted text in the existing bounded sample. Retain existing custom-renderer measurement behavior; never scan every row merely to format. Invalidate best-fit on format/locale change. |
| Sort/filter/search | Never consume display text, renderer result or descriptor. Never parse '$1,234.50', '12.5%' or localized dates from filter input. Existing numeric filter coercion and host-locale string behavior remain. |
| External queries | Serialize existing keys/operators/raw filter values only. Formatting/align changes emit no query intent, do not advance revision, refetch, clear selection or reset paging. No callback/Intl options sent as server query semantics. |
| Clipboard | Preserve existing accessor/property serialization in both copy methods, independent of `format`, `render` and `align`. `0.125` copies as `0.125` while displaying `12.5%`. ISO strings copy unchanged; Date objects retain existing JSON-quoted ISO behavior. Copying invalid numeric values retains baseline string behavior even if formatted display is blank. |
| Future export | No API added. A later export design should distinguish cell-value export from display export and specify delimiter, quoting, timezone and complete dataset scope. No assumption that a renderer can be scraped. |

### Opted-in formatting inputs, empty and invalid values

- All format kinds: null/undefined/missing → `''`; never turn them into zero or
  the Unix epoch. Formatting is display only; no data mutation or error badge API.
- Number: finite JavaScript numbers only, including zero and negative zero.
  Currency uses stored major units; percent uses fractions (`0.125` → `12.5%`).
  Numeric strings, Boolean, bigint, objects, NaN and infinities → `''`.
  No implicit division of cents or normalization of percentages. Apps use an
  accessor for presentation conversion, or materialize fields for local queries.
- Date-time: valid Date object, finite epoch **milliseconds** within ECMAScript
  Date's range, or a complete valid Gregorian ISO date-time string with explicit
  `Z`/`±HH:mm` offset. String grammar: `YYYY-MM-DDTHH:mm:ss[.S{1,7}](Z|±HH:mm)`;
  validate calendar/time components as well as parse finiteness. No rollover of
  impossible dates, locale strings, bare date-only or timezone-free timestamps.
  Reject leap seconds and 24:00; never guess seconds versus milliseconds. Offset
  parsing identifies the instant; `options.timeZone` controls its display.
  Accept .NET's up-to-seven fractional digits, truncating sub-millisecond digits
  to browser Date precision without rounding. Clipboard retains the input string.
- Other data/type mismatches → `''`, without throwing during cell render. A
  malformed **descriptor** is a schema error, a malformed **value** is empty text.
  Existing default/custom-render behavior remains unchanged when formatting is
  absent or overridden. Apps wanting '—' or an error indicator use `render`.
- Formatting can round money and lose displayed precision; clipboard and numeric
  comparisons retain the stored number. Intl does not solve floating-point money
  accuracy. Blazor decimal serialization to JS numbers keeps existing precision
  limits; exact-decimal arithmetic is outside scope.

### Alignment, accessibility and RTL boundary

`align` applies to body cell text and its column's header label, including a
custom renderer's outer cell. It does not rearrange renderer-internal flex/layout
or header actions. Omitted alignment follows today's styles. `start`/`end` follow
the inherited writing direction; `left`/`right` remain physical; `center` centers.
For an RTL label: start = right, end = left. Numeric examples choose physical
right for a fixed numeric edge; applications can choose end when logical flow is
desired. No numeric auto-detection, reversed schema order or new `dir` property.

Use CSS text alignment and a header-label region, without per-cell wrapper nodes.
Keep roles, DOM/logical indices, keyboard order, aria-sort and focus/selection
unchanged. Screen readers get the visible formatted text, never a second hidden
raw value that duplicates the accessible name. Keep currency/percent text and
unambiguous date labels; do not communicate information with alignment alone.
Renderer authors retain responsibility for accessible interactive content.

**This does not certify full RTL grid operation.** Existing scroll coordinates,
resize/reorder handles, pinned row header, menus and arrow navigation need separate
review. Test text alignment in RTL without claiming those physical assumptions
have been fixed. If fully mirrored RTL is required for #34 acceptance, NO-GO for
that expanded scope until a dedicated design is reviewed; do not reverse DOM order
or force the viewport's direction as an incidental formatting change.

## 5. Compatibility, dynamic schemas and framework ownership

- Existing `GridColumn[]`, JavaScript consumers, renderers and inferred columns
  need no migration. Optional properties do not change existing defaults.
  Adding them must not change #32's conditional key/accessor rules or the
  legacy bivariant callback boundary. No value inference from the format kind:
  accessor/render results remain `unknown`, typed rows remain `TRow`.
- React/Angular/Vue array paths must add both fields to supported metadata
  comparisons/snapshots. Compare alignment by value and formatting via a bounded
  normalized primitive options snapshot, not nested descriptor identity alone.
  Detect nested option edits at an existing synchronization opportunity without
  adding deep watchers. No row equality checks, extra default setter calls or
  repeated JSON serialization. Calling `updateColumnSchema` explicitly is the
  direct Web Component update path; arbitrary in-place mutation does not itself
  schedule updates.
- A format-only update retains active column key, selection, user width/order/
  visibility, query revision/page and persistence namespace. Remove/readd keeps
  current loss-of-customization semantics. Preserve explicit width/hidden and
  `applyOrder` rules. Persisted column state stays version 1: formatting/alignment
  belong to application schema and are not user-state fields.
- Vue #33: add `align`/`format` to marker props, metadata parser and comparison
  paths; `:column="typedColumn"` retains #32 typing. Inline fields still do not
  infer the row model from the parent. Explicit array wins, slot-empty/inference
  distinctions, fragments, `v-if`/`v-for` and error recovery stay unchanged.
  Do not mount cell components or add format slots.
- Blazor: add nullable `Align` and serializable `Format` to both `GridColumn`
  and `LitGridColumn<TItem>`, registry snapshots/equality and JS interop. Suggested
  C# representation: `GridValueFormat` with string `Kind`, string `Locale` and
  `System.Text.Json.Nodes.JsonObject? Options`, plus centralized allowed-option
  validation matching the shared descriptor. This avoids duplicating the entire
  Intl vocabulary as .NET format strings. Clone option values into snapshots so
  mutation cannot alter a prior comparison baseline. ISO strings from serialized
  DateTimeOffset use the same browser formatter; use explicit offsets/UTC on the
  .NET side. C# validation and browser validation must agree. No .NET callback per
  cell, `.ToString("C")` output sent as money, or current-culture fallback.
- Native Date objects from JS and ISO strings after JSON interop display the same
  instant in the chosen timezone. Prefer epoch milliseconds where local temporal
  sorting is needed; ISO strings with differing offsets sort lexically today.
  Materialize an epoch field or use external server sorting for that case.
- Ship all supported adapter metadata paths together. A version accepting the new
  type while silently dropping it in one wrapper is a release blocker. Old
  structural mocks/older Web Components need no change unless opting in; tests
  must not claim new-field support from those older implementations.

## 6. Alternatives considered

| Alternative | Why not choose it for this increment? |
| --- | --- |
| Just `render` and examples | Zero new formatting API and a valid fallback. Does not give Blazor a serializable shared formatter or distinguish plain display from rich rendering/best-fit handling. |
| `format(value, row, index): string` callback | Small and flexible for JS, but duplicates part of render and cannot cross Blazor JSON interop. Would need another formatter vocabulary for Blazor. Reconsider if reviewers reject declarative Intl scope. |
| Public `createNumberFormatter` / `formatDate` helpers | Applications can already hoist native Intl. Adds exports without addressing descriptor transport or synchronization; demonstrate hoisting instead. |
| Formatting in grid-core transforms | Core does not own columns or display. Would couple local/server query semantics to presentation, add row work and risk breaking accessor behavior. |
| Adapter-specific currency/date props or .NET format strings | Multiple contracts and locales, inconsistent copy/query behavior and larger maintenance surface. |
| `type: 'currency'/'date'` drives queries, filters, widths and alignment | A display choice does not establish stored type, server operators or percent scale. Too much implicit behavior. |
| Accessor automatically becomes sort/filter input | Changes existing behavior, requires schema in core, and can make displayed-index accessors unstable under sorting. Separate explicit query-value design/versioning decision. |
| Copy formatted text by default; infer export from DOM | Breaks machine-value copy and fails with virtualization/custom renderers. No DOM scraping. |
| Per-cell Intl construction or unbounded global descriptor cache | Allocations/GC or retained schema/locale memory. Compile once per adopted changed schema, retain only active column formatters. |
| New min/max widths now | Needs demonstrated need and explicit sizing precedence, not necessary for alignment/formatting. |

## 7. Performance design and acceptance plan

No implementation performance claim is made in this RFC. Expected costs:

- Schema adoption: O(columns × supported option count) validation/snapshots and
  one Intl construction per new/changed formatted column. Reuse compiled entries
  for unchanged key/descriptor; drop removed entries and all entries on teardown.
  No global cache, whole-row result cache, or formatter construction during render.
- Rendering: omitted `format` follows the existing serialization/render branch.
  The extra optional-field check can still have a small cost; measure it rather
  than treating an additive API as evidence of zero overhead.
  Only opted cells invoke Intl; date strings add validation/parsing and may create
  a Date. Pass epoch milliseconds directly to Intl when possible. String output
  allocations are unavoidable; do not allocate a per-cell context/options object.
  Alignment should be cached schema metadata/CSS; preserve the unconfigured DOM
  and avoid per-cell inline style objects or extra wrappers.
- Formatting visits only the existing visible/overscan row × column window,
  bounded best-fit samples, or values explicitly copied (copy itself remains raw).
  Do not alter virtualization ranges, row heights, scroll mapping or refresh
  invalidation. Opted formatters must not scan offscreen rows/hidden columns.
- Preserve same-reference data handling and B1 refresh semantics. Locale updates
  rerender visible cells without reapplying local transforms or fetching data.

Proposed approval-stage checks (future implementation, not run as new tests here):

| Layer | Required checks |
| --- | --- |
| Unit / values | Zero/negative/null/undefined/missing, rounding, fraction scale, negative zero, invalid type/NaN/infinity; valid/invalid Date, epoch boundaries, offset strings, invalid calendar/leap day, DST boundaries, date-only/offset-free rejection; no HTML interpretation. Use pinned ICU for exact snapshots or `formatToParts`/semantic assertions for portable checks. |
| Precedence / copy | Accessor once per normal cell; render wins and gets unformatted value; default serializer unchanged; cells/rows use raw cell values including sparse holes, hidden columns, reorder, pagination, tabs/newlines and Date JSON. No offscreen renderer invoked for copy. |
| Query | Numeric money sort vs rounded text, percent filters on fractions, existing computed-field discrepancy; string/date sorting limits documented; disabling header controls retains imperative behavior; quick search unchanged. External format/locale/align edits keep exact revision/selection/page and emit zero queries. |
| Schema / state | Replacement and nested option edit at existing sync points; reused descriptor identity; removed/readded keys; hide/reorder/resize; invalid schema atomic rollback/recovery; storage namespace switch and persisted remount; best-fit invalidation; no leaked cache after teardown. |
| Types / adapters | Source and freshly built published declarations; positive/negative typed columns and callback compatibility; actual strict Angular and Vue template consumers; React props; Vue inline/typed marker fields, arrays-vs-slots, empty slot, v-if/v-for, fragments and recovery. Blazor JSON wire parity, option cloning, registration/order and failed-update retry. |
| Browser / accessibility | Chromium real custom element plus existing React/Vue/Angular/Blazor lifecycles. LTR/RTL all five alignment values, labels vs action controls, mixed-direction currency/date text, focus and aria-sort/indices/selection under two-axis virtualization. Screen-reader spot check of formatted text; no full RTL certification. |
| Repository | Existing Verify gates: strict authored/public/published TypeScript, strict Angular/Vue consumers, regression suites, builds, adapter and Vue Chromium checks, Blazor test/build. Do not modify A3 experiments to conduct this work. |

Benchmark against exact approved base in a separate harness/worktree, production
builds on the same machine/browser. Reuse the #33 workload dimensions: 5k/30k
rows, 3/120 columns, array/inferred/Vue declarations. Include mount, steady vertical
and horizontal scrolling, presentation-only update, schema/locale update, B1 row
refresh and bounded best-fit. Cases: unconfigured baseline, align only, one/all
visible number columns, epoch dates, ISO dates, and existing equivalent render
callbacks using hoisted Intl. Warm up; alternate base/candidate order for at least
15 paired rounds. Report median/p95, paired distributions, DOM row/cell counts,
schema/config/data setter counts, Intl construction/format invocation counts,
and allocation/heap/GC profiles with environment/build details.

Hard structural gates: zero Intl work for unconfigured columns, zero Intl
construction during steady rendering, no additional default setter calls, no
offscreen formatting outside declared best-fit work, unchanged virtualized DOM
bounds and bounded cache retention. Provisional timing gate: investigate a
repeatable default-path median or p95 rise exceeding **max(5%, 0.5ms)** in a paired
workload; require review before accepting it. Record variance and rerun only an
unresolved noisy case. For opted-in formatting report absolute cost and comparison
to the equivalent hoisted-Intl renderer; choose workload budgets with reviewers
before implementation rather than inventing a zero-cost guarantee.

## 8. Review decisions and deliverable limits

Architect/founder review must settle: descriptor vs callback/helper-only scope;
explicit locale/timezone policy and the bounded Intl option list; strict ISO input
grammar/blank-invalid behavior; raw clipboard retention; text-only RTL boundary;
and whether JSON option objects are acceptable Blazor authoring ergonomics.

The recommended answer is GO for this **two-field additive design**, conditional
on those decisions and future gates. Production implementation is NO-GO pending
both reviews. If a review requires query/accessor changes, formatted-copy modes,
full RTL layout or typed filtering, split that requirement into a separately
reviewed contract rather than expanding this RFC implicitly.

See [consumer examples](column-formatting-examples.md). They are design snippets,
not compiled against today's packages. This PR changes documentation only. No
runtime/test/config/dependency changes, benchmark execution, merge, release,
version bump, package publication, deployment or issue closure is authorized here.

Documentation validation for this draft: an ignored local checker compiled all
four TypeScript example blocks with TypeScript 6.0.3 in strict mode against the
actual baseline `GridColumn` type shape intersected with the proposed metadata.
Five negative contracts checked model-key rejection, alignment bounds, required
timezone, deferred unit style and deferred granular date options. Balanced code
fences, 18 relative links and the native percent/Singapore-time example outputs
passed. This validates the snippets' proposed type relationships, not a production
implementation. Vue SFC and C# snippets remain illustrative, not compiled. The
checker is not part of the PR. No new runtime tests or benchmarks were run for
this documentation-only change; verified post-merge baseline CI is linked above.
