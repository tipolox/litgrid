import { spawn, spawnSync } from 'node:child_process'
const run=(args)=>new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,args,{stdio:'inherit',windowsHide:true})
  child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Browser test exited '+code)))
})
const server=spawn('dotnet',['run','--project','packages/grid-blazor/tests/browser/BrowserHost.csproj','-c','Release','--no-build','--urls','http://127.0.0.1:5186'],{stdio:['ignore','pipe','pipe'],windowsHide:true,detached:process.platform!=='win32'})
let startup=''
server.stdout.on('data',chunk=>{startup+=chunk});server.stderr.on('data',chunk=>{startup+=chunk})
try{
  let ready=false
  for(let attempt=0;attempt<120;attempt++){
    if(server.exitCode!==null)throw Error('Blazor host exited: '+startup)
    if(startup.includes('Now listening on: http://127.0.0.1:5186')){
      try{const response=await fetch('http://127.0.0.1:5186');if(response.ok){ready=true;break}}catch{}
    }
    await new Promise(resolve=>setTimeout(resolve,500))
  }
  if(!ready)throw Error('Blazor host did not become ready: '+startup)
  if(process.argv.includes('--regressions'))await run(['packages/grid-blazor/tests/browser/run.mjs'])
  await run(['packages/grid-blazor/tests/browser/run-alignment.mjs'])
}finally{
  if(server.pid){
    if(process.platform==='win32')spawnSync('taskkill',['/pid',String(server.pid),'/T','/F'],{stdio:'ignore',windowsHide:true})
    else try{process.kill(-server.pid,'SIGTERM')}catch{}
  }
}
