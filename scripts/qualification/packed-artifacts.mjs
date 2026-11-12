import fs from 'node:fs'
import path from 'node:path'

const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/

export function packedVersion(directory, names, expectedVersion) {
  const files = fs.readdirSync(directory)
  let version
  for (const name of names) {
    const prefix = 'tipolox-litgrid-' + name + '-'
    const matches = files.filter(file => file.startsWith(prefix) && file.endsWith('.tgz'))
    if (matches.length !== 1) throw new Error('Expected exactly one packed archive for ' + name)
    const found = matches[0].slice(prefix.length, -4)
    if (!semver.test(found)) throw new Error('Invalid packed artifact version: ' + found)
    if (version && found !== version) throw new Error('Mismatched packed artifact version: ' + found + ' vs ' + version)
    version = found
  }
  if (!version) throw new Error('No packed package names supplied')
  if (expectedVersion && expectedVersion !== version) throw new Error('Packed artifact version does not match expected version')
  return version
}

export function checkPackedResolution(lock, lockFile, directory, version, names) {
  if (!semver.test(version)) throw new Error('Invalid expected version: ' + version)
  if (!lock || !lock.packages || typeof lock.packages !== 'object') throw new Error('Invalid npm package lock')
  const expectedDir = path.resolve(directory)
  for (const name of names) {
    const suffix = '@tipolox/litgrid-' + name
    const entries = Object.entries(lock.packages).filter(([key]) => key === 'node_modules/' + suffix || key.endsWith('/node_modules/' + suffix))
    if (entries.length !== 1) throw new Error('Expected exactly one installed ' + suffix + ', found ' + entries.length)
    const [key, entry] = entries[0]
    const expected = path.join(expectedDir, 'tipolox-litgrid-' + name + '-' + version + '.tgz')
    if (entry.link || entry.version !== version || typeof entry.resolved !== 'string' || !entry.resolved.startsWith('file:') ||
        path.resolve(path.dirname(path.resolve(lockFile)), entry.resolved.slice(5)) !== expected) {
      throw new Error('Non-candidate, mismatched or workspace resolution rejected: ' + key)
    }
    console.log(key + ' => ' + entry.resolved + ' @ ' + entry.version)
  }
  for (const key of Object.keys(lock.packages)) {
    if (key.includes('node_modules/@tipolox/litgrid-') &&
        !names.some(name => key.endsWith('node_modules/@tipolox/litgrid-' + name)))
      throw new Error('Unexpected LitGrid dependency: ' + key)
  }
}
