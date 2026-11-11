import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

// Compile the legacy and runtime consumer against the files actually included in npm packs.
const root = process.cwd()
const temp = mkdtempSync(join(root, '.litgrid-contracts-'))
const run = (command, args, cwd = root) => {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' && command === 'npm' })
  if (result.error || result.status !== 0) throw result.error ?? new Error(`${command} failed: ${result.status}`)
}
try {
  process.env.npm_config_cache = join(temp, 'npm-cache')
  const paths = { lit: [resolve(root, 'packages/grid-web/node_modules/lit')] }
  for (const name of ['core', 'renderer', 'web', 'react', 'vue']) {
    const destination = join(temp, name)
    mkdirSync(destination)
    run('npm', ['pack', '--silent', '--ignore-scripts', '--pack-destination', destination], resolve(root, `packages/grid-${name}`))
    const archive = readdirSync(destination).find(file => file.endsWith('.tgz'))
    if (!archive) throw new Error(`Missing ${name} archive`)
    run('tar', ['-xzf', join(destination, archive), '-C', destination])
    paths[`@tipolox/litgrid-${name}`] = [join(destination, 'package/dist/index.d.ts')]
  }
  const config = join(temp, 'tsconfig.json')
  writeFileSync(config, JSON.stringify({
    extends: resolve(root, 'tsconfig.contracts.json'),
    compilerOptions: { paths, typeRoots: [resolve(root, 'node_modules/@types')] },
    include: [resolve(root, 'tests/contracts/legacy-compatibility.tsx')]
  }))
  run(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', config, '--pretty', 'false'])
  console.log('Packed legacy and runtime contracts: passed')
} finally {
  rmSync(temp, { recursive: true, force: true })
}
