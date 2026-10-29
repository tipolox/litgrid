import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { createApp, h, shallowRef, nextTick } from 'vue'
import '@angular/compiler'
import { bootstrapApplication } from '@angular/platform-browser'

const params = new URLSearchParams(location.search)
const framework = params.get('framework'), root = window.a1Roots[params.get('variant')]
const entry = framework === 'react' ? 'grid-react/src/DataGrid.tsx' : framework === 'vue' ? 'grid-vue/src/DataGrid.ts' : 'grid-angular/src/DataGridComponent.ts'
const adapter = await import(/* @vite-ignore */ `/@fs/${root}/packages/${entry}`)
const { DataGrid: WebGrid } = await import(/* @vite-ignore */ `/@fs/${root}/packages/grid-web/src/components/DataGrid.ts`)
let counts = {}, transforms = []
for (const key of ['data', 'columns', 'config', 'externalState']) {
  const descriptor = Object.getOwnPropertyDescriptor(WebGrid.prototype, key)
  Object.defineProperty(WebGrid.prototype, key, { ...descriptor, set(value) { counts[key] = (counts[key] ?? 0) + 1; descriptor.set.call(this, value) } })
}
for (const key of ['updateData', 'updateColumnSchema']) {
  const original = WebGrid.prototype[key]
  if (original) WebGrid.prototype[key] = function (...args) { counts[key] = (counts[key] ?? 0) + 1; return original.apply(this, args) }
}
const reset = () => { counts = {}; globalThis.__transforms = []; transforms = globalThis.__transforms }
const capture = () => ({ setters: { ...counts }, transforms: transforms.length, transformMs: transforms.reduce((a, b) => a + b, 0) })
const frames = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
const stats = values => {
  const sorted = [...values].sort((a, b) => a - b)
  return { n: values.length, p50: sorted[Math.ceil(sorted.length * .5) - 1], p95: sorted[Math.ceil(sorted.length * .95) - 1], raw: values }
}
async function mount(initial) {
  const host = document.createElement(framework === 'angular' ? 'litgrid-data-grid' : 'div')
  document.body.append(host)
  let update, destroy, grid
  if (framework === 'react') {
    const component = createRoot(host)
    update = async props => { flushSync(() => component.render(React.createElement(StrictMode, null, React.createElement(adapter.DataGrid, props)))); grid = host.querySelector('yc-grid'); await grid.updateComplete }
    destroy = () => { flushSync(() => component.unmount()); host.remove() }
  } else if (framework === 'vue') {
    const state = shallowRef(initial)
    const app = createApp({ render: () => h(adapter.DataGrid, state.value) })
    app.mount(host)
    update = async props => { state.value = props; await nextTick(); grid = host.querySelector('yc-grid'); await grid.updateComplete }
    destroy = () => { app.unmount(); host.remove() }
  } else {
    const app = await bootstrapApplication(adapter.DataGridComponent)
    const ref = app.components[0]
    ref.instance.queryChange.subscribe(initial.onQueryChange ?? (() => {}))
    update = async props => {
      for (const [key, value] of Object.entries(props)) {
        if (key === 'onQueryChange' || key === 'dataRevision' && params.get('variant') === 'baseline') continue
        ref.setInput(key, value)
      }
      ref.changeDetectorRef.detectChanges(); grid = ref.instance.gridElement; await grid.updateComplete
    }
    destroy = () => { app.destroy(); host.remove() }
  }
  await update(initial)
  return { get grid() { return grid }, update, destroy }
}

