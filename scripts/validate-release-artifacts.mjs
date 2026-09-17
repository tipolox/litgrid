import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync, inflateRawSync } from 'node:zlib';

const expectedPackages = [
  '@tipolox/litgrid-core',
  '@tipolox/litgrid-renderer',
  '@tipolox/litgrid-web',
  '@tipolox/litgrid-react',
  '@tipolox/litgrid-vue',
  '@tipolox/litgrid-angular',
];

function fail(message) {
  throw new Error(message);
}

function readNullTerminated(buffer, offset, length) {
  const end = buffer.indexOf(0, offset);
  return buffer.subarray(offset, end === -1 || end > offset + length ? offset + length : end).toString('utf8');
}

function readTarGz(path) {
  const archive = gunzipSync(readFileSync(path));
  const files = new Map();

  for (let offset = 0; offset + 512 <= archive.length;) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;

    const name = readNullTerminated(header, 0, 100);
    const prefix = readNullTerminated(header, 345, 155);
    const pathName = prefix ? `${prefix}/${name}` : name;
    const sizeText = readNullTerminated(header, 124, 12).trim();
    const size = sizeText ? Number.parseInt(sizeText, 8) : 0;
    if (!Number.isSafeInteger(size)) fail(`${path}: invalid tar entry size for ${pathName}`);

    const contentStart = offset + 512;
    const contentEnd = contentStart + size;
    if (contentEnd > archive.length) fail(`${path}: truncated tar entry ${pathName}`);
    if (header[156] === 0 || header[156] === 48) files.set(pathName, archive.subarray(contentStart, contentEnd));
    offset = contentStart + Math.ceil(size / 512) * 512;
  }

  return files;
}

