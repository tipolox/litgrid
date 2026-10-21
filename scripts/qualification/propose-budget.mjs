import fs from 'node:fs'
const dir=process.argv[2]??'docs/release/evidence/v1.2.0-integrated',s=JSON.parse(fs.readFileSync(dir+'/summary.json'))
const checks=[]
const add=(metric,scope,observed,limit,unit='ms')=>checks.push({metric,scope,observed,proposedLimit:limit,unit,withinProposal:observed<=limit})
for(const x of s.local.filter(x=>x.variant==='optimized-integrated')){
 const scope=`${x.selectionCase}/${x.rows}/${x.columns}`
 if(x.selectionCase==='keyed'){
  add('adoption p50',scope,x.adoption.p50,x.rows===30000?20:45)
  add('adoption p95',scope,x.adoption.p95,x.rows===30000?35:75)
 }else{
  const baseline=s.local.find(b=>b.selectionCase==='legacy'&&b.rows===x.rows&&b.columns===x.columns&&b.variant==='historical-v1.1.0').adoption.p95
  add('legacy adoption p95',scope,x.adoption.p95,baseline+Math.max(5,baseline*.2))
 }
}
for(const x of s.react.filter(x=>x.variant==='optimized-integrated')){add('React update incl. two frames p95',`${x.rows}/fresh=${x.freshConfig}`,x.update.p95,40);add('React render p95',`${x.rows}/fresh=${x.freshConfig}`,x.profiler.p95,1)}
for(const x of s.firstClick.filter(x=>x.variant==='optimized-integrated')){add('first click dispatch p95',`${x.rows}/${x.columns}`,x.dispatch.p95,2);add('first click through Lit update p95',`${x.rows}/${x.columns}`,x.update.p95,16.7)}
for(const x of s.external.filter(x=>x.keyed)){add('20-row external commit p95',`total=${x.totalRows}`,x.commit.p95,5);add('external identity reads max',`total=${x.totalRows}`,x.identityReads.max,24,'reads')}
add('100k core keyed cold setData p95','100000',s.core.find(x=>x.rows===100000&&x.keyed).synchronization.p95,45)
const budget={status:'PROPOSED ONLY — founder approval absent',performanceVerdict:'INCONCLUSIVE pending an accepted workload budget and independent review',scope:'Same fixed Windows/Chromium fixture, 1280x900, 30k/100k local rows, 120/200 columns, exact GC/sampling protocol in report. Not a universal production SLA.',warning:'Thresholds were proposed after viewing this evidence. Within-proposal observations are descriptive, not an approved budget PASS. Obtain owner decision and validate prospectively during release preparation.',checks}
fs.writeFileSync(dir+'/proposed-budget.json',JSON.stringify(budget,null,2)+'\n')
console.log('Proposed observations within thresholds:',checks.filter(x=>x.withinProposal).length,'/',checks.length,'; approval absent')
