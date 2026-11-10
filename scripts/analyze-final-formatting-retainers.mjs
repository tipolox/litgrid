import {readFileSync,writeFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {resolve} from 'node:path'
const folder=resolve(process.argv[2]??'.private/final-experiments/C-ownership')
const results=[]
for(const variant of ['current','shared-date']){
 const heap=JSON.parse(gunzipSync(readFileSync(resolve(folder,variant+'.active.heap.json.gz'))))
 const {nodes,edges,strings}=heap,meta=heap.snapshot.meta,nf=meta.node_fields,ef=meta.edge_fields,nw=nf.length,ew=ef.length
 const n=nodes.length/nw,offsets=new Uint32Array(n+1),targets=[]
 for(let i=0;i<n;i++)offsets[i+1]=offsets[i]+nodes[i*nw+nf.indexOf('edge_count')]*ew
 const label=edge=>{const type=meta.edge_types[0][edges[edge]];return type+':'+(['element','hidden'].includes(type)?edges[edge+1]:strings[edges[edge+1]])}
 for(let i=0;i<n;i++)for(let e=offsets[i];e<offsets[i+1];e+=ew)if(label(e)==='property:__litgridProbeId')targets.push(i)
 const parent=new Int32Array(n).fill(-1),parentEdge=new Int32Array(n).fill(-1),queue=new Uint32Array(n);let tail=1;queue[0]=0;parent[0]=0
 for(let head=0;head<tail;head++){
  const from=queue[head]
  for(let e=offsets[from];e<offsets[from+1];e+=ew){
   if(meta.edge_types[0][edges[e]]==='weak')continue
   const to=edges[e+ef.indexOf('to_node')]/nw
   if(parent[to]!==-1)continue
   parent[to]=from;parentEdge[to]=e;queue[tail++]=to
  }
 }
 const path=target=>{const result=[];for(let to=target;to!==0&&parent[to]>=0;to=parent[to]){const from=parent[to];result.push({from:strings[nodes[from*nw+nf.indexOf('name')]],edge:label(parentEdge[to]),to:strings[nodes[to*nw+nf.indexOf('name')]]})}return result.reverse()}
 const paths=targets.map(target=>({node:target,id:nodes[target*nw+nf.indexOf('id')],path:path(target)})).sort((a,b)=>b.path.length-a.path.length)
 results.push({variant,taggedDateObjects:targets.length,stronglyReachable:targets.filter(t=>parent[t]>=0).length,longestPaths:paths.slice(0,3)})
}
writeFileSync(resolve(folder,'retainers.json'),JSON.stringify({method:'Shortest strong retaining paths from heap root; weak edges excluded. Tagged Intl DateTimeFormat objects come only from the ownership probe. Names in production minified closure contexts may be mangled.',results},null,2)+'\n')
console.log(JSON.stringify(results.map(r=>({variant:r.variant,tagged:r.taggedDateObjects,strong:r.stronglyReachable,longest:r.longestPaths[0]?.path.length,contexts:r.longestPaths[0]?.path.filter(p=>p.edge.startsWith('context:')||p.to==='system / Context').slice(-12)}))))
