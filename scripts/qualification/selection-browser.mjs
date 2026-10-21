import {createServer} from 'vite'
import {existsSync} from 'node:fs'
import {dirname,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
const root=resolve(process.argv[2]),playwright=resolve(process.argv[3])
const server=await createServer({root,configFile:false,server:{host:'127.0.0.1',port:5174,strictPort:true},plugins:[{name:'qualification-source',enforce:'pre',resolveId(source,importer){const packages={'@tipolox/litgrid-core':'grid-core','@tipolox/litgrid-renderer':'grid-renderer'};if(packages[source])return resolve(root,'packages',packages[source],'src/index.ts');if(importer&&source.startsWith('.')&&source.endsWith('.js')){const ts=resolve(dirname(importer),source.slice(0,-3)+'.ts');if(!ts.includes('node_modules')&&existsSync(ts))return ts}}}]})
await server.listen()
try { process.argv[2]=pathToFileURL(resolve(playwright,'index.mjs')).href;await import(pathToFileURL(resolve(root,'scripts/selection-browser-check.mjs'))) } finally {await server.close()}
