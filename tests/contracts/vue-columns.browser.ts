import { compile, createApp, h, nextTick, reactive, shallowRef, type Component } from 'vue'
import { DataGrid, LitGridColumn, type DataGridInstance, type DataGridRuntimeInstance, type GridColumn } from '@tipolox/litgrid-vue'
import { DataGrid as WebGrid } from '@tipolox/litgrid-web'

function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message)
}
function equal(actual: unknown, expected: unknown, message: string) {
  check(JSON.stringify(actual) === JSON.stringify(expected), `${message}: ${JSON.stringify(actual)}`)
}
const tick = async (api: DataGridInstance) => { await nextTick(); await (api.gridElement as WebGrid).updateComplete }

async function lifecycle() {
  const state = reactive({ fields: ['id', 'name'], extra: true, header: 'Name', width: 220, identity: 1 })
  const host = document.createElement('div')
  document.body.append(host)
  const storageKey = 'litgrid-vue-declarative-contract'
  localStorage.removeItem(storageKey)
  const data = [{ id: 1, name: 'Ada', role: 'Engineer' }, { id: 2, name: 'Grace', role: 'Admiral' }]
  let forwarded = 0
  let destroyed = false
  const app = createApp({
    components: { DataGrid, LitGridColumn },
    setup: () => ({ state, data, storageKey, onSelection: () => { forwarded++ }, config: { selection: { mode: 'row', rowKey: 'id' } } }),
    render: compile(`<DataGrid ref="grid" :data="data" :height="400" :config="config" :column-state-storage-key="storageKey" @selection-change="onSelection">
      <LitGridColumn v-for="field in state.fields" :key="state.identity + field" :field="field" :header="field === 'name' ? state.header : field" :width="field === 'name' ? state.width : 80" />
      <LitGridColumn v-if="state.extra" field="role" />
    </DataGrid>`)
  })
  const vm = app.mount(host)
  const api = vm.$refs.grid as DataGridRuntimeInstance
  try {
    await tick(api)
    const grid = api.gridElement as WebGrid
    check(grid instanceof WebGrid, 'built Vue package uses real registered Web Component')
    equal(api.getColumnOrder(), ['id', 'name', 'role'], 'compiled initial declarations')
    check(grid.shadowRoot?.textContent?.includes('Ada'), 'basic declarative cells render')
    api.selectRowByKey(1)
    api.setColumnWidth('name', 333)
    api.setColumnVisible('role', false)
    api.moveColumn('name', 0)
    state.header = 'Person'; await tick(api)
    equal(api.getColumnOrder(), ['name', 'id', 'role'], 'metadata preserves user order')
    check(api.getColumnState().columns.find(c => c.key === 'name')?.width === 333, 'resize preserved')
    check(!api.isColumnVisible('role'), 'visibility preserved')
    check(api.getSelectionSnapshot().rows[0]?.key === 1, 'selection preserved')
    state.fields = ['name', 'id']; await tick(api)
    equal(api.getColumnOrder(), ['name', 'id', 'role'], 'compiled v-for reorder')
    const viewport = grid.shadowRoot!.querySelector<HTMLElement>('[role="grid"]')!
    viewport.focus()
    viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await grid.updateComplete
    const active = viewport.getAttribute('aria-activedescendant')
    check(active && grid.shadowRoot!.getElementById(active), 'keyboard establishes an accessible active cell')
    state.header = 'User'; await tick(api)
    equal(viewport.getAttribute('aria-activedescendant'), active, 'metadata retains active cell')
    api.sortBy('id', 'desc')
    api.setFilter({ columnKey: 'name', operator: 'contains', value: 'a' })
    state.identity++; await tick(api)
    check(api.getFilters().length === 1, 'filters retained on Vue identity change')
    check(api.refreshRow(1), 'B1 refresh remains available')
    state.extra = false; await tick(api)
    equal(api.getColumnOrder(), ['name', 'id'], 'compiled v-if teardown')
    state.fields = []; await tick(api)
    equal(api.getColumnOrder(), [], 'all declarations removed disables inference')
    state.fields = ['id', 'name']; await tick(api)
    equal(api.getColumnOrder(), ['id', 'name'], 'columns remount')
    api.setColumnWidth('name', 290)
    api.setColumnVisible('id', false)
    // Native detached events must not reach the destroyed wrapper listener.
    app.unmount(); destroyed = true
    const before = forwarded
    grid.dispatchEvent(new CustomEvent('selection-change', { detail: {} }))
    check(forwarded === before && !grid.isConnected, 'destroyed wrapper removes its native listeners')
    const second = createApp({ render: () => h(DataGrid, { data, columnStateStorageKey: storageKey }, {
      default: () => ['id', 'name'].map(field => h(LitGridColumn, { field, width: field === 'name' ? 220 : 80 }))
    }) })
    second.mount(host)
    try {
      await nextTick()
      const restored = host.querySelector('yc-grid') as WebGrid
      await restored.updateComplete
      check(restored.getColumnState().columns.find(c => c.key === 'name')?.width === 290, 'persisted width restored on new mount')
      check(!restored.isColumnVisible('id'), 'persisted visibility restored on new mount')
    } finally { second.unmount() }
    return { compiledTemplate: true, dynamicColumns: true, userState: true, navigation: true, refresh: true, persistenceRemount: true }
  } finally {
    if (!destroyed) app.unmount()
    host.remove(); localStorage.removeItem(storageKey)
  }
}

