const fs = require('fs');
const path = require('path');

// Get bump type from command line args (patch, minor, major)
const bumpType = process.argv[2] || 'patch';

if (!['major', 'minor', 'patch'].includes(bumpType)) {
  console.error('Usage: node bump-version.js [major|minor|patch]');
  console.error('Example: node bump-version.js minor');
  process.exit(1);
}

console.log(`Bumping ${bumpType} version...`);

// Read current version
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

// Parse version
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Calculate new version
let newVersion;
switch (bumpType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

console.log(`${currentVersion} → ${newVersion}`);


packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('Updated package.json');


const manifestPath = path.join(__dirname, 'extension', 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.version = newVersion;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log('Updated extension/manifest.json');
}


const tauriConfPath = path.join(__dirname, 'src-tauri', 'tauri.conf.json');
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  tauriConf.version = newVersion;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
  console.log('Updated src-tauri/tauri.conf.json');
}


const cargoTomlPath = path.join(__dirname, 'src-tauri', 'Cargo.toml');
if (fs.existsSync(cargoTomlPath)) {
  let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
  cargoToml = cargoToml.replace(
    /^version\s*=\s*"[^"]*"/m,
    `version = "${newVersion}"`
  );
  fs.writeFileSync(cargoTomlPath, cargoToml);
  console.log('Updated src-tauri/Cargo.toml');
}

console.log(`\nVersion bumped to ${newVersion}`);
console.log('\nNext steps:');
console.log('  git add -A');
console.log(`  git commit -m "chore: bump version to ${newVersion}"`);
console.log(`  git tag v${newVersion}`);
console.log('  git push && git push --tags');