import { spawnSync } from 'node:child_process'

// A bounded public API/adapter gate. The broad root tsc remains a separate,
// failing baseline tracked by #31; this command does not claim to replace it.
const result = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.contracts.json', '--pretty', 'false'], { stdio: 'inherit' })
if (result.error) throw result.error
process.exit(result.status ?? 1)
