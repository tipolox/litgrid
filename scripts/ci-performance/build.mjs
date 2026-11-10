import { build } from 'vite'
import { createHash } from 'node:crypto'
import { readFileSync,writeFileSync,mkdirSync,readdirSync,statSync } from 'node:fs'
import { resolve,relative } from 'node:path'
import { execFileSync } from 'node:child_process'
const root=process.cwd(),out=resolve('ci-perf-build')
const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex')
const git=(source,...args)=>execFileSync('git',['-C',source,...args],{encoding:'utf8'}).trim()
const pins={baseline:'0b1a3135c91c86fb6fd87bc4504fe1a90ad0c4b8',candidate:'180ac15b933361b405efe39b09d4284eace0c423'}
const walk=dir=>readdirSync(dir).flatMap(name=>{const file=resolve(dir,name);return statSync(file).isDirectory()?walk(file):[file]})
mkdirSync(out,{recursive:true})
const manifest={pins,node:process.version,harness:git(root,'rev-parse','HEAD'),lockSha256:sha('pnpm-lock.yaml'),bundles:{},sources:{}}
for(const [variant,pin] of Object.entries(pins)){
  const source=resolve('sources',variant)
  if(git(source,'rev-parse','HEAD')!==pin)throw Error('Incorrect source pin')
  if(sha(resolve(source,'pnpm-lock.yaml'))!==manifest.lockSha256)throw Error('Dependency lock differs')
  for(const file of ['package.json',...readdirSync(resolve(source,'packages')).map(p=>'packages/'+p+'/package.json')]){
    if(sha(resolve(source,file))!==sha(resolve(root,file)))throw Error('Dependency manifest differs '+file)
  }
  const alias={}
  for(const pkg of ['web','core','renderer','vue','react'])alias[`@tipolox/litgrid-${pkg}`]=resolve(source,`packages/grid-${pkg}/dist/index.js`)
  alias['@tipolox/litgrid-angular']=resolve(source,'dist/grid-angular/fesm2022/tipolox-litgrid-angular.mjs')
  alias.vue=resolve(root,'node_modules/vue/dist/vue.esm-bundler.js')
  const outDir=resolve(out,variant)
  await build({root,configFile:false,base:'./',logLevel:'warn',resolve:{alias,dedupe:['vue','react','react-dom','@angular/core','@angular/common','@angular/compiler','@angular/platform-browser']},define:{'process.env.NODE_ENV':'"production"',__VUE_OPTIONS_API__:'true',__VUE_PROD_DEVTOOLS__:'false',__VUE_PROD_HYDRATION_MISMATCH_DETAILS__:'false'},build:{outDir,emptyOutDir:true,minify:true,rollupOptions:{input:resolve('tests/contracts/ci-performance.browser.html')}}})
  manifest.bundles[variant]=Object.fromEntries(walk(outDir).sort().map(file=>[relative(outDir,file),sha(file)]))
  const files=git(source,'ls-files','packages','pnpm-lock.yaml').split('\n')
  manifest.sources[variant]=Object.fromEntries(files.map(file=>[file,sha(resolve(source,file))]))
}
// The control route serves the baseline directory itself, not another build.
manifest.bundles.control=manifest.bundles.baseline
writeFileSync(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
console.log('BUILD_MANIFEST '+JSON.stringify(manifest))
