import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../../../../', import.meta.url);
const read = relative => readFile(new URL(relative, root));
const digest = data => createHash('sha256').update(data).digest('hex');
const prefix = 'packages/grid-blazor/src/wwwroot/';
const wasm = 'packages/grid-blazor/experiments/b11-review/bin/wasm-final/wwwroot/_content/Tipolox.LitGrid.Blazor/';
const assets = [];
for (const name of ['litgrid-blazor.js', 'litgrid-blazor.js.map']) {
  const current = await read(prefix + name), published = await read(wasm + name);
  assert.equal(digest(current), digest(published), 'published WASM ' + name);
  const response = await fetch('http://127.0.0.1:5223/_content/Tipolox.LitGrid.Blazor/' + name);
  assert.ok(response.ok, 'Server asset response');
  assert.equal(digest(current), digest(Buffer.from(await response.arrayBuffer())), 'served Server ' + name);
  const before = await read('packages/grid-blazor/experiments/b11-review/bin/before-assets/' + name);
  assert.notEqual(digest(current), digest(before), 'regenerated ' + name);
  assets.push({ name, sha256: digest(current), bytes: current.length, wasmMatches: true, serverMatches: true, regenerated: true });
}
const map = JSON.parse(await read(prefix + 'litgrid-blazor.js.map'));
const bindingIndex = map.sources.findIndex(source => source.endsWith('gridBindings.ts'));
assert.ok(bindingIndex >= 0, 'binding source in map');
const source = (await read('packages/grid-blazor/src/gridBindings.ts')).toString('utf8').replaceAll('\r\n', '\n');
assert.equal(map.sourcesContent[bindingIndex].replaceAll('\r\n', '\n'), source, 'map contains current binding source');
const publicTypes = (await read('packages/grid-web/dist/types.d.ts')).toString('utf8');
assert.match(publicTypes, /inferColumns\?: boolean/); assert.match(publicTypes, /updateColumnSchema\?:/);
await writeFile(new URL(process.env.LITGRID_REVIEW_ASSET_OUTPUT ?? 'asset-verification.json', import.meta.url), JSON.stringify({ assets, sourceMapMatchesSource: true, publicCapabilitiesOptional: true }, null, 2), { flag: 'wx' });
console.log('PASS: regenerated bundle/map match published WASM and served Server; map source and public typing verified');
