import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Official semver regex (matching full string)
const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

const targetVersion = process.argv[2];

if (process.argv.length !== 3 || !targetVersion) {
  console.error('Error: Exactly one version argument is required.');
  console.error('Usage: node scripts/set-version.mjs <version>');
  process.exit(1);
}

if (!SEMVER_REGEX.test(targetVersion)) {
  console.error(`Error: "${targetVersion}" is not a valid semantic version.`);
  process.exit(1);
}

const packageJsonPaths = [
  'package.json',
  'packages/grid-core/package.json',
  'packages/grid-renderer/package.json',
  'packages/grid-web/package.json',
  'packages/grid-react/package.json',
  'packages/grid-vue/package.json',
  'packages/grid-angular/package.json',
  'packages/grid-blazor/package.json',
];

const csprojPaths = [
  'packages/grid-blazor/src/Tipolox.LitGrid.Blazor.csproj',
];

const updatedFiles = [];

for (const relPath of packageJsonPaths) {
  const fullPath = resolve(rootDir, relPath);
  const rawContent = readFileSync(fullPath, 'utf8');

  // Regex to replace only the top-level "version" field
  const versionRegex = /^(\s*"version"\s*:\s*)"[^"]*"(,?)$/m;
  if (!versionRegex.test(rawContent)) {
    console.error(`Error: "version" field not found in ${relPath}`);
    process.exit(1);
  }

  const updatedContent = rawContent.replace(versionRegex, `$1"${targetVersion}"$2`);
  writeFileSync(fullPath, updatedContent, 'utf8');
  updatedFiles.push(relPath);
}

for (const relPath of csprojPaths) {
  const fullPath = resolve(rootDir, relPath);
  const rawContent = readFileSync(fullPath, 'utf8');

  const versionRegex = /<Version>[^<]*<\/Version>/;
  if (!versionRegex.test(rawContent)) {
    console.error(`Error: <Version> element not found in ${relPath}`);
    process.exit(1);
  }

  const updatedContent = rawContent.replace(
    versionRegex,
    `<Version>${targetVersion}</Version>`
  );

  writeFileSync(fullPath, updatedContent, 'utf8');
  updatedFiles.push(relPath);
}

console.log(`Successfully synchronized version to ${targetVersion}:`);
for (const file of updatedFiles) {
  console.log(`  - ${file}`);
}
