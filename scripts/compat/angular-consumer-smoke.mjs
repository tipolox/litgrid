import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { packedVersion } from '../qualification/packed-artifacts.mjs'

const major = Number(process.argv[2])
if (![17, 18, 19, 20, 21, 22].includes(major)) throw new Error('Expected Angular major 17–22')
const packedDirectory = process.env.LITGRID_PACKED_DIR ? resolve(process.env.LITGRID_PACKED_DIR) : undefined
// Registry matrix is the explicitly published historical baseline; packed mode is candidate-specific.
const version = packedDirectory
  ? packedVersion(packedDirectory, ['core', 'renderer', 'web', 'angular'], process.env.LITGRID_PACKED_VERSION)
  : '1.2.3'
if (packedDirectory && major === 21) throw new Error('Packed Angular 21 pnpm resolution is not qualified; use npm-backed packed matrix endpoints 17 or 22')
const packedPackages = ['core', 'renderer', 'web', 'angular'].map(name =>
  'file:' + join(packedDirectory || '', 'tipolox-litgrid-' + name + '-' + version + '.tgz'))
const litgridInstallArgs = packedDirectory ? packedPackages : ['@tipolox/litgrid-angular@' + version]
const dir = mkdtempSync(join(process.env.RUNNER_TEMP || tmpdir(), 'litgrid-angular-' + major + '-'))
const cli = join(dir, 'node_modules', '@angular', 'cli', 'bin', 'ng.js')
const root = resolve(new URL('../../', import.meta.url).pathname)
function run(command, args, cwd = root) {
  console.log('\n> ' + command + ' ' + args.join(' ') + ' (cwd: ' + cwd + ')')
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: { ...process.env, CI: 'true' }, shell: process.platform === 'win32' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error('Command exited ' + result.status + ': ' + command + ' ' + args.join(' '))
}
console.log(JSON.stringify({ major, version, source: packedDirectory ? 'packed current-main build' : 'published registry package', node: process.version, fixture: dir }))
run('npx', ['--yes', '@angular/cli@' + major, 'new', 'litgrid-compat', '--directory', '.',
  '--skip-git', '--skip-install', '--defaults', '--standalone', '--routing=false', '--style=css', '--ssr=false'], dir)
if (major === 21) {
  // npm 10.9.8 on Node 22 may crash in Arborist (edgesOut) before installing any package.
  // Use pnpm only for this consumer; the Angular/TypeScript versions remain from its CLI scaffold.
  const manifest = join(dir, 'package.json')
  const packageJson = JSON.parse(readFileSync(manifest, 'utf8'))
  packageJson.packageManager = 'pnpm@10.33.0'
  writeFileSync(manifest, JSON.stringify(packageJson, null, 2) + '\n')
  run('npx', ['--yes', 'pnpm@10.33.0', 'install'], dir)
  run('npx', ['--yes', 'pnpm@10.33.0', 'add', ...litgridInstallArgs], dir)
  run('npx', ['--yes', 'pnpm@10.33.0', 'add', '-D', 'playwright@1.64.1'], dir)
  run('npx', ['--yes', 'pnpm@10.33.0', 'list', '--depth=0'], dir)
} else {
  run('npm', ['install', '--no-audit', '--no-fund'], dir)
  run('npm', ['install', '--save', '--no-audit', '--no-fund', ...litgridInstallArgs], dir)
  run('npm', ['install', '--save-dev', '--no-audit', '--no-fund', 'playwright@1.64.1'], dir)
  run('npm', ['ls', '@angular/core', '@angular/compiler-cli', '@angular/cli',
    '@tipolox/litgrid-angular', 'typescript', '--depth=0'], dir)
}
if (packedDirectory) run(process.execPath, [join(root, 'scripts/qualification/check-packed-resolution.mjs'), join(dir, 'package-lock.json'), packedDirectory, version, 'core', 'renderer', 'web', 'angular'], dir)
writeFileSync(join(dir, 'src', 'main.ts'), "import { bootstrapApplication } from '@angular/platform-browser'\nimport { AfterViewInit, ChangeDetectorRef, Component, ViewChild } from '@angular/core'\nimport { DataGridComponent } from '@tipolox/litgrid-angular'\nimport type { GridColumn, GridConfig } from '@tipolox/litgrid-angular'\ndeclare global {\n  interface Window {\n    litgridSmoke?: { count(): number; update(): void; select(): void; columnOrder(): string[] }\n    litgridEvents?: number\n  }\n}\n@Component({\n  selector: 'app-root',\n  standalone: true,\n  imports: [DataGridComponent],\n  template: `<litgrid-data-grid #grid [data]=\"rows\" [columns]=\"columns\" [config]=\"config\" [height]=\"320\" (selectionChange)=\"onSelectionChange()\"></litgrid-data-grid>`\n})\nclass SmokeApplication implements AfterViewInit {\n  @ViewChild('grid') grid?: DataGridComponent\n  rows = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }]\n  columns: GridColumn[] = [{ key: 'id' }, { key: 'name' }]\n  config: GridConfig = { selection: { mode: 'row' }, pagination: { enabled: true, pageSize: 2 } }\n  constructor(private readonly changes: ChangeDetectorRef) {}\n  onSelectionChange(): void { window.litgridEvents = (window.litgridEvents ?? 0) + 1 }\n  ngAfterViewInit(): void {\n    window.litgridEvents = 0\n    window.litgridSmoke = {\n      count: () => this.grid?.getTotalRowCount() ?? -1,\n      columnOrder: () => this.grid?.getColumnOrder() ?? [],\n      select: () => this.grid?.selectRow(0),\n      update: () => {\n        this.rows = [...this.rows, { id: 3, name: 'Katherine' }]\n        this.columns = [...this.columns, { key: 'status' }]\n        this.changes.detectChanges()\n      }\n    }\n  }\n}\nbootstrapApplication(SmokeApplication).catch(error => console.error(error))\n")
copyFileSync(new URL('./angular-browser.cjs', import.meta.url), join(dir, 'browser-smoke.cjs'))
run(process.execPath, [cli, 'build', '--configuration', 'production'], dir)
const server = spawn(process.execPath, [cli, 'serve', '--host', '127.0.0.1', '--port', '4317'], {
  cwd: dir, env: { ...process.env, CI: 'true' }, stdio: ['ignore', 'inherit', 'inherit']
})
try {
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error('ng serve exited ' + server.exitCode)
    try {
      if ((await fetch('http://127.0.0.1:4317')).ok) { ready = true; break }
    } catch {}
    await delay(1000)
  }
  if (!ready) throw new Error('Angular development server did not start within 100 seconds')
  run(process.execPath, ['browser-smoke.cjs'], dir)
} finally {
  server.kill('SIGTERM')
}
console.log('ANGULAR ' + major + ' + LitGrid ' + version + ' (' + (packedDirectory ? 'packed-current-main' : 'published') + '): AOT production build and browser smoke PASS')
