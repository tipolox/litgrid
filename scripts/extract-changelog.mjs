import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const rootDir = resolve(dirname(__filename), '..');
const version = process.argv[2];

if (process.argv.length !== 3 || !version) {
  console.error('Usage: node scripts/extract-changelog.mjs <version>');
  process.exit(1);
}

const changelog = readFileSync(resolve(rootDir, 'CHANGELOG.md'), 'utf8');
const lines = changelog.split(/\r?\n/);
const heading = `## ${version}`;
const start = lines.findIndex((line) => line === heading);

if (start === -1) {
  console.error(`FAIL: CHANGELOG.md has no ${heading} entry.`);
  process.exit(1);
}

const end = lines.findIndex((line, index) => index > start && /^##\s+\S/.test(line));
const section = lines.slice(start + 1, end === -1 ? undefined : end).join('\n').trim();

if (!section) {
  console.error(`FAIL: CHANGELOG.md entry ${heading} has no release notes.`);
  process.exit(1);
}

process.stdout.write(`${section}\n`);