function readZip(path) {
  const archive = readFileSync(path);
  let endOfCentralDirectory = -1;
  for (let index = archive.length - 22; index >= Math.max(0, archive.length - 65557); index -= 1) {
    if (archive.readUInt32LE(index) === 0x06054b50) {
      endOfCentralDirectory = index;
      break;
    }
  }
  if (endOfCentralDirectory === -1) fail(`${path}: ZIP end-of-central-directory record not found`);

  const entryCount = archive.readUInt16LE(endOfCentralDirectory + 10);
  let offset = archive.readUInt32LE(endOfCentralDirectory + 16);
  const files = new Map();

  for (let entry = 0; entry < entryCount; entry += 1) {
    if (archive.readUInt32LE(offset) !== 0x02014b50) fail(`${path}: invalid ZIP central-directory entry`);
    const compression = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const localOffset = archive.readUInt32LE(offset + 42);
    const pathName = archive.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');

    if (archive.readUInt32LE(localOffset) !== 0x04034b50) fail(`${path}: invalid ZIP local entry for ${pathName}`);
    const localNameLength = archive.readUInt16LE(localOffset + 26);
    const localExtraLength = archive.readUInt16LE(localOffset + 28);
    const contentStart = localOffset + 30 + localNameLength + localExtraLength;
    const content = archive.subarray(contentStart, contentStart + compressedSize);
    if (content.length !== compressedSize) fail(`${path}: truncated ZIP entry ${pathName}`);
    if (!pathName.endsWith('/')) {
      if (compression === 0) files.set(pathName, content);
      else if (compression === 8) files.set(pathName, inflateRawSync(content));
      else fail(`${path}: unsupported ZIP compression method for ${pathName}`);
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return files;
}

function collectEntryPaths(value, paths) {
  if (typeof value === 'string') {
    paths.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectEntryPaths(item, paths);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectEntryPaths(item, paths);
  }
}

function validateEntryPath(files, packageName, field, value, failures) {
  if (typeof value !== 'string') return;
  const normalized = value.replace(/^\.\//, '');
  if (!normalized || normalized.startsWith('../') || !files.has(`package/${normalized}`)) {
    failures.push(`${packageName}: ${field} entry point does not exist: ${value}`);
  }
}

function validateNpmArtifacts(version, artifactsDir, failures) {
  const npmDir = join(artifactsDir, 'npm');
  const tarballs = readdirSync(npmDir)
    .filter((file) => file.endsWith('.tgz'))
    .map((file) => join(npmDir, file));
  const foundPackages = new Map();

  for (const tarball of tarballs) {
    let files;
    let manifest;
    try {
      files = readTarGz(tarball);
      const manifestBuffer = files.get('package/package.json');
      if (!manifestBuffer) fail('package/package.json is missing');
      manifest = JSON.parse(manifestBuffer.toString('utf8'));
    } catch (error) {
      failures.push(`${tarball}: ${error.message}`);
      continue;
    }

    if (!expectedPackages.includes(manifest.name)) {
      failures.push(`${tarball}: unexpected package name ${manifest.name ?? '(missing)'}`);
      continue;
    }
    if (foundPackages.has(manifest.name)) {
      failures.push(`${manifest.name}: more than one tarball was generated`);
      continue;
    }
    foundPackages.set(manifest.name, { files, manifest });

    if (manifest.version !== version) failures.push(`${manifest.name}: version is ${manifest.version}, expected ${version}`);
    if (![...files.keys()].some((path) => path.split('/').at(-1) === 'LICENSE')) {
      failures.push(`${manifest.name}: LICENSE is missing`);
    }

    for (const [field, value] of Object.entries(manifest)) {
      if (field === 'main' || field === 'module' || field === 'types' || field === 'typings') {
        validateEntryPath(files, manifest.name, field, value, failures);
      }
      if (field === 'bin') {
        const binEntries = typeof value === 'string' ? [value] : Object.values(value ?? {});
        for (const entry of binEntries) validateEntryPath(files, manifest.name, field, entry, failures);
      }
    }

    const exportPaths = [];
    collectEntryPaths(manifest.exports, exportPaths);
    for (const entry of exportPaths) {
      if (entry.startsWith('.')) validateEntryPath(files, manifest.name, 'exports', entry, failures);
    }
    if (!(manifest.types || manifest.typings)) failures.push(`${manifest.name}: type declaration entry is missing`);

    for (const [path, contents] of files) {
      if (path.endsWith('/package.json') && contents.toString('utf8').includes('workspace:')) {
        failures.push(`${manifest.name}: ${path} contains an unresolved workspace: protocol`);
      }
    }
  }

  for (const packageName of expectedPackages) {
    if (!foundPackages.has(packageName)) failures.push(`${packageName}: tarball is missing`);
  }

  const expectedInternalRange = `^${version}`;
  const web = foundPackages.get('@tipolox/litgrid-web')?.manifest;
  for (const dependency of ['@tipolox/litgrid-core', '@tipolox/litgrid-renderer']) {
    if (web?.dependencies?.[dependency] !== expectedInternalRange) {
      failures.push(`@tipolox/litgrid-web: ${dependency} must be ${expectedInternalRange}`);
    }
  }
  for (const packageName of ['@tipolox/litgrid-react', '@tipolox/litgrid-vue']) {
    if (foundPackages.get(packageName)?.manifest.dependencies?.['@tipolox/litgrid-web'] !== expectedInternalRange) {
      failures.push(`${packageName}: @tipolox/litgrid-web must be ${expectedInternalRange}`);
    }
  }
  if (foundPackages.get('@tipolox/litgrid-angular')?.manifest.dependencies?.['@tipolox/litgrid-web'] !== expectedInternalRange) {
    failures.push(`@tipolox/litgrid-angular: @tipolox/litgrid-web must be ${expectedInternalRange}`);
  }
}

function metadataValue(nuspec, tag) {
  return nuspec.match(new RegExp(`<${tag}(?:\\s[^>]*)?>\\s*([^<]+?)\\s*</${tag}>`, 'i'))?.[1].trim();
}

function validateNuGetArtifact(version, artifactsDir, failures) {
  const nugetDir = join(artifactsDir, 'nuget');
  const packages = readdirSync(nugetDir).filter((file) => file.endsWith('.nupkg'));
  if (packages.length !== 1) {
    failures.push(`NuGet: expected one .nupkg, found ${packages.length}`);
    return;
  }

  const nupkg = join(nugetDir, packages[0]);
  let files;
  try {
    files = readZip(nupkg);
  } catch (error) {
    failures.push(`${nupkg}: ${error.message}`);
    return;
  }

  const nuspecPath = [...files.keys()].find((path) => path.endsWith('.nuspec'));
  if (!nuspecPath) {
    failures.push('NuGet: .nuspec metadata is missing');
    return;
  }
  const nuspec = files.get(nuspecPath).toString('utf8');
  if (metadataValue(nuspec, 'id') !== 'Tipolox.LitGrid.Blazor') failures.push('NuGet: Package ID is not Tipolox.LitGrid.Blazor');
  if (metadataValue(nuspec, 'version') !== version) failures.push(`NuGet: package version is not ${version}`);
  for (const tag of ['authors', 'description', 'license']) {
    if (!metadataValue(nuspec, tag)) failures.push(`NuGet: required ${tag} metadata is missing`);
  }
  if (metadataValue(nuspec, 'readme') !== 'README.md') {
    failures.push('NuGet: PackageReadmeFile must declare README.md');
  }
  if (!files.has('README.md')) {
    failures.push('NuGet: README.md is missing from the package root');
  }
  if (![...files.keys()].some((path) => path.endsWith('/litgrid-blazor.js'))) {
    failures.push('NuGet: bundled Blazor static web asset litgrid-blazor.js is missing');
  }
}

if (process.argv.length !== 4) {
  console.error('Usage: node scripts/validate-release-artifacts.mjs <version> <artifacts-directory>');
  process.exit(1);
}

const [, , version, artifactsDir] = process.argv;
const failures = [];
try {
  validateNpmArtifacts(version, artifactsDir, failures);
  validateNuGetArtifact(version, artifactsDir, failures);
} catch (error) {
  failures.push(error.message);
}

if (failures.length) {
  console.error('FAIL: release artifact validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS: validated release artifacts for ${version}`);
