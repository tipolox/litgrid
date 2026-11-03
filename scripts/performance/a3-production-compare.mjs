import { cpus, platform, release, totalmem } from 'node:os'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'

// Compare pinned main Core and production candidate built from the SAME checkout.
// All operations use an actual compiled Core engine; no published APIs change.
const root = resolve(fileURLToPath(new URL('../../', import.meta.url)))
const out = resolve(process.argv[2] || '.private/a3/variant-comparison.json')
const names = ['baseline', 'candidate']
const engines = {}
for (const name of names) {
  engines[name] = (await import(pathToFileURL(resolve(root, '.private/a3/variants', name, 'index.js')).href)).createGridEngine
}
const config = () => ({ selection: { mode: 'multi-row', rowKey: 'id', scopeKey: 'site-A' } })
function assert(test, message) { if (!test) throw new Error('A3 correctness: ' + message) }
function correctness(create, name) {
  const data = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 0 }]
  const engine = create(config())
  engine.setData(data)
  assert(!engine.selectRowByKey(0), name + ': duplicate')
  assert(engine.selectRowByKey(1), name + ': unique key')
  data[2].id = 0
  engine.setData(data)
  assert(!engine.selectRowByKey(0), name + ': third duplicate')
  data[2].id = 2
  data[3].id = 3
  engine.setData(data)
  assert(engine.selectRowByKey(0), name + ': duplicate removal')
  engine.setConfig({ selection: { mode: 'multi-row', rowKey: 'id', scopeKey: 'site-B' } })
  assert(engine.getSelectionSnapshot().rows.length === 0, name + ': cross-scope reset')
  assert(engine.selectRowByKey(3), name + ': new scope')
  engine.setConfig({ selection: { mode: 'multi-row', rowKey: 'id', scopeKey: 'site-B' },
    rowHeader: { enabled: true, width: 64 } })
  assert(engine.getSelectionSnapshot().rows[0].key === 3, name + ': presentation-only continuity')
  engine.setConfig({ selection: { mode: 'multi-row', rowKey: 'id', scopeKey: 'site-B' },
    pagination: { enabled: true, pageSize: 2 } })
  assert(!engine.selectRowByKey(3), name + ': off-page unselectable')
  const rows = [{ id: 1 }, { id: 1 }, { id: 2 }]
  const filtered = create({ selection: { mode: 'multi-row', rowKey: 'id' },
    pagination: { enabled: true, pageSize: 1 } })
  filtered.setData(rows)
  assert(!filtered.selectRowByKey(1), name + ': off-page duplicate')
  const invalid = create(config())
  invalid.setData([{ id: Number.NaN }, { id: Number.POSITIVE_INFINITY }, { id: 2 }])
  assert(!invalid.selectRowByKey(NaN), name + ': NaN')
  assert(!invalid.selectRowByKey(Infinity), name + ': Infinity')
  assert(invalid.selectRowByKey(2), name + ': finite key')
  const external = create({ queryMode: 'external', selection: { mode: 'multi-row', rowKey: 'id' } })
  const extRows = Array.from({ length: 20 }, (_, id) => ({ id }))
  const accepted = external.setExternalState({
    requestId: 1, query: external.getQuery().query, rows: extRows,
    total: { kind: 'known', totalRows: 1_000_000_000 }
  })
  assert(accepted && external.getSelectableRowCount() === 20, name + ': bounded external page')
  return true
}
function stat(a) {
  const xs = [...a].sort((x,y) => x-y)
  const p = fraction => xs[Math.max(0,Math.ceil(xs.length*fraction)-1)]
  return { n: a.length, p50: p(.5), p95: p(.95), min: xs[0], max: xs.at(-1) }
}
function exercise(create, operation, rows) {
  const data = Array.from({length:rows},(_,id)=>({id,name:'Fictional '+id}))
  const base = config()
  let engine = create(base)
  if (operation !== 'cold-keyed') engine.setData(data)
  let clock = 0
  return () => {
    if (operation === 'cold-keyed') engine = create(base)
    if (operation === 'tail-mutation') data[rows-1].id=rows+(++clock)
    const begin=performance.now()
    if (operation === 'config-identical') engine.setConfig(config())
    else if (operation === 'config-display') engine.setConfig({ ...config(),
      rowHeader: { enabled: true, width: 58 + clock++ % 2 } })
    else engine.setData(data)
    return performance.now()-begin
  }
}
for (const name of names) correctness(engines[name],name)
const counts = [30_000,100_000]
const operations = ['cold-keyed','same-reference','tail-mutation','config-identical','config-display']
const samples = []
const rounds = 2
const perRound = 30
for (const rows of counts) for (const op of operations) {
  const timer = Object.fromEntries(names.map(name=>[name,exercise(engines[name],op,rows)]))
  for (let r=0;r<rounds;r++) {
    const ordering = r%2===0 ? names : [...names].reverse()
    for (const name of ordering) {
      const sample = timer[name]
      for (let i=0;i<8;i++) sample()
      if (global.gc) global.gc()
      const times = Array.from({length:perRound},()=>sample())
      samples.push({rows,operation:op,variant:name,round:r,ms:times,stats:stat(times)})
    }
  }
}
const comparisons=[]
for (const rows of counts) for (const operation of operations) {
  const totals = names.map(variant=>{
    const times=samples.filter(s=>s.rows===rows&&s.operation===operation&&s.variant===variant).flatMap(s=>s.ms)
    return {variant, ...stat(times)}
  })
  const baseline=totals.find(t=>t.variant==='baseline')
  for (const t of totals) {
    const delta=100*(t.p95/baseline.p95-1)
    comparisons.push({rows,operation,...t,deltaP95Percent:Math.round(delta*100)/100})
    console.log(JSON.stringify({rows,operation,variant:t.variant,p50:t.p50,p95:t.p95,deltaP95Percent:Math.round(delta*100)/100}))
  }
}
const result={purpose:'A3 production candidate vs pinned original main, no publication',
  revision:process.env.GITHUB_SHA||null,
  environment:{node:process.version,cpu:cpus()[0]?.model,cpuCount:cpus().length,
    platform:platform(),release:release(),totalMemory:totalmem(),gcExposed:!!global.gc},
  protocol:{warmupsPerVariantRound:8,samplesPerRound:perRound,rounds,
    notes:'Fixture creation outside timer. One GC before each variant round, none inside. Ordering reversed on second round. Same host but not isolated. Core-only, not browser timing.'},
  correctness:'All variants passed duplicate/third duplicate/recovery, scope isolation, pagination, invalid identity and bounded external-page probes',
  comparisons,samples}
mkdirSync(dirname(out),{recursive:true})
writeFileSync(out,JSON.stringify(result,null,2)+'\n')
console.log('A3 variant comparison saved: '+out)
