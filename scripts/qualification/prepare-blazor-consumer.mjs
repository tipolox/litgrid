import {spawnSync} from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
if(process.argv.length!==4)throw new Error('Usage: prepare-blazor-consumer.mjs <fresh-directory> <local-nuget-directory>')
const out=path.resolve(process.argv[2]),nuget=path.resolve(process.argv[3])
function dotnet(args){const r=spawnSync('dotnet',args,{stdio:'inherit'});if(r.error)throw r.error;if(r.status)process.exit(r.status)}
dotnet(['new','blazor','--framework','net8.0','--interactivity','Server','--no-https','--output',out])
const project=fs.readdirSync(out).find(f=>f.endsWith('.csproj'))
dotnet(['add',path.join(out,project),'package','Tipolox.LitGrid.Blazor','--version','1.2.0','--source',nuget])
fs.copyFileSync(new URL('./consumer/BlazorHome.razor.template',import.meta.url),path.join(out,'Components/Pages/Home.razor'))
dotnet(['build',path.join(out,project),'-c','Release'])
// Local deployable output only: this command does not deploy or publish NuGet.
dotnet(['publish',path.join(out,project),'-c','Release','-o',path.join(out,'publish')])
console.log('Serve the built DLL from',path.join(out,'publish'),'on http://127.0.0.1:5207')
