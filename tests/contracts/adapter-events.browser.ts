import { createElement, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { createApp, h, nextTick, shallowRef } from 'vue'
import '@angular/compiler'
import { bootstrapApplication } from '@angular/platform-browser'
import { DataGrid as ReactGrid, type DataGridRef } from '@tipolox/litgrid-react'
import { DataGrid as VueGrid, type DataGridInstance } from '@tipolox/litgrid-vue'
import { DataGridComponent } from '@tipolox/litgrid-angular'
import type {
  ColumnStateChangeDetail, ColumnReorderDetail, ColumnVisibilityChangeDetail,
  SelectionChangeDetail, GridQueryChangeDetail, GridConfig, GridColumn, DataGridElement
} from '@tipolox/litgrid-web'
import { DataGrid as WebGrid } from '@tipolox/litgrid-web'

type Framework = 'react' | 'vue' | 'angular'
type EventDetails = {
  state: ColumnStateChangeDetail
  reorder: ColumnReorderDetail
  visibility: ColumnVisibilityChangeDetail
  selection: SelectionChangeDetail
  query: GridQueryChangeDetail
}
type Key = keyof EventDetails
const names: Record<Key, string> = {
  state: 'column-state-change', reorder: 'column-reorder',
  visibility: 'column-visibility-change', selection: 'selection-change', query: 'query-change'
}
const keys = Object.keys(names) as Key[]
const callbacks = (received: Record<Key, unknown[]>) => ({
  onColumnStateChange: (detail: ColumnStateChangeDetail) => received.state.push(detail),
  onColumnReorder: (detail: ColumnReorderDetail) => received.reorder.push(detail),
  onColumnVisibilityChange: (detail: ColumnVisibilityChangeDetail) => received.visibility.push(detail),
  onSelectionChange: (detail: SelectionChangeDetail) => received.selection.push(detail),
  onQueryChange: (detail: GridQueryChangeDetail) => received.query.push(detail)
})
const empty = (): Record<Key, unknown[]> => ({ state: [], reorder: [], visibility: [], selection: [], query: [] })
function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message)
}
function equal(actual: unknown, expected: unknown, message: string) {
  check(JSON.stringify(actual) === JSON.stringify(expected), `${message}: ${JSON.stringify(actual)}`)
}

async function mount(framework: Framework, external: boolean, received: Record<Key, unknown[]>) {
  const host = document.createElement(framework === 'angular' ? 'litgrid-data-grid' : 'div')
  document.body.append(host)
  const data = [{ id: 1, name: 'Ada', role: 'Engineer' }, { id: 2, name: 'Grace', role: 'Admiral' },
    { id: 3, name: 'Lin', role: 'Engineer' }, { id: 4, name: 'Edsger', role: 'Engineer' }]
  const columns: GridColumn[] = [{ key: 'id' }, { key: 'name' }, { key: 'role' }]
  const config: GridConfig = {
    queryMode: external ? 'external' : 'local',
    selection: { mode: 'row', rowKey: 'id', scopeKey: 'a2' },
    pagination: { enabled: true, pageSize: 2 }
  }
  const props = { data: external ? [] : data, columns, config }
  let instance: DataGridRef | DataGridInstance | DataGridComponent | null = null
  let update: (next: Record<Key, unknown[]>) => Promise<void>
  let destroy: () => void
  if (framework === 'react') {
    const root = createRoot(host)
    const render = (next: Record<Key, unknown[]>) => flushSync(() => root.render(
      createElement(StrictMode, {}, createElement(ReactGrid, {
        ...props, ...callbacks(next), ref: value => { instance = value }
      }))
    ))
    render(received)
    update = async next => { render(next) }
    destroy = () => { flushSync(() => root.unmount()); check(instance === null, 'React ref cleared') }
  } else if (framework === 'vue') {
    const handlers = shallowRef(callbacks(received))
    const component = shallowRef<DataGridInstance | null>(null)
    const app = createApp({ render: () => h(VueGrid, { ...props, ...handlers.value, ref: component }) })
    app.mount(host)
    await nextTick()
    instance = component.value
    update = async next => { handlers.value = callbacks(next); await nextTick() }
    destroy = () => { app.unmount(); check(component.value === null, 'Vue ref cleared') }
  } else {
    const app = await bootstrapApplication(DataGridComponent)
    const ref = app.components[0]
    const component: DataGridComponent = ref.instance
    instance = component
    const subscribe = (next: Record<Key, unknown[]>) => {
      const handlers = callbacks(next)
      return [component.columnStateChange.subscribe(handlers.onColumnStateChange),
        component.columnReorder.subscribe(handlers.onColumnReorder),
        component.columnVisibilityChange.subscribe(handlers.onColumnVisibilityChange),
        component.selectionChange.subscribe(handlers.onSelectionChange),
        component.queryChange.subscribe(handlers.onQueryChange)]
    }
    let subscriptions = subscribe(received)
    for (const [key, value] of Object.entries(props)) ref.setInput(key, value)
    ref.changeDetectorRef.detectChanges()
    update = async next => {
      subscriptions.forEach(subscription => subscription.unsubscribe())
      subscriptions = subscribe(next)
      ref.changeDetectorRef.detectChanges()
    }
    // Keep output subscribers alive so detached-grid checks detect leaked template listeners.
    destroy = () => { app.destroy(); check(ref.hostView.destroyed, 'Angular view destroyed') }
  }
  // React assigns refs during the commit rather than in this lexical scope.
  const api = instance as DataGridRef | DataGridInstance | DataGridComponent | null
  check(api?.gridElement, `${framework} exposes its Web Component ref`)
  const grid: DataGridElement = api.gridElement
  check(grid === host.querySelector('yc-grid'), 'component ref matches mounted element')
  check(grid instanceof WebGrid && grid.constructor === customElements.get('yc-grid'), 'real registered Web Component')
  if (external) {
    const snapshot = api.getQuery()
    check(api.setExternalState({ ...snapshot, rows: data.slice(0, 2), total: { kind: 'known', totalRows: 4 } }),
      'external result accepted through component ref')
  }
  await grid.updateComplete
  return { api, grid, update, destroy: () => { destroy(); host.remove(); check(!grid.isConnected, 'grid disconnected') } }
}

