import {spawnSync} from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
if(process.argv.length!==4)throw new Error('Usage: prepare-blazor-consumer.mjs <fresh-directory> <local-nuget-directory>')
const out=path.resolve(process.argv[2]),nuget=path.resolve(process.argv[3])
const versions=fs.readdirSync(nuget).map(name=>/^Tipolox\.LitGrid\.Blazor\.(.+)\.nupkg$/i.exec(name)?.[1]).filter(Boolean)
if(versions.length!==1)throw new Error('Expected one local NuGet archive to determine its unchanged version')
// Isolate same-version candidate packages from the global published-package cache.
const cache=path.join(out,'.nuget-packages')
function dotnet(args){const r=spawnSync('dotnet',args,{stdio:'inherit',env:{...process.env,NUGET_PACKAGES:cache}});if(r.error)throw r.error;if(r.status)process.exit(r.status)}
dotnet(['new','blazor','--framework','net8.0','--interactivity','Server','--no-https','--no-restore','--output',out])
const project=fs.readdirSync(out).find(f=>f.endsWith('.csproj'))
const xml=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')
fs.writeFileSync(path.join(out,'NuGet.Config'),`<?xml version="1.0" encoding="utf-8"?><configuration><packageSources><clear/><add key="candidate" value="${xml(nuget)}"/><add key="nuget.org" value="https://api.nuget.org/v3/index.json"/></packageSources><packageSourceMapping><packageSource key="candidate"><package pattern="Tipolox.LitGrid.Blazor"/></packageSource><packageSource key="nuget.org"><package pattern="*"/></packageSource></packageSourceMapping></configuration>`)
dotnet(['add',path.join(out,project),'package','Tipolox.LitGrid.Blazor','--version',versions[0],'--no-restore'])
dotnet(['restore',path.join(out,project),'--configfile',path.join(out,'NuGet.Config')])
fs.copyFileSync(new URL('./consumer/BlazorHome.razor.template',import.meta.url),path.join(out,'Components/Pages/Home.razor'))
dotnet(['build',path.join(out,project),'-c','Release'])
// Local deployable output only: this command does not deploy or publish NuGet.
dotnet(['publish',path.join(out,project),'-c','Release','-o',path.join(out,'publish')])
fs.writeFileSync(path.join(out,'qualification-manifest.json'),JSON.stringify({version:versions[0],cache,localFeed:nuget,project,publishedDll:path.join(out,'publish',path.basename(project,'.csproj')+'.dll')},null,2))
console.log('Serve the built DLL from',path.join(out,'publish'),'on http://127.0.0.1:5207')
