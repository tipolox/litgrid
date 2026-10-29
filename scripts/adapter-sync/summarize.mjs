// node scripts/adapter-sync/summarize.mjs <browser.json> <summary.md>
import fs from 'node:fs'
const evidence = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const number = value => value.toFixed(2)
const lines = [
  '# Default adapter synchronization measurements', '',
  `Runtime: ${evidence.browser}; ${evidence.node}. Baseline: 6a0df7b01fd3de0b7e7f5dc386de469f3531d210.`, '',
  'Only released public inputs are used. No revision counter, refresh flag, or new optimization API is supplied. Same machine, browser, fixture, instrumentation, and dependency installation; 120 columns use accessors over compact keyed rows. Fresh pages isolate framework/version; GC precedes workloads, with natural GC during sampling. Tests/builds are stopped while timing.', '',
  'Update latency includes framework flush and Lit updateComplete. Event-loop yields occur outside each update timer, separating updates for long-task observation. Each unchanged/unrelated case has 30 samples; each genuine configuration, replacement, mutation and schema case has 10. p50/p95 use nearest rank. Supported same-reference edits trigger the existing synchronization path through an ARIA input change.', '',
  'Unchanged stable inputs do not run structural or row setters. Existing mutable-data synchronization opportunities still validate keys and rerun active transforms. Baseline loses state, so timing does not establish equivalent-correctness performance. No memory savings or universal speedup is claimed.', ''
]
for (const operation of ['unchanged', 'unrelatedStable', 'unrelatedFresh', 'configuration', 'replacement', 'mutation', 'schema']) {
  lines.push(`## ${operation}`, '', '| Framework | Rows | n/version | Baseline p50/p95 ms | Patched p50/p95 ms | Data setters before → after | Transforms before → after | Structural setters before → after |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |')
  for (const framework of ['react', 'vue', 'angular']) for (const count of [10000, 30000, 100000]) {
    const find = variant => evidence.results.find(result => result.framework === framework && result.variant === variant && result.count === count).operations[operation]
    const before = find('baseline'), after = find('candidate')
    const structural = result => (result.setters.columns ?? 0) + (result.setters.config ?? 0) + (result.setters.updateColumnSchema ?? 0)
    lines.push(`| ${framework} | ${count} | ${after.latencyMs.n} | ${number(before.latencyMs.p50)} / ${number(before.latencyMs.p95)} | ${number(after.latencyMs.p50)} / ${number(after.latencyMs.p95)} | ${before.setters.data ?? 0} → ${after.setters.data ?? 0} | ${before.transforms} → ${after.transforms} | ${structural(before)} → ${structural(after)} |`)
  }
  lines.push('')
}
lines.push('## Mount, selection, scrolling, long tasks and heap', '',
  'Individual observations per whole workload, not distributions. Long tasks come from PerformanceObserver (duration >=50ms), including initial mount and fixture checks. CDP task duration includes surrounding fixture/framework work. Whole-page heap before/after without final forced GC does not establish retained allocation or leaks.', '',
  '| Framework/version | Rows | Mount ms | First selection ms | Scroll + two frames ms | Task duration ms | Long tasks n / total ms | Heap before/after MB | Visible cells |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |')
for (const result of evidence.results.filter(result => result.count)) {
  const total = result.longTasks.reduce((sum, task) => sum + task.duration, 0)
  lines.push(`| ${result.framework}/${result.variant} | ${result.count} | ${number(result.mountMs)} | ${number(result.firstSelectionMs)} | ${number(result.scrollFrameWaitMs)} | ${number(result.taskDurationMs)} | ${result.longTasks.length} / ${number(total)} | ${number(result.heapBefore / 1e6)} / ${number(result.heapAfter / 1e6)} | ${result.visibleCells} |`)
}
lines.push('', '## Correctness', '', ...evidence.results.filter(result => result.external).map(result => `- ${result.framework}/${result.variant} external: ${JSON.stringify(result.external)}`), '',
  `Candidate local workloads passing every check: ${evidence.results.filter(result => result.variant === 'candidate' && result.checks && Object.values(result.checks).every(Boolean)).length}/9.`,
  `Browser page errors: ${evidence.errors.length}.`, '',
  'Raw per-update latencies, transform totals/counts, setter counts, long-task samples, state checks and runtime metadata are retained in [browser.json](browser.json).', '')
fs.writeFileSync(process.argv[3], lines.join('\n'))
fs.writeFileSync(process.argv[2], JSON.stringify(evidence) + '\n')
