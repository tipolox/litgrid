import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const projects = ['tsconfig.quality.browser.json', 'tsconfig.quality.tools.json']
const canonical = file => {
  const path = resolve(root, file).replaceAll('\\', '/')
  return ts.sys.useCaseSensitiveFileNames ? path : path.toLowerCase()
}
const owned = new Set()
for (const project of projects) {
  const config = ts.readConfigFile(resolve(root, project), ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(config.config ?? {}, ts.sys, root)
  const errors = [config.error, ...parsed.errors].filter(Boolean)
  if (errors.length) {
    for (const error of errors) console.error(ts.flattenDiagnosticMessageText(error.messageText, '\n'))
    process.exit(1)
  }
  for (const file of parsed.fileNames) owned.add(canonical(file))
}

// Include tracked files and new, nonignored files. Build outputs and local caches
// are ignored by Git; an authored file outside the projects must fail this gate.
const inventory = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
  cwd: root, encoding: 'utf8'
})
if (inventory.error) throw inventory.error
if (inventory.status !== 0) {
  console.error(inventory.stderr)
  process.exit(inventory.status ?? 1)
}
const files = new Set(inventory.stdout.split('\0').filter(Boolean))
const authored = []
const legacyDeclarations = []
for (const file of files) {
  if (!/\.(?:[cm]?ts|tsx)$/.test(file)) continue
  // Historical checked-in declarations with source/map siblings are generated, not the source of
  // truth. Package builds and the published-contract gate validate fresh types.
  if (
    /^packages\/grid-(?:core|renderer|web)\/src\//.test(file) &&
    file.endsWith('.d.ts') &&
    files.has(file.slice(0, -5) + '.ts') &&
    files.has(file + '.map')
  ) {
    legacyDeclarations.push(file)
  } else {
    authored.push(file)
  }
}
const unowned = authored.filter(file => !owned.has(canonical(file)))
if (unowned.length) {
  console.error('Authored TypeScript files need an explicit quality project:')
  for (const file of unowned) console.error(`  ${file}`)
  process.exit(1)
}
console.log(`TypeScript ownership: ${authored.length} authored files; ${legacyDeclarations.length} legacy generated declarations superseded by fresh package builds.`)
for (const project of projects) {
  console.log(`Typechecking ${project}`)
  const result = spawnSync(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', project, '--pretty', 'false'], {
    cwd: root, stdio: 'inherit'
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
