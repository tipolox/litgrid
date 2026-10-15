import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const output = process.env.LITGRID_FRESHNESS_OUTPUT;
assert.ok(output, 'Choose a fresh output path');
await writeFile(output, '', { flag: 'wx' });
const root = new URL('../../../../', import.meta.url);
const read = path => readFile(new URL(path, root));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const assets = [];
for (const name of ['litgrid-blazor.js', 'litgrid-blazor.js.map']) {
  const current = await read('packages/grid-blazor/src/wwwroot/' + name);
  for (const host of ['wasm-browser-final', 'wasm-b11-final']) {
    const published = await read(`packages/grid-blazor/experiments/b11-reconnect/bin/${host}/wwwroot/_content/Tipolox.LitGrid.Blazor/${name}`);
    assert.equal(digest(published), digest(current), host + ' ' + name);
  }
  const response = await fetch((process.env.LITGRID_SERVER_URL ?? 'http://127.0.0.1:5271') + '/_content/Tipolox.LitGrid.Blazor/' + name);
  assert.ok(response.ok);
  assert.equal(digest(Buffer.from(await response.arrayBuffer())), digest(current), 'served Server ' + name);
  assets.push({ name, bytes: current.length, sha256: digest(current) });
}
const map = JSON.parse(await read('packages/grid-blazor/src/wwwroot/litgrid-blazor.js.map'));
for (const source of ['index.ts', 'gridBindings.ts']) {
  const index = source === 'index.ts' ? map.sourcesContent.findIndex(text => text?.includes('export function initGrid(')) : map.sources.findIndex(path => path.endsWith('gridBindings.ts'));
  assert.ok(index >= 0);
  const current = (await read('packages/grid-blazor/src/' + source)).toString('utf8').replaceAll('\r\n', '\n');
  assert.equal(map.sourcesContent[index].replaceAll('\r\n', '\n'), current, source + ' source map');
}
await writeFile(output, JSON.stringify({ assets, wasmHostsMatch: true, serverMatches: true, sourceMapMatchesSource: true }, null, 2));
console.log('PASS: bundle/map match both final WASM hosts and served Server; index/binding map sources are current');
