import { mkdirSync, writeFileSync } from 'node:fs'
import { cpus, platform, release } from 'node:os'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Stage 3 compares *observable* behavior of the unchanged Core engine against
// H2/H3 built from the same source revision. Differences are evidence, not
// accepted regressions. Variants remain disposable and are never published.
const root = resolve(new URL('../../', import.meta.url).pathname)
const out = resolve(process.argv[2] || '.private/a3/stage3-differential.json')
const variants = ['baseline', 'noop-config', 'presentation-config']
const create = {}
for (const name of variants) {
  create[name] = (await import(pathToFileURL(resolve(root, '.private/a3/variants', name, 'index.js')).href)).createGridEngine
}
const assert = (value, message) => { if (!value) throw new Error(message) }
const config = (page = false, scope = 'a') => ({
  selection: { mode: 'multi-row', rowKey: 'id', scopeKey: scope },
  pagination: { enabled: page, pageSize: 2 }
})
function view(engine, events) {
  const selected = engine.getSelectionSnapshot()
  return {
    rows: engine.getRows().map(row => row?.id ?? null),
    keys: [...selected.rows].map(row => row.key),
    selectedIndexes: [...selected.rowIndexes],
    scope: selected.scopeKey,
    rowCount: engine.getRowCount(),
    selectable: engine.getSelectableRowCount(),
    pagination: engine.getPagination(),
    events: events.map(e => ({
      scope: e.scopeKey, keys: e.rows.map(row => row.key),
      rowIndexes: [...e.rowIndexes]
    }))
  }
}
function run(name, scenario) {
  const engine = create[name](config(scenario.startsWith('page-')))
  const events = []
  engine.onSelectionChange(event => events.push(event))
  const data = Array.from({ length: 4 }, (_, id) => ({ id, name: 'Person ' + id }))
  engine.setData(data)
  engine.selectRowByKey(0)
  events.length = 0
  const priorRows = engine.getRows()
  if (scenario === 'page-array-edit-identical' || scenario === 'page-array-edit-display') {
    // paginated getRows() is an independent slice of the source. Baseline
    // deliberately repaginates it on setConfig, recovering from a user edit.
    priorRows[0] = { id: 991, name: 'manual cell' }
  }
  if (scenario === 'row-key-inplace-identical' || scenario === 'row-key-inplace-display') {
    // No setData: the consumer directly mutates a selected row object.
    data[0].id = 991
  }
  if (scenario === 'scope-switch') {
    engine.setConfig(config(false, 'b'))
  } else if (scenario === 'pagination-switch') {
    engine.setConfig({ ...config(false), pagination: { enabled: true, pageSize: 2, pageIndex: 1 } })
  } else {
    const display = scenario.endsWith('display')
    engine.setConfig({
      ...config(scenario.startsWith('page-')),
      ...(display ? { rowHeader: { enabled: true, width: 66 }, quickSearch: { label: 'Find residents' } } : {})
    })
  }
  return {
    state: view(engine, events),
    pageArrayRetained: priorRows === engine.getRows()
  }
}
const scenarios = [
  'identical', 'display', 'page-identical', 'page-display',
  'page-array-edit-identical', 'page-array-edit-display',
  'row-key-inplace-identical', 'row-key-inplace-display',
  'scope-switch', 'pagination-switch'
]
const observations = []
for (const scenario of scenarios) {
  const baseline = run('baseline', scenario)
  for (const variant of variants.slice(1)) {
    const candidate = run(variant, scenario)
    const equality = JSON.stringify(baseline) === JSON.stringify(candidate)
    const diffFields = Object.keys(baseline.state).filter(key =>
      JSON.stringify(baseline.state[key]) !== JSON.stringify(candidate.state[key]))
    if (baseline.pageArrayRetained !== candidate.pageArrayRetained) diffFields.push('pageArrayRetained')
    observations.push({ scenario, variant, equal: equality, diffFields, baseline, candidate })
    console.log('A3 DIFFERENTIAL ' + JSON.stringify({scenario,variant,equal:equality,diffFields}))
  }
}
const expectedRisks = [
  { scenario: 'page-array-edit-identical', variant: 'noop-config' },
  { scenario: 'page-array-edit-identical', variant: 'presentation-config' },
  { scenario: 'page-array-edit-display', variant: 'presentation-config' },
  { scenario: 'row-key-inplace-identical', variant: 'noop-config' },
  { scenario: 'row-key-inplace-identical', variant: 'presentation-config' },
  { scenario: 'row-key-inplace-display', variant: 'presentation-config' }
]
// Fail this research harness if an expected safety probe fails to reveal a
// divergence. That means the fixture is no longer testing its intended risk.
for (const risk of expectedRisks) {
  const observed = observations.find(item =>
    item.scenario === risk.scenario && item.variant === risk.variant)
  assert(observed && !observed.equal,
    'Differential risk probe inconclusive: ' + JSON.stringify(risk))
}
const result = {
  purpose: 'A3 Stage 3 semantic-differential research; differences disqualify simple production fast paths',
  revision: process.env.GITHUB_SHA || null,
  environment: { node: process.version, platform: platform(), release: release(), cpu: cpus()[0]?.model },
  variants, scenarios, expectedRisks, observations,
  decision: 'Naive H2/H3 fast return variants are SEMANTICALLY NON-EQUIVALENT; do not ship without a narrower contract-safe design'
}
mkdirSync(dirname(out), {recursive:true})
writeFileSync(out, JSON.stringify(result,null,2) + '\n')
console.log('A3 differential research saved: ' + out)