window.runA1 = async ({ count, revision, samples }) => {
  let data = Array.from({ length: count }, (_, id) => ({ id, name: `Person ${id}`, role: 'Engineer' }))
  let columns = [{ key: 'id', width: 100 }, { key: 'name', width: 160 }, { key: 'role', width: 160 }, ...Array.from({ length: 117 }, (_, id) => ({ key: `c${id}`, width: 100, accessor: row => row.id + id }))]
  const config = { selection: { mode: 'multi-row', rowKey: 'id', scopeKey: 'a' }, pagination: { enabled: true, pageSize: 50 } }
  let props = { data, columns, config, ...(revision ? { dataRevision: 0 } : {}) }
  reset()
  const start = performance.now(), mounted = await mount(props), grid = mounted.grid
  await frames()
  const mountMs = performance.now() - start, mountWork = capture()
  const selectionStart = performance.now()
  grid.selectRowByKey(1)
  await grid.updateComplete
  const firstSelectionMs = performance.now() - selectionStart
  grid.setFilter({ columnKey: 'role', operator: 'equals', value: 'Engineer' })
  grid.sortBy('id', 'asc')
  grid.setPage(2)
  grid.selectRow(1)
  grid.setColumnWidth('name', 240)
  grid.setColumnVisible('role', false)
  grid.moveColumn('c116', 0)
  await grid.updateComplete
  const viewport = grid.shadowRoot.querySelector('.viewport')
  viewport.focus()
  viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  await grid.updateComplete
  const state = JSON.stringify(grid.getColumnState()), selection = JSON.stringify(grid.getSelectionSnapshot())
  const focus = grid.shadowRoot.activeElement, active = viewport.getAttribute('aria-activedescendant')
  const checks = { page: true, columns: true, selection: true, focus: true, active: true, filter: true, mutation: true, replacement: true, schema: true, virtualized: true }
  const operations = {}
  for (const fresh of [false, true]) {
    reset(); const times = []
    for (let index = 0; index < samples; index++) {
      props = { ...props, ariaLabel: `People ${fresh}-${index}`, theme: index % 2 ? 'dark' : 'light', ariaDescription: `Help ${index}`, screenReaderAnnouncements: index % 2 === 0, height: index % 2 ? 360 : 320,
        config: fresh ? { ...config } : config, columns: fresh ? columns.map(column => ({ ...column })) : columns }
      const start = performance.now(); await mounted.update(props); times.push(performance.now() - start)
      checks.page &&= grid.getPagination().pageIndex === 2
      checks.columns &&= JSON.stringify(grid.getColumnState()) === state
      checks.selection &&= JSON.stringify(grid.getSelectionSnapshot()) === selection
      checks.focus &&= grid.shadowRoot.activeElement === focus
      checks.active &&= viewport.getAttribute('aria-activedescendant') === active
      checks.filter &&= grid.getFilters().length === 1
    }
    operations[fresh ? 'unrelatedFresh' : 'unrelatedStable'] = { latencyMs: stats(times), ...capture() }
  }
  reset(); const replace = []
  for (let index = 0; index < 10; index++) {
    data = [...data]; props = { ...props, data }
    const start = performance.now(); await mounted.update(props); replace.push(performance.now() - start)
    checks.replacement &&= grid.getTotalRowCount() === count && grid.getPagination().pageIndex === 0
  }
  operations.replacement = { latencyMs: stats(replace), ...capture() }
  reset(); const mutate = []
  for (let index = 0; index < 10; index++) {
    data[0].name = `Edited ${index}`
    props = { ...props, ariaLabel: `Mutation ${index}`, ...(revision ? { dataRevision: index + 1 } : {}) }
    const start = performance.now(); await mounted.update(props); mutate.push(performance.now() - start)
    checks.mutation &&= grid.shadowRoot.textContent.includes(`Edited ${index}`)
  }
  operations.mutation = { latencyMs: stats(mutate), ...capture() }
  reset(); const schema = []
  for (let index = 0; index < 10; index++) {
    columns[1].header = `Name ${index}`
    props = { ...props, columns: [...columns] }
    const start = performance.now(); await mounted.update(props); schema.push(performance.now() - start)
    checks.schema &&= grid.getColumnWidth(columns[1]) === 240 && grid.getColumnOrder()[0] === 'c116' && !grid.isColumnVisible('role')
  }
  operations.schema = { latencyMs: stats(schema), ...capture() }
  const scrollStart = performance.now()
  viewport.scrollLeft = 5000
  viewport.dispatchEvent(new Event('scroll'))
  await grid.updateComplete; await frames()
  const scrollFrameWaitMs = performance.now() - scrollStart
  checks.virtualized = grid.shadowRoot.querySelectorAll('.cell').length < 2000 && grid.shadowRoot.querySelectorAll('.column-header').length < 120
  const visibleCells = grid.shadowRoot.querySelectorAll('.cell').length
  mounted.destroy()
  return { count, revision, columnCount: 120, mountMs, mountWork, firstSelectionMs, operations, scrollFrameWaitMs, visibleCells, checks }
}

