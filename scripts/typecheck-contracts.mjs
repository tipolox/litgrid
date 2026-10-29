import { spawnSync } from 'node:child_process'

// A bounded public API/adapter gate, retained alongside typecheck:all.
// Published declarations are checked separately after package builds.
const result = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.contracts.json', '--pretty', 'false'], { stdio: 'inherit' })
if (result.error) throw result.error
process.exit(result.status ?? 1)
