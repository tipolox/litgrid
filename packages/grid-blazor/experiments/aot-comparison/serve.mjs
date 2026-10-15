import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const directory = resolve('packages/grid-blazor/experiments/aot-comparison/bin');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.wasm': 'application/wasm', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const ports = { interpreter: 5190, aot: 5191, 'stock-interpreter': 5192, 'public-interpreter': 5193, 'public-aot': 5194, 'stock-debug': 5195 };
for (const variant of process.env.LITGRID_SERVER_VARIANTS?.split(',') ?? ['interpreter','aot']) {
  const port = ports[variant];
  const root = resolve(directory, variant, 'wwwroot');
  http.createServer(async (request, response) => {
    try {
      const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const original = resolve(root, '.' + (path === '/' ? '/index.html' : path));
      if (!original.startsWith(root + sep)) { response.writeHead(403).end(); return; }
      let file = original, encoding;
      const accept = request.headers['accept-encoding'] ?? '';
      for (const [name, suffix] of [['br', '.br'], ['gzip', '.gz']]) {
        if (!accept.includes(name)) continue;
        try { if ((await stat(original + suffix)).isFile()) { file = original + suffix; encoding = name; break; } } catch {}
      }
      const bytes = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[extname(original)] ?? 'application/octet-stream',
        'Content-Length': bytes.length, 'Cache-Control': 'no-store', 'Vary': 'Accept-Encoding',
        ...(encoding ? { 'Content-Encoding': encoding } : {}) });
      response.end(bytes);
    } catch (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 500).end(); }
  }).listen(port, '127.0.0.1', () => console.log(`${variant}: http://127.0.0.1:${port} (${root})`));
}
