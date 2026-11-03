import { mkdirSync, writeFileSync } from 'node:fs'
import { cpus, platform, release, totalmem } from 'node:os'
import { dirname, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { createGridEngine } from '../../packages/grid-core/dist/index.js'

// Baseline-only, non-gating performance inventory for A3 / #43.
// Fixture creation, warm-up and correctness probes are excluded from timers.
const out = resolve(process.argv[2] ?? '.private/a3-core-baseline.json')
const counts = [30_000, 100_000]
const runs = 40
const warmups = 5
const keyed = { selection: { mode: 'multi-row', rowKey: 'id' } }
const unkeyed = { selection: { mode: 'multi-row' } }

function assert(condition, message) {
  if (!condition) throw new Error('A3 correctness probe failed: ' + message)
}
function summarize(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b)
  const at = p => sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)]
  return { n: numbers.length, p50: at(0.5), p95: at(0.95), min: sorted[0], max: sorted.at(-1) }
}
function validateIdentityRules() {
  const grid = createGridEngine(keyed)
  const data = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 0 }]
  grid.setData(data)
  assert(grid.selectRowByKey(0) === false, 'duplicate source key must be rejected')
  assert(grid.selectRowByKey(1) === true, 'unique source key must be selectable')
  grid.clearSelection()
  data[2].id = 0
  grid.setData(data)
  assert(grid.selectRowByKey(0) === false, 'third duplicate must stay unselectable')
  data[2].id = 2
  data[3].id = 3
  grid.setData(data)
  assert(grid.selectRowByKey(0) === true, 'identity must be selectable after duplicate removal')

  const paged = createGridEngine({
    selection: { mode: 'multi-row', rowKey: 'id' },
    pagination: { enabled: true, pageSize: 2 }
  })
  paged.setData([{ id: 0 }, { id: 1 }, { id: 2 }, { id: 0 }])
  assert(paged.selectRowByKey(0) === false, 'off-page duplicate must be rejected')
  assert(paged.selectRowByKey(1) === true, 'distinct page key must be selectable')
}
function run(rows, operation) {
  const data = Array.from({ length: rows }, (_, id) => ({ id, name: 'Fictional ' + id }))
  const config = operation === 'cold-unkeyed' ? unkeyed : keyed
  let grid = createGridEngine(config)
  if (!operation.startsWith('cold-')) grid.setData(data)
  let mutationCounter = 0
  const measure = () => {
    if (operation.startsWith('cold-')) grid = createGridEngine(config)
    if (operation === 'tail-mutation') data[rows - 1].id = rows + mutationCounter++
    const begin = performance.now()
    if (operation === 'config-only') grid.setConfig(config)
    else grid.setData(data)
    return performance.now() - begin
  }
  for (let i = 0; i < warmups; i++) measure()
  // GC is intentionally outside the measured region, and is not forced
  // per sample. This is neither a production latency SLA nor a GC-free test.
  if (global.gc) global.gc()
  const samples = Array.from({ length: runs }, measure)
  assert(grid.getTotalRowCount() === rows, operation + ': total row count')
  if (operation === 'tail-mutation') {
    assert(grid.selectRowByKey(data[rows - 1].id) === true, 'latest tail mutation is selectable')
  } else if (operation !== 'cold-unkeyed') {
    assert(grid.selectRowByKey(0) === true, operation + ': first key is selectable')
  }
  return { rows, operation, stats: summarize(samples), samples, heapUsedAfter: process.memoryUsage().heapUsed }
}

validateIdentityRules()
const cases = ['cold-keyed', 'cold-unkeyed', 'repeat-keyed', 'tail-mutation', 'config-only']
const results = []
for (const rows of counts) {
  // Rotate order to reduce a systematic first-case advantage.
  const ordered = rows === counts[0] ? cases : [...cases.slice(2), ...cases.slice(0, 2)]
  for (const operation of ordered) {
    const result = run(rows, operation)
    results.push(result)
    console.log(JSON.stringify({ rows, operation, ...result.stats }))
  }
}
const evidence = {
  purpose: 'A3 bounded baseline only; no change to grid algorithms',
  revision: process.env.GITHUB_SHA ?? null,
  environment: { node: process.version, platform: platform(), release: release(),
    cpu: cpus()[0]?.model, cpuCount: cpus().length, totalMemory: totalmem(), gcExposed: typeof global.gc === 'function' },
  measurement: { samplesPerCase: runs, warmupsPerCase: warmups,
    notes: 'Built Core distribution. Fixtures allocated outside timers. Timer isolates setData/setConfig; correctness tested outside. Forced GC once before each case, not per sample; noisy hosted runner, no guaranteed SLA.' },
  correctness: 'duplicate, third duplicate, off-page duplicate, recovered identity and mutable-tail assertions passed',
  results
}
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(evidence, null, 2) + '\n')
console.log('A3 baseline saved:', out)
