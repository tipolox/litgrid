import fs from 'node:fs'
import path from 'node:path'

const lock = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const names = ['core', 'renderer', 'web', 'react', 'vue', 'angular']
for (const name of names) {
  const suffix = '@tipolox/litgrid-' + name
  const entries = Object.entries(lock.packages).filter(([key]) => key === 'node_modules/' + suffix || key.endsWith('/node_modules/' + suffix))
  if (entries.length !== 1) throw new Error('Expected exactly one installed ' + suffix + ', found ' + entries.length)
  const [key, entry] = entries[0]
  const expected = 'tipolox-litgrid-' + name + '-1.2.3.tgz'
  if (entry.link || typeof entry.resolved !== 'string' || !entry.resolved.startsWith('file:') || path.basename(entry.resolved) !== expected)
    throw new Error('Registry or workspace resolution rejected: ' + key + ' ' + JSON.stringify(entry))
  console.log(key + ' => ' + entry.resolved)
}
for (const key of Object.keys(lock.packages)) {
  if (key.includes('node_modules/@tipolox/litgrid-') &&
      !names.some(name => key.endsWith('node_modules/@tipolox/litgrid-' + name)))
    throw new Error('Unexpected LitGrid dependency: ' + key)
}
