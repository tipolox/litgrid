import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, test } from 'vitest';

const script = fileURLToPath(new URL('./embed-sourcemap-sources.mjs', import.meta.url));
const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'litgrid-map-test-'));
  roots.push(root);
  const output = join(root, 'dist');
  mkdirSync(output);
  return { root, output };
}
function run(output: string) {
  return spawnSync(process.execPath, [script, output], { encoding: 'utf8' });
}
function map(sources: string[], extra = {}) {
  return JSON.stringify({ version: 3, sources, names: [], mappings: 'AAAA', ...extra });
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test('JavaScript and declaration maps retain usable original sources after source removal', () => {
  const { root, output } = fixture();
  mkdirSync(join(root, 'src'));
  const source = 'export const answer: number = 42;\r\n';
  writeFileSync(join(root, 'src', 'index.ts'), source);
  for (const name of ['index.js.map', 'index.d.ts.map']) {
    writeFileSync(join(output, name), map(['index.ts'], { sourceRoot: '../src/' }));
  }
  expect(run(output).status).toBe(0);
  rmSync(join(root, 'src'), { recursive: true });
  for (const name of ['index.js.map', 'index.d.ts.map']) {
    const result = JSON.parse(readFileSync(join(output, name), 'utf8'));
    expect(result.sourcesContent).toEqual([source]);
    expect(result.mappings).toBe('AAAA');
    expect(result.sourceRoot).toBe('../src/');
  }
});

test('already embedded bundle sources work without source files and repeated runs are stable', () => {
  const { output } = fixture();
  const path = join(output, 'bundle.mjs.map');
  writeFileSync(path, map(['missing.ts'], { sourcesContent: ['export {};'] }));
  expect(run(output).status).toBe(0);
  const first = readFileSync(path, 'utf8');
  expect(run(output).status).toBe(0);
  expect(readFileSync(path, 'utf8')).toBe(first);
});

test('a missing original source fails the build instead of producing an unsupported map', () => {
  const { output } = fixture();
  writeFileSync(join(output, 'index.d.ts.map'), map(['missing.ts']));
  expect(run(output).status).not.toBe(0);
});

test('absolute build-machine source paths are rejected even when content is embedded', () => {
  const { output } = fixture();
  writeFileSync(join(output, 'index.js.map'), map(['C:/build/source.ts'], { sourcesContent: ['export {};'] }));
  expect(run(output).status).not.toBe(0);
});

test('an output directory with no maps fails rather than silently skipping completion', () => {
  const { output } = fixture();
  expect(run(output).status).not.toBe(0);
});
