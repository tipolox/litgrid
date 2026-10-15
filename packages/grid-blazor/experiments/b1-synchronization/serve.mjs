import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(process.argv[2]);
const port = Number(process.argv[3] ?? 5197);
const types = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.wasm':'application/wasm', '.css':'text/css' };
http.createServer(async (req,res) => {
  try {
    const path = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const original = resolve(root,'.' + (path === '/' ? '/index.html' : path));
    if (!original.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    let file = original, encoding;
    for (const [name,suffix] of [['br','.br'],['gzip','.gz']]) {
      if (!(req.headers['accept-encoding'] ?? '').includes(name)) continue;
      try { if ((await stat(original+suffix)).isFile()) { file=original+suffix; encoding=name; break; } } catch {}
    }
    const bytes=await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(original)] ?? 'application/octet-stream', 'Cache-Control':'no-store', 'Vary':'Accept-Encoding', ...(encoding ? {'Content-Encoding':encoding} : {})}).end(bytes);
  } catch (error) { res.writeHead(error.code==='ENOENT'?404:500).end(); }
}).listen(port,'127.0.0.1',()=>console.log(`B1 static publish: http://127.0.0.1:${port}`));