async function externalLifecycle() {
  const header = shallowRef('Name')
  const api = shallowRef<DataGridInstance | null>(null)
  const host = document.createElement('div'); document.body.append(host)
  let queries = 0
  const config = { queryMode: 'external' as const, selection: { mode: 'row' as const, rowKey: 'id' }, pagination: { enabled: true, pageSize: 2 } }
  const data: unknown[] = []
  const app = createApp({ render: () => h(DataGrid, { ref: api, data, config, onQueryChange: () => { queries++ } }, {
    default: () => [h(LitGridColumn, { field: 'id' }), h(LitGridColumn, { field: 'name', header: header.value })]
  }) })
  try {
    app.mount(host); await tick(api.value!)
    const component = api.value!
    const query = component.getQuery()
    check(component.setExternalState({ ...query, rows: [{ id: 1, name: 'Ada' }], total: { kind: 'known', totalRows: 1 } }), 'external result adopted')
    component.selectRowByKey(1)
    const before = queries
    header.value = 'Person'; await tick(component)
    equal(component.getQuery(), query, 'declarative metadata preserves external query revision')
    check(queries === before, 'metadata emits no redundant external query')
    check(component.getSelectionSnapshot().rows[0]?.key === 1, 'external selection retained')
    check(component.gridElement!.shadowRoot!.textContent!.includes('Ada'), 'external adopted rows remain visible')
    return true
  } finally { app.unmount(); host.remove() }
}

const stats = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  return { median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .95))] }
}
async function workload(component: Component, count: number, width: number, mode: 'array' | 'omitted' | 'declarative') {
  const data = Array.from({ length: count }, (_, id) => ({ id, name: `Person ${id}`, role: 'Engineer' }))
  const columns: GridColumn[] = Array.from({ length: width }, (_, index) => ({
    key: index === 0 ? 'id' : index === 1 ? 'name' : `c${index}`, width: 100,
    ...(index > 1 ? { accessor: (row: { id: number }) => row.id + index } : {})
  }))
  const props = shallowRef({ data, height: 400, ...(mode === 'array' ? { columns } : {}) })
  const api = shallowRef<DataGridInstance | null>(null)
  const host = document.createElement('div'); document.body.append(host)
  const counts = { schema: 0, data: 0, config: 0, inference: 0 }
  const prototype = WebGrid.prototype
  const original = prototype.updateColumnSchema
  prototype.updateColumnSchema = function (...args) { counts.schema++; return original.apply(this, args) }
  const descriptors = new Map<string, PropertyDescriptor>()
  for (const key of ['data', 'config', 'inferColumns'] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, key)!
    descriptors.set(key, descriptor)
    Object.defineProperty(prototype, key, { ...descriptor, set(value: unknown) {
      counts[key === 'inferColumns' ? 'inference' : key]++
      descriptor.set!.call(this, value)
    } })
  }
  const app = createApp({ render: () => h(component, { ...props.value, ref: api }, mode === 'declarative'
    ? { default: () => columns.map(column => h(LitGridColumn, { column })) } : undefined) })
  try {
    const start = performance.now(); app.mount(host); await tick(api.value!)
    const mountMs = performance.now() - start
    const grid = api.value!.gridElement as WebGrid
    check(api.value!.getColumnOrder().length === (mode === 'omitted' ? 3 : width), 'workload schema size')
    const mountCounts = { ...counts }
    for (const key of Object.keys(counts) as (keyof typeof counts)[]) counts[key] = 0
    const latencies = []
    for (let i = 0; i < 24; i++) {
      const start = performance.now()
      props.value = { ...props.value, height: 400 + (i % 2) }
      await tick(api.value!)
      if (i >= 4) latencies.push(performance.now() - start)
    }
    check(grid.shadowRoot!.querySelectorAll('[role="row"]').length < 100, 'large workload remains virtualized')
    return { count, width, mode, mountMs, updatesMs: stats(latencies), mountCounts, updateCounts: { ...counts } }
  } finally {
    app.unmount(); host.remove(); prototype.updateColumnSchema = original
    for (const [key, descriptor] of descriptors) Object.defineProperty(prototype, key, descriptor)
  }
}

export async function runVueColumns() {
  const behavior = { ...await lifecycle(), externalQuery: await externalLifecycle() }
  const baselinePath = '/.private/vue-columns-baseline/DataGrid.ts'
  const baseline = window.compareVueColumns ? (await import(/* @vite-ignore */ baselinePath)).DataGrid as Component : undefined
  const workloads = []
  // Warm the module/JIT paths, then alternate pair order across repeated rounds.
  if (baseline) {
    await workload(baseline, 5_000, 3, 'array')
    await workload(DataGrid, 5_000, 3, 'array')
  }
  for (let round = 0; round < (baseline ? 15 : 1); round++) {
    for (const count of [5_000, 30_000]) {
      for (const width of [3, 120]) {
        const modes: ('array' | 'omitted' | 'declarative')[] = width === 3 ? ['array', 'omitted', 'declarative'] : ['array', 'declarative']
        for (const mode of modes) {
          if (mode === 'declarative') workloads.push({ round, variant: 'candidate', ...await workload(DataGrid, count, width, mode) })
          else {
            const pair = (count === 5_000) !== (round % 2 === 1) ? [['baseline', baseline], ['candidate', DataGrid]] as const
              : [['candidate', DataGrid], ['baseline', baseline]] as const
            const results = []
            for (const [variant, component] of pair) if (component) {
              const result = { round, variant, ...await workload(component, count, width, mode) }
              results.push(result); workloads.push(result)
            }
            if (results.length === 2) {
              equal(results[0].mountCounts, results[1].mountCounts, 'default-path mount setter parity')
              equal(results[0].updateCounts, results[1].updateCounts, 'default-path update setter parity')
            }
          }
        }
      }
    }
  }
  return { behavior, workloads }
}
declare global {
  interface Window {
    compareVueColumns: boolean
    runVueColumns: typeof runVueColumns
  }
}
window.runVueColumns = runVueColumns
