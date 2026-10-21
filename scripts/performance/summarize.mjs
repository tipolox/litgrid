import fs from 'node:fs'
import path from 'node:path'
const dir = process.argv[2] || 'docs/performance/evidence/keyed-selection'
const read = file => JSON.parse(fs.readFileSync(path.join(dir, file)))
const stats = a => {
  a = a.toSorted((a, b) => a - b)
  return { n: a.length, p50: a[Math.ceil(a.length * .5) - 1], p95: a[Math.ceil(a.length * .95) - 1], min: a[0], max: a.at(-1) }
}
const runs = [1, 2, 3].map(n => read(`paired-${n}.json`)), samples = runs.flatMap(r => r.samples)
const variantName = v => v === 'candidate' ? 'optimized' : 'main'
const summary = { browser: runs[0].browser, local: [], heap: [], external: [], react: [], core: [], gcProfiles: [] }
for (const rows of [30000, 100000]) for (const columns of [120, 200]) for (const variant of ['v110', 'candidate']) {
  const s = samples.filter(s => s.count === rows && s.columns === columns && s.variant === variant)
  summary.local.push({ rows, columns, variant: variantName(variant), adoption: stats(s.map(s => s.adoptMs)), presentation: stats(s.map(s => s.firstPaintWaitMs)), scroll: stats(s.flatMap(s => s.scrollMs)), selection: stats(s.flatMap(s => s.selectionMs)), maxCells: Math.max(...s.map(s => s.maxCells)) })
}
for (const variant of ['v110', 'candidate']) for (const gc of ['forced', 'natural']) {
  const s = samples.filter(s => s.variant === variant && s.gc === gc)
  summary.heap.push({ variant: variantName(variant), gc, heapMiB: stats(s.map(s => s.heapUsed / 2 ** 20)) })
}
for (const totalRows of [352, 30000, 100000, 1e9]) summary.external.push({ totalRows, loadedRows: 20, commit: stats(runs.flatMap(r => r.external.find(x => x.totalRows === totalRows).ms)) })
summary.react = read('react-paired.json').samples.map(s => ({ rows: s.count, freshConfig: s.fresh, variant: variantName(s.variant), update: stats(s.frameWaitMs), profiler: stats(s.reactActualDurationMs) }))
const core = read('core-paired.json')
summary.firstInteraction = []
const clicks = read('first-interaction.json').samples
for (const rows of [30000, 100000]) for (const columns of [120, 200]) for (const variant of ['main', 'optimized']) {
  const s = clicks.filter(s => s.rows === rows && s.columns === columns && s.variant === variant)
  summary.firstInteraction.push({ rows, columns, variant, dispatch: stats(s.map(s => s.dispatchMs)), update: stats(s.map(s => s.updateMs)), frameWait: stats(s.map(s => s.frameWaitMs)) })
}
summary.allocations = read('allocations.json').samples.map(s => ({ rows: s.rows, phase: s.phase, variant: s.variant, n: s.n, sampledMiB: s.sampledBytes / 2 ** 20 }))
summary.core = core.samples.map(s => ({ rows: s.rows, variant: s.variant, gc: s.gc, operation: s.operation, synchronization: stats(s.ms), firstSelection: stats(s.firstSelectionMs), heapMiB: s.heap.usedSize / 2 ** 20 }))
summary.gcProfiles = core.profiles.map(s => {
  const gcNodes = new Set(s.profile.nodes.filter(n => n.callFrame.functionName === '(garbage collector)').map(n => n.id))
  let gcSampleMicros = 0
  for (let i = 0; i < s.profile.samples.length; i++) if (gcNodes.has(s.profile.samples[i])) gcSampleMicros += s.profile.timeDeltas[i]
  const topFrames = s.profile.nodes.filter(n => n.hitCount).map(n => ({ name: n.callFrame.functionName, hits: n.hitCount })).sort((a, b) => b.hits - a.hits).slice(0, 12)
  return { rows: s.rows, variant: s.variant, gc: s.gc, gcSampleMs: gcSampleMicros / 1000, profileMs: (s.profile.endTime - s.profile.startTime) / 1000, beforeMiB: s.before.usedSize / 2 ** 20, afterWorkMiB: s.afterWork.usedSize / 2 ** 20, afterCollectionMiB: s.afterCollection.usedSize / 2 ** 20, topFrames }
})
fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n')
const f = n => n.toFixed(2), cell = s => `${f(s.p50)} / ${f(s.p95)} (${f(s.min)}–${f(s.max)}; n=${s.n})`
let md = 'Timings are milliseconds, nearest-rank p50 / p95 (min–max; n). `main` means keyed main at 206192e; `optimized` has the same keyed guarantees. Raw qualification scripts call these `v110` and `candidate` for compatibility; paired files compare main, not v1.1.0.\n\n'
md += '| Rows | Columns | Version | Adoption | Two-frame presentation wait | Scroll | Selection update | Max cells |\n|---:|---:|---|---|---|---|---|---:|\n'
for (const s of summary.local) md += `| ${s.rows} | ${s.columns} | ${s.variant} | ${cell(s.adoption)} | ${cell(s.presentation)} | ${cell(s.scroll)} | ${cell(s.selection)} | ${s.maxCells} |\n`
md += '\nHeap values are whole-page MiB snapshots after grid removal, before the next collection; these are not retained-leak measurements.\n\n| Version | GC protocol | Heap MiB p50 / p95 (range; n) |\n|---|---|---|\n'
for (const s of summary.heap) md += `| ${s.variant} | ${s.gc} | ${cell(s.heapMiB)} |\n`
md += '\n| React rows | Fresh config | Version | Update incl. two frames | React Profiler actual duration |\n|---:|---|---|---|---|\n'
for (const s of summary.react) md += `| ${s.rows} | ${s.freshConfig} | ${s.variant} | ${cell(s.update)} | ${cell(s.profiler)} |\n`
md += '\nFirst interaction is the first DOM cell.click() on a cold mounted grid, before scrolling or selection. It excludes physical input hardware and does not claim compositor paint timing.\n\n| Rows | Columns | Version | Click dispatch | Click through Lit update | Two-frame wait |\n|---:|---:|---|---|---|---|\n'
for (const s of summary.firstInteraction) md += `| ${s.rows} | ${s.columns} | ${s.variant} | ${cell(s.dispatch)} | ${cell(s.update)} | ${cell(s.frameWait)} |\n`
md += '\nAllocation sampling is separate from timing runs: CDP sampling interval 32768 bytes, including sampled objects collected by minor/major GC. Values estimate allocated MiB over 30 synchronizations, not exact byte counts or retained heap. Fixture rows were allocated before sampling.\n\n| Rows | Phase | Version | Sync count | Sampled allocated MiB |\n|---:|---|---|---:|---:|\n'
for (const s of summary.allocations) md += `| ${s.rows} | ${s.phase} | ${s.variant} | ${s.n} | ${f(s.sampledMiB)} |\n`
md += '\nCore controls are separate profiled batches, with fixture creation outside each sync timer. First selection is immediate after synchronization, includes no DOM, and uses a single-row replace intent. Forced GC occurs before each 30-sample operation batch, not before each sample.\n\n| Rows | GC protocol | Operation | Version | Sync | First selection | Heap MiB after batch |\n|---:|---|---|---|---|---|---:|\n'
for (const s of summary.core) md += `| ${s.rows} | ${s.gc} | ${s.operation} | ${s.variant} | ${cell(s.synchronization)} | ${cell(s.firstSelection)} | ${f(s.heapMiB)} |\n`
md += '\nSampled GC time is attributed CPU-profile sample time, not an exact GC pause measurement. Profiles include fixtures and selection work as well as synchronization. All GC heap snapshots cover the whole page.\n\n| Rows | Version | GC protocol | Sampled GC ms | Profile duration ms | Before / after work / after collection MiB |\n|---:|---|---|---:|---:|---|\n'
for (const s of summary.gcProfiles) md += `| ${s.rows} | ${s.variant} | ${s.gc} | ${f(s.gcSampleMs)} | ${f(s.profileMs)} | ${f(s.beforeMiB)} / ${f(s.afterWorkMiB)} / ${f(s.afterCollectionMiB)} |\n`
md += '\n| External declared total | Loaded rows | Optimized commit |\n|---:|---:|---|\n'
for (const s of summary.external) md += `| ${s.totalRows} | ${s.loadedRows} | ${cell(s.commit)} |\n`
fs.writeFileSync(path.join(dir, 'tables.md'), md)
console.log(JSON.stringify({ local: summary.local.map(s => ({ rows: s.rows, columns: s.columns, variant: s.variant, adoption: s.adoption })), react: summary.react, heap: summary.heap }, null, 2))
