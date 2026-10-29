# Framework input synchronization

React, Vue, and Angular retain their existing public APIs. Normal immutable
`data` replacements synchronize automatically. The grid owns interaction
state; wrappers keep only snapshots of the inputs they last synchronized.

## Data and framework updates

A new local data array synchronizes the dataset and resets pagination to the
first page. Sorting and filters remain active. Reassigning the same array is
a supported mutable-data refresh: the grid revalidates identities and reruns
active transforms, retaining the current page and clamping it if rows shrink.
This corrects the previous reset-on-every-data-assignment behavior. Use the
existing `setPage(0)` when a deliberate page reset is needed.

Identical references do not prove that contents are unchanged. Every existing
local synchronization opportunity still processes same-array additions,
removals, row edits and identity edits. Offscreen duplicate and invalid keys
remain unselectable. There is no deep row comparison, full-array hash, mutation
observer, revision input, or new refresh/transaction API.

Mutation alone does not schedule a framework update:

- React synchronizes when an input-effect dependency changes. A parent render
  with stable explicit inputs does not rerun that effect. Omitting columns or
  configuration still creates the existing parent-update mutation opportunity.
  Development StrictMode does not adopt the same effect closure twice.
- Vue observes prop references rather than deep mutations. Changed props in
  one reactive update schedule one synchronization. Unchanged values schedule
  none. A changed existing prop still processes supported same-reference edits.
- Angular synchronizes after view initialization and on `ngOnChanges`. Normal
  change detection with unchanged inputs does not resynchronize. Changing an
  existing input still processes supported same-reference edits.

For ordinary application updates, replace the data array. This is the simplest
portable signal across frameworks. Existing mutable patterns remain supported
when a framework update actually triggers synchronization. Unrelated updates
can therefore still incur identity validation and sorting/filtering work;
guaranteed zero-row-work updates would violate that compatibility contract.

## Configuration and presentation

Theme, accessibility, dimensions, overscan, and debounce setters run only when
their values change. Configuration uses fixed-size snapshots normalized to
the core's supported defaults. Value comparisons use `Object.is`, preserving
numeric distinctions such as `NaN`, infinities and signed zero without JSON
serialization. Core scope equality retains its existing signed-zero semantics.

Equivalent configuration replacements do not reset interaction state. Actual
presentation/selection configuration changes retain pagination and reuse the
cached transformed view; changed pagination defaults apply deliberately.
Legacy local data adoption still follows configuration and performs necessary
row processing. Query-mode transitions retain their reset semantics.

Selection mode, row-key and scope changes clear selection before incoming rows
are adopted. Selection/query subscriptions precede initial synchronization and
are removed at teardown. Scope transitions cannot revive an older accepted
external result: released monotonic request validation still applies.

## Column schemas and persistence

Bindings compare the eight supported column fields: `key`, `header`, `width`,
`hidden`, `sortable`, `filterable`, `accessor`, and `render`. Snapshots detect
same-reference metadata edits, including callback identity. Work is linear in
column count and never traverses rows or cells. Equivalent replacements and
unrelated props do not reconcile schemas.

Genuine changes use existing `updateColumnSchema(columns, false, storageKey)`:

- Surviving keys retain user order, resized widths, and visibility.
- New keys append in schema order. Removed keys lose preferences; renames are
  removal plus addition.
- Changed width or hidden defaults override the corresponding preference.
  Other metadata edits retain it.
- Explicit-schema navigation follows a surviving visible key; removing or
  hiding that active column clears the active cell.
- Input array order does not override the user's order. Use existing
  `setColumnOrder` or `resetColumnOrder` for a deliberate order change.

Inferred schemas reconcile genuine local and accepted external row-shape
changes, including after user reordering. Matching inferred-to-explicit columns
retain preferences. Removed inferred active columns retain existing positional
keyboard clamping. Saved inferred preferences still do not restore on a fresh
mount in the existing Web Component; declare explicit columns for cross-mount
persistence.

Changing `columnStateStorageKey` atomically installs target schema/defaults
and restores that namespace's saved preferences. An unsaved namespace receives
defaults. Switching does not copy outgoing preferences or write the target
merely because it was selected. Unavailable storage retains existing fallback
behavior. Older structural elements without optional `updateColumnSchema`
keep their existing replacement-setter fallback.

Use distinct storage keys when account/site preferences must be isolated.
`selection.scopeKey` clears selection; it does not choose a storage namespace.
Remove unauthorized columns from the schema. Hiding columns and browser-local
preferences are presentation settings, not authorization.

## External queries

Continue using immutable controlled `externalState`, `query-change`, and the
existing `refreshQuery()`. Unrelated updates and equivalent configuration do
not replay controlled results or emit queries. Results are supplied when their
reference changes or a mode/selection change resets the controller; stale
requests remain rejected. Loading/error states, known/unknown totals, search
wording/visibility, debounce and typing-race behavior retain the released
protocol. No local refresh API is introduced by this milestone.
