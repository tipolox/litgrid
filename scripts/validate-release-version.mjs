import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Semantic Versioning 2.0.0, matched against the complete value.
const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

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

const csprojPath = 'packages/grid-blazor/src/Tipolox.LitGrid.Blazor.csproj';

function failUsage(message) {
  console.error(`FAIL: ${message}`);
  console.error('Usage: node scripts/validate-release-version.mjs <version>');
  process.exit(1);
}

if (process.argv.length !== 3 || !process.argv[2]) {
  failUsage('exactly one version argument is required.');
}

const requestedVersion = process.argv[2].startsWith('v')
  ? process.argv[2].slice(1)
  : process.argv[2];

if (!SEMVER_REGEX.test(requestedVersion)) {
  failUsage(`"${process.argv[2]}" is not a valid semantic version.`);
}

const failures = [];
const checkedFiles = [];

function validateVersion(relPath, actualVersion) {
  checkedFiles.push(relPath);

  if (typeof actualVersion !== 'string' || !SEMVER_REGEX.test(actualVersion)) {
    failures.push({ relPath, actualVersion: 'malformed or missing version field' });
  } else if (actualVersion !== requestedVersion) {
    failures.push({ relPath, actualVersion });
  }
}

for (const relPath of packageJsonPaths) {
  try {
    const packageJson = JSON.parse(readFileSync(resolve(rootDir, relPath), 'utf8'));
    validateVersion(relPath, packageJson.version);
  } catch (error) {
    checkedFiles.push(relPath);
    failures.push({ relPath, actualVersion: `unreadable or malformed JSON (${error.message})` });
  }
}

try {
  const csproj = readFileSync(resolve(rootDir, csprojPath), 'utf8');
  const versions = [...csproj.matchAll(/<Version>\s*([^<]*?)\s*<\/Version>/g)];

  if (versions.length !== 1) {
    validateVersion(csprojPath, undefined);
  } else {
    validateVersion(csprojPath, versions[0][1]);
  }
} catch (error) {
  checkedFiles.push(csprojPath);
  failures.push({ relPath: csprojPath, actualVersion: `unreadable (${error.message})` });
}

if (failures.length > 0) {
  console.error(`FAIL: release version validation failed for expected version ${requestedVersion}.`);
  for (const { relPath, actualVersion } of failures) {
    console.error(`  - ${relPath}`);
    console.error(`    expected: ${requestedVersion}`);
    console.error(`    actual:   ${actualVersion}`);
  }
  process.exit(1);
}

console.log(`PASS: all release versions match ${requestedVersion}.`);
for (const relPath of checkedFiles) {
  console.log(`  - ${relPath}`);
}
