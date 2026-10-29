// node scripts/adapter-sync/summarize.mjs <browser.json> <summary.md>
import fs from 'node:fs'
const evidence = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const number = value => value.toFixed(2)
const lines = [
  '# Adapter synchronization measurements', '',
  `Runtime: ${evidence.browser}; ${evidence.node}. Baseline: 6a0df7b01fd3de0b7e7f5dc386de469f3531d210.`, '',
  'Same machine, browser, fixture, instrumentation, and source dependency installation. Every grid has 120 columns; wide values use accessors over compact keyed rows. Each version/framework has a fresh page; garbage collection precedes each workload. Tests and builds are not run during sampling. Natural GC remains part of update timings.', '',
  'Update latency includes framework flushing and Lit updateComplete, excluding frame waits. p50/p95 use nearest rank. Stable and fresh refer to configuration/column references. Each unrelated case has 30 samples; each replacement, mutation, and schema case has 10. Mutation increments dataRevision in revision mode; legacy mode changes an unrelated ARIA input to trigger supported synchronization.', '',
  '**Revision mode is opt-in.** The baseline ignores the new input. Legacy mode intentionally keeps scanning identities and rerunning transforms; its results must not be presented as zero-work row synchronization. The baseline loses page, selection and unsaved order/visibility, so its timings do not establish state-equivalent performance.', ''
]
for (const operation of ['unrelatedStable', 'unrelatedFresh', 'replacement', 'mutation', 'schema']) {
  lines.push(`## ${operation}`, '', '| Framework | Rows | Mode | Baseline p50/p95 ms | Patched p50/p95 ms | Baseline → patched transforms | Baseline → patched structural setters |', '| --- | ---: | --- | ---: | ---: | ---: | ---: |')
  for (const framework of ['react', 'vue', 'angular']) for (const count of [10000, 30000, 100000]) for (const revision of [false, true]) {
    const find = variant => evidence.results.find(result => result.framework === framework && result.variant === variant && result.count === count && result.revision === revision).operations[operation]
    const before = find('baseline'), after = find('candidate')
    const structural = result => (result.setters.columns ?? 0) + (result.setters.config ?? 0) + (result.setters.updateColumnSchema ?? 0)
    lines.push(`| ${framework} | ${count} | ${revision ? 'revision' : 'legacy'} | ${number(before.latencyMs.p50)} / ${number(before.latencyMs.p95)} | ${number(after.latencyMs.p50)} / ${number(after.latencyMs.p95)} | ${before.transforms} → ${after.transforms} | ${structural(before)} → ${structural(after)} |`)
  }
  lines.push('')
}
lines.push('## Mount, first selection, scroll and whole-workload observations', '',
  'These are individual observations per workload, not distributions or standalone speedup claims. Task duration includes fixture correctness checks and framework work; heap includes the whole page and has no forced final GC. Heap differences do not establish retained allocation, leaks, or grid-only memory.', '',
  '| Framework/version | Rows | Mode | Mount ms | First selection ms | Scroll + two frames ms | Task duration ms | Heap before/after MB | Visible cells |',
  '| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |')
for (const result of evidence.results.filter(result => result.count)) {
  lines.push(`| ${result.framework}/${result.variant} | ${result.count} | ${result.revision ? 'revision' : 'legacy'} | ${number(result.mountMs)} | ${number(result.firstSelectionMs)} | ${number(result.scrollFrameWaitMs)} | ${number(result.taskDurationMs)} | ${number(result.heapBefore / 1e6)} / ${number(result.heapAfter / 1e6)} | ${result.visibleCells} |`)
}
lines.push('', '## Correctness', '', ...evidence.results.filter(result => result.external).map(result => `- ${result.framework}/${result.variant} external: ${JSON.stringify(result.external)}`), '',
  `Candidate local workloads passing every check: ${evidence.results.filter(result => result.variant === 'candidate' && result.checks && Object.values(result.checks).every(Boolean)).length}/18.`,
  `Browser page errors: ${evidence.errors.length}.`, '',
  'Raw per-update latencies, transform times/counts, setter counts, state checks and runtime metadata are retained in [browser.json](browser.json).', '')
fs.writeFileSync(process.argv[3], lines.join('\n'))
// Keep every numeric sample while avoiding thousands of diff lines of raw data.
fs.writeFileSync(process.argv[2], JSON.stringify(evidence) + '\n')
