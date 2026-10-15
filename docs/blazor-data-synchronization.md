# Blazor data synchronization

LitGrid v1.1.0 makes `Automatic` the default for `DataGrid<TItem>`. Rows, columns and
configuration synchronize independently through ordinary Blazor JSON interop.

> **Migration warning for LitGrid v1.1.0:** Blazor's default changes from
> parent-update synchronization to `Automatic`. Apps that mutate plain lists or
> non-notifying rows and rely on parent rerenders must opt into `Legacy` or send
> an explicit change signal. The product owner accepts this breaking change in
> the coordinated **v1.1.0** minor release as a deliberate semantic-versioning
> exception. The compatibility switch does not make the change non-breaking.

## Default automatic behavior

```razor
<DataGrid TItem="Employee" Data="@employees" />

@code {
    private List<Employee> employees = [new() { Id = 1, Name = "Ada" }];
    private void Reload() => employees = [new() { Id = 2, Name = "Grace" }];
    public sealed class Employee
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
    }
}
```

Initial binding and replacement of the `Data` object synchronize automatically.
An unrelated parent render with the same source performs **zero dataset
enumeration, serialization, transfer, and grid data adoption**. No special
performance setting or revision is needed.

This is a notification/refresh contract. Reference equality does **not** prove
that arbitrary mutable content is unchanged. In-place `List<T>` additions,
removals, sorting, and edits to non-notifying rows require replacement, a revision
change, or `RefreshDataAsync()`. A newly created enumerable is a new source even
if it returns identical rows. Use repeatable, side-effect-free enumerables.

## Observable collections and items

`INotifyCollectionChanged` sources such as `ObservableCollection<T>` invalidate
rows on Add, Remove, Replace, Move, and Reset. They schedule the component's own
render; a parent render is unnecessary. Reference-counted item subscriptions
are maintained for reference `TItem` types implementing `INotifyPropertyChanged`.
One object appearing multiple times has one handler per grid. Distinct objects
with equal values remain independently subscribed.

```razor
@using System.Collections.ObjectModel
@using System.ComponentModel

<DataGrid TItem="Employee" Data="@employees" />

@code {
    private ObservableCollection<Employee> employees = [new() { Id = 1, Name = "Ada" }];
    private void Add() => employees.Add(new() { Id = 2, Name = "Grace" });
    private void Rename() => employees[0].Name = "Katherine";
    public sealed class Employee : INotifyPropertyChanged
    {
        public int Id { get; set; }
        private string name = "";
        public string Name
        {
            get => name;
            set
            {
                if (name == value) return;
                name = value;
                PropertyChanged?.Invoke(this, new(nameof(Name)));
            }
        }
        public event PropertyChangedEventHandler? PropertyChanged;
    }
}
```

Any property notification, including empty/null property names, invalidates the
whole dataset. Nested objects are not recursively observed. Declare the grid's
`TItem` as a notifying reference type to enable item tracking; runtime subtypes
hidden behind a non-notifying base type and mutable struct rows require explicit
refresh. For a plain list of notifying items, existing items are observed, but
structural list edits still require refresh/revision/replacement. That operation
also reconciles the item subscriptions.

Bursts use a bounded 1 ms scheduling window and one dataset synchronization per
render batch, with no per-row JS calls. Changes arriving during interop remain
pending for a subsequent synchronization. The latest state is sent; intermediate
states are not individually transferred. Separate changes outside a batch can
produce separate transfers. Notifications from background threads are marshaled
to the Blazor dispatcher. This does not make a collection thread-safe: do not
mutate it concurrently with serialization or subscription enumeration. Prefer
`await InvokeAsync(() => employees.Add(employee))` for collection writes.

Removed/replaced items are detached, Reset releases old items, and replacement
and component disposal detach the collection and all tracked items. Publishers
must implement conventional events using themselves as the sender. Custom event
accessors must permit safe subscribe/unsubscribe.

## Explicit refresh and optional revision

```razor
<DataGrid TItem="Employee" Data="@employees" @ref="grid" />

@code {
    private DataGrid<Employee>? grid;
    private List<Employee> employees = [new() { Id = 1, Name = "Ada" }];
    private async Task Rename()
    {
        employees[0].Name = "Grace";
        if (grid != null) await grid.RefreshDataAsync();
    }
    public sealed class Employee
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
    }
}
```

`RefreshDataAsync(): ValueTask` forces data synchronization through the existing
gate. Await it for interop completion; browser painting can follow afterward.
It is available after initialization through `@ref` in WASM and Interactive Server.
Before initialization or after disposal it throws `InvalidOperationException`.
Do not refresh unconditionally from parameter/render lifecycle callbacks.

`DataRevision: long?` remains optional. A changed revision, including null/non-null
transitions, invalidates data. Comparison uses equality, not ordering. For
non-notifying data, increment a revision after an in-place edit:

