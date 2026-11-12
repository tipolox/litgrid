import fs from 'node:fs'
import { checkPackedResolution, packedVersion } from './packed-artifacts.mjs'

const [lockFile, artifacts, version, ...requestedNames] = process.argv.slice(2)
if (!lockFile || !artifacts || !version) throw new Error('Usage: check-packed-resolution.mjs <package-lock.json> <artifact-directory> <expected-version> [package names...]')
const names = requestedNames.length ? requestedNames : ['core', 'renderer', 'web', 'react', 'vue', 'angular']
packedVersion(artifacts, names, version)
checkPackedResolution(JSON.parse(fs.readFileSync(lockFile, 'utf8')), lockFile, artifacts, version, names)
