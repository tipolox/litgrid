import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

// TypeScript's inlineSources does not embed declaration-map sources. Complete
// both kinds of maps before packing, while the original sources still exist.
function embedSources(directory) {
  let count = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      count += embedSources(path);
    } else if (entry.isFile() && entry.name.endsWith('.map')) {
      const map = JSON.parse(readFileSync(path, 'utf8'));
      if (map.version !== 3 || !Array.isArray(map.sources)) {
        throw new Error(`${path}: expected a version 3 source map`);
      }
      if (isAbsolute(map.sourceRoot ?? '') || /^[a-z][a-z\d+.-]*:/i.test(map.sourceRoot ?? '')) {
        throw new Error(`${path}: sourceRoot must be relative`);
      }
      map.sourcesContent = map.sources.map((source, index) => {
        if (isAbsolute(source) || /^[a-z][a-z\d+.-]*:/i.test(source)) {
          throw new Error(`${path}: source must be relative: ${source}`);
        }
        const content = map.sourcesContent?.[index];
        return typeof content === 'string'
          ? content
          : readFileSync(resolve(dirname(path), map.sourceRoot ?? '', source), 'utf8');
      });
      writeFileSync(path, JSON.stringify(map));
      count++;
    }
  }
  return count;
}

if (process.argv.length !== 3) {
  console.error('Usage: node scripts/embed-sourcemap-sources.mjs <output-directory>');
  process.exit(1);
}
const directory = resolve(process.argv[2]);
const count = embedSources(directory);
if (count === 0) throw new Error(`${directory}: no source maps found`);
console.log(`Embedded original sources in ${count} source maps.`);
