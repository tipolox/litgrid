import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

// Build disposable hypothesis variants; original authored files are restored
// even if a compile fails. Run in an isolated CI checkout only.
const root = resolve(new URL('../../', import.meta.url).pathname)
const selectionPath = resolve(root, 'packages/grid-core/src/features/selection/selectionCoordination.ts')
const enginePath = resolve(root, 'packages/grid-core/src/core/createGridEngine.ts')
const output = resolve(root, '.private/a3/variants')
const originals = new Map([[selectionPath, readFileSync(selectionPath, 'utf8')], [enginePath, readFileSync(enginePath, 'utf8')]])
function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(label + ': expected exactly one match; got ' + count)
  return source.replace(before, after)
}
const operational = [
  '      const operationalUnchanged = !modeChanged &&',
  '        previousConfig.selection.mode === nextConfig.selection.mode &&',
  '        previousConfig.selection.rowKey === nextConfig.selection.rowKey &&',
  '        Object.is(previousConfig.selection.scopeKey, nextConfig.selection.scopeKey) &&',
  '        previousConfig.pagination.enabled === nextConfig.pagination.enabled &&',
  '        previousConfig.pagination.pageSize === nextConfig.pagination.pageSize &&',
  '        previousConfig.pagination.pageIndex === nextConfig.pagination.pageIndex'
].join('\n') + '\n'
const display = [
  '        previousConfig.selection.checkboxes === nextConfig.selection.checkboxes &&',
  '        previousConfig.rowHeader.enabled === nextConfig.rowHeader.enabled &&',
  '        Object.is(previousConfig.rowHeader.width, nextConfig.rowHeader.width) &&',
  '        previousConfig.quickSearch.visible === nextConfig.quickSearch.visible &&',
  '        previousConfig.quickSearch.label === nextConfig.quickSearch.label &&',
  '        previousConfig.quickSearch.placeholder === nextConfig.quickSearch.placeholder &&',
  '        previousConfig.quickSearch.description === nextConfig.quickSearch.description'
].join('\n')
function experiment(name) {
  let selection = originals.get(selectionPath)
  let engine = originals.get(enginePath)
  if (name === 'fused-index') {
    selection = replaceOnce(selection, '    const nextKeys = sourceKeys.slice(0, firstChanged)',
      '    const nextKeys: Array<GridRowKey | null> = new Array(rows.length)\n    for (let i = 0; i < firstChanged; i++) nextKeys[i] = sourceKeys[i]', name)
    selection = replaceOnce(selection, '      if (index >= firstChanged) nextKeys.push(key)', '      nextKeys[index] = key', name)
  }
  if (name === 'noop-config' || name === 'presentation-config') {
    const condition = name === 'noop-config'
      ? '      if (!external.active() && operationalUnchanged &&\n' + display + ') {\n'
      : '      if (!external.active() && operationalUnchanged) {\n'
    const extra = operational + condition + '        state.config = nextConfig\n        return\n      }\n'
    engine = replaceOnce(engine, '      const modeChanged = state.config.queryMode !== nextConfig.queryMode\n',
      '      const modeChanged = state.config.queryMode !== nextConfig.queryMode\n' + extra, name)
  }
  return { selection, engine }
}
function build(name) {
  const { selection, engine } = experiment(name)
  writeFileSync(selectionPath, selection)
  writeFileSync(enginePath, engine)
  const cmd = spawnSync('pnpm', ['--dir', 'packages/grid-core', 'build'], {
    cwd: root, stdio: 'inherit', env: process.env
  })
  if (cmd.error || cmd.status !== 0) throw new Error(name + ': Core build failed: ' + (cmd.error?.message || cmd.status))
  const target = resolve(output, name)
  rmSync(target, { recursive: true, force: true })
  cpSync(resolve(root, 'packages/grid-core/dist'), target, { recursive: true })
  writeFileSync(resolve(target, 'package.json'), '{"type":"module"}\n')
}
mkdirSync(output, { recursive: true })
try {
  for (const name of ['baseline', 'fused-index', 'noop-config', 'presentation-config']) {
    console.log('A3 disposable build:', name)
    build(name)
  }
} finally {
  for (const [path, content] of originals) writeFileSync(path, content)
}
console.log('Four built Core variants in', output)
