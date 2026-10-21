import ts from 'typescript'
import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
const root=process.cwd(),base='206192e999a38c6b944944eabe2724ef4e9f8cef'
const parsed=ts.parseJsonConfigFileContent(ts.readConfigFile('tsconfig.json',ts.sys.readFile).config,ts.sys,root)
const files=parsed.fileNames.filter(f=>!/(?:^|[\\/])(?:dist|obj|bin|\.private|\.serena)[\\/]/.test(path.relative(root,f)))
const changed=['packages/grid-react/src/DataGrid.test.tsx','packages/grid-vue/src/DataGrid.test.ts','packages/grid-angular/src/DataGridComponent.test.ts']
const overlay=new Map(changed.map(f=>[path.resolve(f).toLowerCase(),execFileSync('git',['show',`${base}:${f}`],{encoding:'utf8'})]))
const result={base,typescript:ts.version,description:'Source roots exclude build outputs; same installed dependency tree and compiler for original and corrected fixture comparison.',cases:{}}
for(const [name,original,real,bundler] of [['original',true,false,false],['corrected',false,false,false],['realReactBundler',false,true,true]]){
 const options={...parsed.options,noEmit:true,...(bundler?{moduleResolution:ts.ModuleResolutionKind.Bundler}:{})}
 const host=ts.createCompilerHost(options),get=host.getSourceFile.bind(host)
 if(original)host.getSourceFile=(f,language,...rest)=>overlay.has(path.resolve(f).toLowerCase())?ts.createSourceFile(f,overlay.get(path.resolve(f).toLowerCase()),language):get(f,language,...rest)
 const program=ts.createProgram(files.filter(f=>!real||!f.endsWith('react-shim.d.ts')),options,host)
 const d=ts.getPreEmitDiagnostics(program).map(d=>({file:d.file?path.relative(root,d.file.fileName).replaceAll('\\','/'):'',code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' ')}))
 result.cases[name]=d;console.log(name,d.length)
 fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2))
}
const signatures=new Set(result.cases.original.map(d=>JSON.stringify(d)))
result.added=result.cases.corrected.filter(d=>!signatures.has(JSON.stringify(d)))
fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2));console.log('New signatures',result.added.length)
