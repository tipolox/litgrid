import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { packedVersion, checkPackedResolution } from './packed-artifacts.mjs'

const names = ['core', 'renderer', 'web', 'angular']
function fixture(version) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'litgrid-resolution-'))
  const artifacts = path.join(root, 'artifacts')
  const consumer = path.join(root, 'consumer')
  fs.mkdirSync(artifacts)
  fs.mkdirSync(consumer)
  const packages = {}
  for (const name of names) {
    const file = 'tipolox-litgrid-' + name + '-' + version + '.tgz'
    fs.writeFileSync(path.join(artifacts, file), '')
    packages['node_modules/@tipolox/litgrid-' + name] = { version, resolved: 'file:../artifacts/' + file }
  }
  return { artifacts, lockFile: path.join(consumer, 'package-lock.json'), lock: { packages } }
}

for (const version of ['1.2.3', '1.3.0']) {
  test('validates coordinated ' + version + ' archives and npm lock resolution', () => {
    const f = fixture(version)
    assert.equal(packedVersion(f.artifacts, names), version)
    assert.equal(packedVersion(f.artifacts, names, version), version)
    assert.doesNotThrow(() => checkPackedResolution(f.lock, f.lockFile, f.artifacts, version, names))
    fs.writeFileSync(f.lockFile, JSON.stringify(f.lock))
    const cli = fileURLToPath(new URL('./check-packed-resolution.mjs', import.meta.url))
    assert.doesNotThrow(() => execFileSync(process.execPath, [cli, f.lockFile, f.artifacts, version, ...names]))
  })
}

test('rejects missing, duplicate, mixed and unexpected packed versions', () => {
  const f = fixture('1.3.0')
  assert.throws(() => packedVersion(f.artifacts, names, '1.2.3'))
  fs.writeFileSync(path.join(f.artifacts, 'tipolox-litgrid-angular-1.2.3.tgz'), '')
  assert.throws(() => packedVersion(f.artifacts, names))
  fs.unlinkSync(path.join(f.artifacts, 'tipolox-litgrid-angular-1.3.0.tgz'))
  assert.throws(() => packedVersion(f.artifacts, names))
  fs.unlinkSync(path.join(f.artifacts, 'tipolox-litgrid-angular-1.2.3.tgz'))
  assert.throws(() => packedVersion(f.artifacts, names))
})

test('rejects registry, workspace, wrong archive, wrong version and duplicate installs', () => {
  for (const mutate of [
    entry => { entry.resolved = 'https://registry.npmjs.org/@tipolox/litgrid-core/-/litgrid-core-1.3.0.tgz' },
    entry => { entry.link = true },
    entry => { entry.resolved = 'file:../other/tipolox-litgrid-core-1.3.0.tgz' },
    entry => { entry.version = '1.2.3' },
    entry => { entry.resolved = 'file:../artifacts/tipolox-litgrid-core-1.2.3.tgz' },
  ]) {
    const f = fixture('1.3.0')
    mutate(f.lock.packages['node_modules/@tipolox/litgrid-core'])
    assert.throws(() => checkPackedResolution(f.lock, f.lockFile, f.artifacts, '1.3.0', names))
  }
  const f = fixture('1.3.0')
  f.lock.packages['node_modules/other/node_modules/@tipolox/litgrid-core'] = f.lock.packages['node_modules/@tipolox/litgrid-core']
  assert.throws(() => checkPackedResolution(f.lock, f.lockFile, f.artifacts, '1.3.0', names))
})
