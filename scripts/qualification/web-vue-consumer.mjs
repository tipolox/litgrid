import { spawn, spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const dir = process.argv[2]
if (!dir) throw new Error('Expected isolated consumer directory')
const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { cwd: dir, stdio: 'inherit' })
  if (result.status !== 0) throw new Error(cmd + ' failed: ' + result.status)
}
writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html><body><div id="web"></div><div id="vue"></div><script type="module" src="/packed-web-vue.ts"></script></body></html>')
writeFileSync(path.join(dir, 'packed-web-vue.ts'), `
import '@tipolox/litgrid-web'
import type { DataGridElement, GridColumn } from '@tipolox/litgrid-web'
import { createApp, h, ref, nextTick } from 'vue'
import { DataGrid, LitGridColumn } from '@tipolox/litgrid-vue'

type Row = { id: number; name: string }
const columns: GridColumn<Row>[] = [{ key: 'name', align: 'end' }]
const rows: Row[] = [{ id: 1, name: 'Web Ada' }]
const grid = document.createElement('yc-grid') as DataGridElement
grid.config = { selection: { mode: 'row', rowKey: 'id' } }
grid.columns = columns
grid.data = rows
document.querySelector('#web')!.appendChild(grid as unknown as Node)
const showExtra = ref(false)
createApp({
  setup() {
    return () => h(DataGrid, { data: [{ id: 2, name: 'Vue Grace' }], height: 320 }, {
      default: () => [
        h(LitGridColumn, { field: 'name', header: 'Name', align: 'center' }),
        ...(showExtra.value ? [h(LitGridColumn, { field: 'id', header: 'ID' })] : [])
      ]
    })
  }
}).mount('#vue')
;(window as any).packedSmoke = {
  refresh: () => { rows[0].name = 'Web updated'; if (!grid.refreshRow) throw new Error('refreshRow missing'); return grid.refreshRow(1) },
  addColumn: async () => { showExtra.value = true; await nextTick() }
}
`)
writeFileSync(path.join(dir, 'tsconfig.packed.json'), JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',module:'ESNext',moduleResolution:'Bundler',skipLibCheck:true,lib:['ES2022','DOM']},include:['packed-web-vue.ts']}))
run('npx', ['tsc', '-p', 'tsconfig.packed.json'])
run('npx', ['vite', 'build', '--outDir', 'packed-dist'])
const server = spawn(process.execPath, [path.join(dir, 'node_modules/vite/bin/vite.js'), 'preview', '--outDir', 'packed-dist', '--host', '127.0.0.1', '--port', '5210'], {cwd:dir, stdio:'inherit'})
try {
  let ready = false
  for (let i=0; i<60; i++) {
    try { if ((await fetch('http://127.0.0.1:5210')).ok) { ready=true; break } } catch {}
    await delay(1000)
  }
  if (!ready) throw new Error('Vite server did not start')
  const { chromium } = await import(path.join(dir, 'node_modules/playwright/index.mjs'))
  const browser = await chromium.launch({headless:true})
  try {
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('http://127.0.0.1:5210')
    const web = page.locator('#web yc-grid')
    const vue = page.locator('#vue yc-grid')
    await web.getByText('Web Ada', {exact:true}).waitFor()
    await vue.getByText('Vue Grace', {exact:true}).waitFor()
    if (!await page.evaluate(() => globalThis.packedSmoke.refresh())) throw new Error('refreshRow returned false')
    await web.getByText('Web updated', {exact:true}).waitFor()
    await page.evaluate(() => globalThis.packedSmoke.addColumn())
    await vue.getByText('ID', {exact:true}).waitFor()
    if (errors.length) throw new Error(errors.join('\n'))
    console.log('PASS packed standalone Web: typed columns, alignment metadata and B1 refresh')
    console.log('PASS packed Vue: declarative columns, alignment metadata and dynamic column lifecycle')
  } finally { await browser.close() }
} finally { server.kill('SIGTERM') }