async function run(framework: Framework, external: boolean) {
  const first = empty(), latest = empty(), raw = empty()
  const mounted = await mount(framework, external, first)
  const { api, grid } = mounted
  const listeners = keys.map(key => {
    const listener = (event: Event) => {
      check(event instanceof CustomEvent, `${key} is a CustomEvent`)
      check(event.target === grid, `${key} originates on the grid`)
      raw[key].push(event.detail)
    }
    grid.addEventListener(names[key], listener)
    return () => grid.removeEventListener(names[key], listener)
  })
  const clear = () => { for (const key of keys) { first[key].length = 0; latest[key].length = 0; raw[key].length = 0 } }
  const delivered = (key: Key, count: number) => {
    equal(latest[key].length, count, `${key} callback count`)
    equal(raw[key].length, count, `${key} runtime count`)
    check(latest[key].every((detail, index) => detail === raw[key][index]), `${key} forwards original detail`)
    equal(first[key].length, 0, `${key} old callback unsubscribed`)
  }
  let destroyed = false
  try {
    // Repeated updates exercise React effect replacement/StrictMode and Vue handler updates.
    await mounted.update(first)
    await mounted.update(latest)
    clear()
    api.moveColumn('name', 0)
    delivered('reorder', 1)
    equal(latest.reorder[0], { columnKey: 'name', previousIndex: 1, currentIndex: 0, columnOrder: ['name', 'id', 'role'] }, 'reorder payload')
    delivered('state', 1)
    equal(latest.state[0], { reason: 'reorder', state: api.getColumnState() }, 'versioned state payload')
    clear()
    api.setColumnVisible('role', false)
    delivered('visibility', 1)
    equal(latest.visibility[0], { columnKey: 'role', visible: false, visibleColumnKeys: ['name', 'id'] }, 'visibility payload')
    delivered('state', 1)
    equal(latest.state[0], { reason: 'visibility', state: api.getColumnState() }, 'visibility state payload')
    clear()
    check(api.selectRowByKey(1), 'selection through component ref')
    delivered('selection', 1)
    const snapshot = api.getSelectionSnapshot()
    equal(snapshot.rows.map(row => row.key), [1], 'selection keys')
    equal(snapshot.rowIndexes, [0], 'selection indexes are arrays')
    check(latest.selection[0] === snapshot && Object.isFrozen(snapshot.rows), 'immutable selection snapshot')
    clear()
    api.setPage(1)
    if (external) {
      delivered('query', 1)
      check(grid.getQuery, 'external query API')
      equal(grid.getQuery().query.pageIndex, 1, 'external pagination intent')
    } else equal(api.getPagination().pageIndex, 1, 'local pagination retained')
    clear()
    api.setQuickSearch('Ada')
    if (external) {
      delivered('query', 1)
      check(grid.getQuery, 'external query API')
      equal(latest.query[0], { ...grid.getQuery(), reason: 'search' }, 'external query payload')
      equal(grid.getQuery().query.search, 'Ada', 'external query value')
    } else delivered('query', 0)
    clear()
    mounted.destroy()
    destroyed = true
    // All five events are produced by the detached Web Component itself.
    grid.moveColumn('id', 0)
    grid.setColumnVisible('role', true)
    grid.config = { queryMode: external ? 'external' : 'local', selection: { mode: 'none', scopeKey: 'detached' } }
    if (external) {
      check(grid.refreshQuery, 'refresh API')
      grid.refreshQuery()
    }
    check(raw.state.length > 0 && raw.reorder.length === 1 && raw.visibility.length === 1, 'detached grid emitted column events')
    check(raw.selection.length > 0, 'detached grid emitted selection event')
    if (external) check(raw.query.length > 0, 'detached grid emitted query event')
    for (const key of keys) equal(latest[key].length, 0, `${key} cleaned up after unmount`)
    return { framework, mode: external ? 'external' : 'local', status: 'PASS' }
  } finally {
    listeners.forEach(remove => remove())
    if (!destroyed) mounted.destroy()
  }
}

declare global { interface Window { runAdapterEvents: () => Promise<unknown[]> } }
window.runAdapterEvents = async () => {
  const results = []
  for (const framework of ['react', 'vue', 'angular'] as const) {
    for (const external of [false, true]) {
      // A fresh second mount catches subscription/ref state leaking across instances.
      for (let mount = 1; mount <= 2; mount++) {
        const label = `${framework}/${external ? 'external' : 'local'}/mount-${mount}`
        console.log(`Checking ${label}`)
        let timeout = 0
        try {
          const result = await Promise.race([
            run(framework, external),
            new Promise<never>((_, reject) => {
              timeout = window.setTimeout(() => reject(new Error(`${label} timed out`)), 15000)
            })
          ])
          results.push({ ...result, mount })
        } finally { window.clearTimeout(timeout) }
      }
    }
  }
  return results
}