```razor
<DataGrid TItem="Employee" Data="@employees" DataRevision="@revision" />

@code {
    private long revision;
    private List<Employee> employees = [new() { Id = 1, Name = "Ada" }];
    private void Rename() { employees[0].Name = "Grace"; revision++; }
    public sealed class Employee
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
    }
}
```

The signals are additive:

| Signal | Automatic | Legacy |
| --- | --- | --- |
| Initial mount, new source, mode change | Synchronize | Synchronize |
| Changed revision, including null transitions | Synchronize | Synchronize |
| Collection/item notification, even with unchanged revision | Synchronize | Not observed |
| Same source/revision, unrelated parent update | No data work | Synchronize only when revision is null |
| Explicit refresh | Always force data | Always force data |
| Column/configuration-only or child-only schema change | No data work | Parent updates also send data when revision is null |
| Previously failed data operation | Pending for next render/refresh | Same |

Several pending signals can share one operation. Explicit refresh is always a
force request, so separate refresh calls can each transfer. A refresh followed
by an unchanged automatic parent update does not retransmit. An unchanged revision
never overrides replacement, a notification, explicit refresh, or a pending retry.
Only successful interop advances the captured synchronization state. There is no
unbounded automatic retry loop; unexpected failures reach the caller or Blazor
renderer. Navigation cancels pending work using the existing lifetime token.

Interactive Server synchronization uses the framework's configured interop
deadline (`CircuitOptions.JSInteropDefaultCallTimeout`, normally one minute).
Passing only a component-lifetime token would disable that deadline and can
leave a lost transport acknowledgment holding the synchronization gate after
reconnection. LitGrid preserves the runtime deadline and separately cancels its
own wait during disposal. A lost call can remain pending until that deadline;
successful reconnection alone is not an acknowledgment of the operation.

An explicit refresh reports timeout/disconnect failures to its caller. Render
and notification synchronization logs these recoverable interop failures and
retains pending state for a later render, notification, or explicit refresh.
It does not start an automatic retry loop or record the failed operation as
successful. Unexpected JavaScript setter errors still propagate. An expired
or terminated circuit requires the application's normal reload/new-circuit
recovery; LitGrid does not claim that it reconnected. Applications deliberately
disabling the framework deadline also disable that bound on lost interop calls.

## Legacy compatibility and migration

```razor
<DataGrid TItem="Employee" Data="@employees" DataSyncMode="DataSyncMode.Legacy" />
```

`Legacy` with the default null revision preserves published v1.0.3 semantics:
every parent parameter update synchronizes same-reference list/row mutations.
A mutation alone does not schedule a render. Legacy with a non-null revision
preserves B1's opt-in revision contract. Legacy does not subscribe to events.
No additional overlapping performance flags are introduced.

**Changing the default is a breaking behavior change.** Existing v1.0.3 apps that
mutate plain lists/rows and rely on parent rerenders must select Legacy, replace
the source, emit supported notifications, increment a revision, or refresh.
The compatibility switch does not make the default change semver-compatible.
The planned coordinated v1.1.0 release spans all six public npm
packages and Blazor NuGet. Public publication is not authorized. The default changed to remove full-dataset work from
ordinary unchanged parent updates without requiring a performance flag or revision.
The product owner explicitly accepts the breaking Blazor behavior in this minor
release; this is a deliberate semantic-versioning exception, not a claim of full
backward compatibility. For package alignment, first-registration behavior, and
asset-cache migration, see [Upgrading to v1.1.0](installation.md#upgrading-to-v110).
The earlier major-release recommendation remains in the historical investigation
report; the [final product-owner decision and review corrections](blazor-b11-review-corrections.md)
record the approved policy separately.

## Performance and limits

Unchanged automatic renders do no row work. Non-notifying row types need no
subscription scan. Notifying reference types use O(unique row objects) retained
tracking memory. Observable deltas maintain item membership without rescanning;
initial binding, Reset, refresh and revision changes reconcile in O(rows). Plain
lists of notifying items reconcile on each actual dataset update using a reused
membership table with staged counts, preserving subscriptions if enumeration
fails. New rows are subscribed only after a complete scan; failed scans remove
their staged rows and retain previously active subscriptions. Temporary lists
are allocated for introduced/removed rows rather than a complete membership copy.
A shared
handler avoids allocating one delegate per row. Disposal releases subscriptions
and dictionary capacity. Observable collection deltas maintain membership
immediately; Reset is reconciled at synchronization.

Changed data still uses full-dataset JSON transfer. Virtualization bounds DOM
work, not transfer size. Large non-AOT WASM initial loads and changed datasets
can still block the main thread. AOT remains an optional application build choice.
No row diffing, remote providers, local windowing, native templates, or engine
changes are included. Column/configuration value comparison and column-state
persistence retain B1 behavior. See the [B1.1 measurements and validation
report](blazor-milestone-b11-report.md) and [historical B1 report](blazor-milestone-b1-report.md).
