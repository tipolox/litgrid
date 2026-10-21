const url=process.argv[2]
if(!url)throw new Error('Usage: wait-for-server.mjs <local URL>')
const deadline=Date.now()+90_000
let lastError
while(Date.now()<deadline){
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(5000)})
  if(!response.ok)throw new Error(`HTTP ${response.status}`)
  await response.text()
  console.log('READY',url,'under',process.version)
  process.exit(0)
 }catch(error){lastError=error;await new Promise(resolve=>setTimeout(resolve,500))}
}
throw new Error(`Server did not become ready: ${url}; ${lastError}`)
