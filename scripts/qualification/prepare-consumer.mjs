import fs from 'node:fs'
import path from 'node:path'
const [out, artifacts] = process.argv.slice(2).map(p => path.resolve(p))
if (!out || !artifacts) throw new Error('Usage: prepare-consumer.mjs <fresh-directory> <npm-artifact-directory>')
fs.mkdirSync(out, { recursive: true })
fs.cpSync(new URL('./consumer/app', import.meta.url), path.join(out, 'app'), { recursive: true })
fs.copyFileSync(new URL('./consumer/api.tsx.template', import.meta.url), path.join(out,'api.tsx'))
fs.writeFileSync(path.join(out,'tsconfig.api.json'), JSON.stringify({compilerOptions:{strict:true,noEmit:true,target:'ES2022',module:'ESNext',moduleResolution:'Bundler',jsx:'react-jsx',lib:['ES2022','DOM'],types:['node','react','react-dom']},include:['api.tsx']}))
const dependencies = Object.fromEntries(['core','renderer','web','react','vue','angular'].map(p => [`@tipolox/litgrid-${p}`, `file:${path.join(artifacts, `tipolox-litgrid-${p}-1.2.0.tgz`).replaceAll('\\','/')}`]))
Object.assign(dependencies, { next:'16.4.2', react:'19.2.5', 'react-dom':'19.2.5', vue:'3.5.32', '@angular/core':'22.1.3', '@angular/common':'22.1.3', '@angular/compiler':'22.1.3', '@angular/platform-browser':'22.1.3', rxjs:'7.8.2', typescript:'6.0.3', '@types/react':'19.2.14', '@types/react-dom':'19.2.3', '@types/node':'22.20.5' })
fs.writeFileSync(path.join(out,'package.json'), JSON.stringify({ private:true, type:'module', scripts:{build:'next build',start:'next start -p 5201'}, dependencies },null,2))
fs.writeFileSync(path.join(out,'next.config.mjs'), 'import { dirname } from "node:path"\nimport { fileURLToPath } from "node:url"\nexport default { reactStrictMode: true, turbopack: { root: dirname(fileURLToPath(import.meta.url)) } }\n')
fs.writeFileSync(path.join(out,'jsconfig.json'), JSON.stringify({compilerOptions:{baseUrl:'.',paths:{}}}))
console.log('Prepared isolated consumer at',out)