window.checkExternal = async () => {
  const events = []
  const config = { queryMode: 'external', selection: { mode: 'row', rowKey: 'id', scopeKey: 'a' }, quickSearch: { visible: true, label: 'Search names', placeholder: 'Name', description: 'Names only' } }
  const externalState = { requestId: 1, query: { search: '', filters: [], sort: { columnKey: null, direction: null }, pageIndex: 0, pageSize: 25 }, rows: [{ id: 1, name: 'North' }], total: { kind: 'unknown', hasMore: true } }
  let props = { data: [], columns: [{ key: 'name' }], config, externalState }
  props.onQueryChange = detail => events.push(detail)
  const mounted = await mount(props), grid = mounted.grid
  grid.selectRowByKey(1); grid.setPage(1)
  const pending = grid.getQuery()
  reset()
  for (let index = 0; index < 10; index++) await mounted.update({ ...props, config: { ...config }, ariaLabel: `External ${index}` })
  const stable = events.length === 1 && grid.getQuery().requestId === pending.requestId && !counts.externalState
  props = { ...props, externalState: { ...externalState, ...pending } }
  await mounted.update(props)
  const lateRejected = grid.setExternalState(externalState) === false
  grid.setQuickSearch('Nor'); const nor = grid.getQuery()
  grid.setQuickSearch('Nort'); const nort = grid.getQuery()
  const norRejected = grid.setExternalState({ ...externalState, ...nor }) === false
  const nortAccepted = grid.setExternalState({ ...externalState, ...nort }) === true
  const wording = grid.shadowRoot.querySelector('input')?.getAttribute('aria-label') === 'Search names'
  const beforeDestroy = events.length
  mounted.destroy(); grid.refreshQuery()
  const cleanup = events.length === beforeDestroy
  return { passed: stable && lateRejected && norRejected && nortAccepted && wording && cleanup, stable, lateRejected, norRejected, nortAccepted, wording, cleanup, events: beforeDestroy }
}
window.checkColumns = async () => {
  localStorage.clear()
  const data = Array.from({ length: 400 }, (_, id) => ({ id, name: `Person ${id}`, role: 'Engineer' }))
  const columns = [{ key: 'id' }, { key: 'name' }, { key: 'role' }]
  let props = { data, columns, dataRevision: 0, config: { selection: { mode: 'row', rowKey: 'id' }, pagination: { enabled: true, pageSize: 50 } }, columnStateStorageKey: 'namespace/a' }
  const mounted = await mount(props), grid = mounted.grid
  grid.setColumnWidth('name', 240); grid.moveColumn('role', 0); grid.setColumnVisible('role', false)
  grid.setPage(2); grid.selectRowByKey(101)
  await grid.updateComplete
  const state = JSON.stringify(grid.getColumnState()), saved = localStorage.getItem('namespace/a')
  await mounted.update({ ...props, ariaLabel: 'Unrelated' })
  const savedPreferences = JSON.stringify(grid.getColumnState()) === state
  columns[1].header = 'Full name'
  await mounted.update({ ...props, ariaLabel: 'Metadata' })
  const metadata = JSON.stringify(grid.getColumnState()) === state && grid.shadowRoot.textContent.includes('Full name')
  await mounted.update({ ...props, columns: [{ key: 'name' }, { key: 'renamed' }], columnStateStorageKey: 'namespace/b' })
  const namespaceWidth = grid.getColumnWidth({ key: 'name' })
  const namespaceDefaults = namespaceWidth === 160 && grid.getColumnOrder().join() === 'name,renamed'
  const noContamination = localStorage.getItem('namespace/a') === saved && localStorage.getItem('namespace/b') === null
  await mounted.update(props)
  const restoredOwnNamespace = JSON.stringify(grid.getColumnState()) === state
  const viewport = grid.shadowRoot.querySelector('.viewport')
  viewport.focus()
  viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
  await grid.updateComplete
  const activeKey = () => {
    const cell = grid.shadowRoot.getElementById(viewport.getAttribute('aria-activedescendant'))
    return cell && grid.getVisibleColumnKeys()[+cell.getAttribute('data-column-index')]
  }
  const before = activeKey()
  await mounted.update({ ...props, columns: [{ key: 'name' }, { key: 'role' }] })
  const navigationByKey = activeKey() === before
  await mounted.update({ ...props, columns: [{ key: 'role' }] })
  const removedActiveCleared = !viewport.hasAttribute('aria-activedescendant')
  mounted.destroy(); localStorage.clear()
  const inferred = await mount({ data, columns: [], dataRevision: 0 })
  inferred.grid.setColumnWidth('name', 240); inferred.grid.moveColumn('role', 0); inferred.grid.setColumnVisible('id', false)
  await inferred.update({ data: [{ name: 'New schema', added: 'New field' }], columns: [], dataRevision: 0 })
  const inferredSchema = inferred.grid.getColumnOrder().join() === 'name,added' && inferred.grid.getColumnWidth({ key: 'name' }) === 240
  inferred.destroy()
  const initial = { requestId: 1, query: { search: '', filters: [], sort: { columnKey: null, direction: null }, pageIndex: 0, pageSize: 25 }, rows: data.slice(0, 25), total: { kind: 'unknown', hasMore: true } }
  const remoteProps = { data: [], columns: [], config: { queryMode: 'external' }, externalState: initial }
  const remote = await mount(remoteProps)
  remote.grid.moveColumn('role', 0); remote.grid.setColumnWidth('name', 240)
  await remote.update({ ...remoteProps, externalState: { ...initial, requestId: 2, rows: [{ id: 999, name: 'Remote', added: 'New field' }] } })
  const inferredExternalSchema = remote.grid.getColumnOrder().join() === 'id,name,added' && remote.grid.getColumnWidth({ key: 'name' }) === 240 && remote.grid.setExternalState(initial) === false
  remote.destroy()
  const savedInferredProps = { data, columns: [], dataRevision: 0, columnStateStorageKey: 'inferred/saved' }
  const savedInferred = await mount(savedInferredProps)
  savedInferred.grid.setColumnWidth('name', 240)
  savedInferred.destroy()
  const remountedInferred = await mount(savedInferredProps)
  const inferredPersistenceRestored = remountedInferred.grid.getColumnWidth({ key: 'name' }) === 240
  remountedInferred.destroy(); localStorage.clear()
  return { passed: savedPreferences && metadata && namespaceDefaults && noContamination && restoredOwnNamespace && navigationByKey && removedActiveCleared && inferredSchema && inferredExternalSchema,
    savedPreferences, metadata, namespaceDefaults, namespaceWidth, noContamination, restoredOwnNamespace, navigationByKey, removedActiveCleared, inferredSchema, inferredExternalSchema,
    knownLimitations: { inferredPersistenceRestored } }
}
window.a1Ready = true
