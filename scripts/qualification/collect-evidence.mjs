import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const out='docs/release/evidence/v1.2.0'
fs.mkdirSync(out,{recursive:true})
const read=file=>{const b=fs.readFileSync(file);return (b[0]===255&&b[1]===254?b.subarray(2).toString('utf16le'):b.toString('utf8')).replace(/^\uFEFF/,'')}
const raw=['v120-root-types-clean.log','v120-root-types-final.log','v120-types-shim.json','v120-types-real.json','v120-types-bundler.json','v120-types-comparison.json','v120-tests.log','v120-tests-final.log','v120-build.log','v120-build-final.log','v120-dotnet-test.log','v120-dotnet-build.log','v120-consumer-types.log','v120-next-build.log','v120-blazor-consumer-build.log','v120-blazor-consumer-publish.log','v120-artifact-validation.log','v120-packaged-browser.json','v120-strictmode-browser.json','v120-adapters-browser.json','v120-performance.json','v120-performance-repeat.json','v120-performance-profile.json']
for(const file of raw){const source=path.join('.private',file);if(fs.existsSync(source))fs.writeFileSync(path.join(out,file),read(source).replace(/\x1b\[[0-9;]*m/g,'').replaceAll('D:/Work/litgrid-p0','<workspace>').replaceAll('D:\\Work\\litgrid-p0','<workspace>'))}
for(const [source,dest]of[['v120-external-browser.log','external-browser.json'],['v120-column-browser.log','column-browser.json'],['v120-selection-browser.log','selection-browser.json']]){
 const log=read(path.join('.private',source));let value
 for(let i=0;i<log.length;i++)if(log[i]==='{')try{value=JSON.parse(log.slice(i));break}catch{}
 if(!value)throw new Error(`No browser result in ${source}`)
 fs.writeFileSync(path.join(out,dest),JSON.stringify(value,null,2)+'\n')
}
const sums=[]
for(const dir of ['npm','nuget'])for(const file of fs.readdirSync(`.private/v120-artifacts/${dir}`).filter(f=>/\.(tgz|nupkg)$/.test(f))){const bytes=fs.readFileSync(`.private/v120-artifacts/${dir}/${file}`);sums.push(`${crypto.createHash('sha256').update(bytes).digest('hex')}  ${dir}/${file}`)}
for(const dest of [path.join(out,'SHA256SUMS.txt'),'.private/v120-artifacts/SHA256SUMS.txt'])fs.writeFileSync(dest,sums.join('\n')+'\n')
console.log('Collected',raw.length+4,'evidence files; local artifacts remain ignored')
