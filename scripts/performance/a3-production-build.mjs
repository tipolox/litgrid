import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync, execFileSync } from 'node:child_process'

// Use the exact pre-A3 main revision as a control. Source substitution is
// temporary in this CI-only checkout; restore the original bytes in finally.
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)))
const referenceSha='428ea85fbb7cfa90955b21422598df2d29c1b8af'
const relative='packages/grid-core/src/features/selection/selectionCoordination.ts'
const sourcePath=resolve(root,relative)
const saved=readFileSync(sourcePath)
const previous=execFileSync('git',['show',referenceSha+':'+relative],{cwd:root})
// The isolated pre-A3 module predates B1's internal targeted-source lookup.
// Keep its legacy lookup behavior for that entry point; A3 measures config
// reconciliation, not targeted refresh. Candidate bytes remain untouched.
const legacyEntry='    indexForKey,'
const previousText=previous.toString('utf8')
if(previousText.split(legacyEntry).length!==2)throw new Error('Unexpected A3 baseline lookup export')
const compatiblePrevious=Buffer.from(previousText.replace(legacyEntry,
  '    indexForKey, currentIndexForKey: indexForKey,'))
const directory=resolve(root,'.private/a3/variants')
function build(name,bytes){
  writeFileSync(sourcePath,bytes)
  const command=spawnSync('pnpm',['--dir','packages/grid-core','build'],{
    cwd:root,stdio:'inherit',shell:process.platform==='win32'
  })
  if(command.error||command.status!==0){
    throw new Error(name+' build failed: '+(command.error?.message||command.status))
  }
  const target=resolve(directory,name)
  rmSync(target,{recursive:true,force:true})
  cpSync(resolve(root,'packages/grid-core/dist'),target,{recursive:true})
  writeFileSync(resolve(target,'package.json'),'{"type":"module"}\n')
  console.log('A3 production qualification built '+name)
}
mkdirSync(directory,{recursive:true})
try {
  build('baseline',compatiblePrevious)
  build('candidate',saved)
}finally{
  writeFileSync(sourcePath,saved)
}
console.log('A3 reference '+referenceSha+' and checked-out candidate built separately. No authored source left changed.')
