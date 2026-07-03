const fs = require('fs');
const path = require('path');
const { AppsInTossBundle, PlatformType } = require('@apps-in-toss/ait-format');

async function main() {
  console.log('Starting Corrected Binary Linker Patch on govbenefit-hunter.ait...');
  
  const aitPath = process.argv[2] || 'govbenefit-hunter.ait';
  if (!fs.existsSync(aitPath)) {
    throw new Error(`Official .ait not found at path: ${aitPath}!`);
  }

  // 1. Read existing compliant bundle
  const buffer = fs.readFileSync(aitPath);
  const reader = AppsInTossBundle.reader(buffer);
  
  console.log('Original Bundle Specs:');
  console.log('  AppName:', reader.appName);
  console.log('  DeploymentID:', reader.deploymentId);

  // 2. Initialize new writer keeping the EXACT original properties
  const writer = AppsInTossBundle.writer({
    appName: reader.appName,
    deploymentId: reader.deploymentId,
    createdBy: 'antigravity-binary-linker/3.0.1'
  });

  // Keep original metadata
  writer.setMetadata({
    platform: reader.metadata.platform,
    runtimeVersion: reader.metadata.runtimeVersion,
    isGame: reader.metadata.isGame,
    sdkVersion: reader.metadata.sdkVersion,
    bundleFiles: reader.metadata.bundleFiles,
    packageJson: reader.metadata.packageJson,
    extra: reader.metadata.extra
  });

  // Keep original permissions
  for (const permission of reader.permissions) {
    writer.addPermission(permission.name, permission.access);
  }

  // 3. Extract and re-write entries with Double-Mounting (both Root and web/)
  const entries = reader.listEntries();
  const fileCache = {};

  // Read all original files into memory, normalizing paths to standard slash '/'
  for (const name of entries) {
    const data = await reader.readEntry(name);
    const normalizedName = name.replace(/\\/g, '/');
    fileCache[normalizedName] = data;
    console.log(`Cached input file: ${normalizedName} (${data.length} bytes)`);
  }

  // Target assets we want to ensure exist at both Root level and web/ level
  const assetsToDoubleMount = [
    'index.html',
    'app.js',
    'style.css',
    'data.js',
    'app_logo_main_1782592690933.png',
    'icon.png'
  ];

  // Write all original entries first (using normalized standard slash names)
  for (const name of Object.keys(fileCache)) {
    writer.addFile(name, fileCache[name]);
  }

  // Perform Double-Mounting mapping (using standard slash '/')
  for (const asset of assetsToDoubleMount) {
    const rootName = asset;
    const webName = `web/${asset}`;

    const hasRoot = fileCache[rootName] !== undefined;
    const hasWeb = fileCache[webName] !== undefined;

    let sourceData = fileCache[webName] || fileCache[rootName];
    if (!sourceData) {
      const possiblePaths = [
        asset,
        path.join('test-app', asset),
        path.join('test-app/src', asset),
        path.join('test-app/src', asset === 'style.css' ? 'App.css' : asset)
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          sourceData = fs.readFileSync(p);
          console.log(`Loaded source data directly from local file: ${p}`);
          break;
        }
      }
    }
    if (!sourceData) {
      console.warn(`Asset not found in original bundle or local filesystem: ${asset}`);
      continue;
    }

    // Write missing root version
    if (!hasRoot) {
      writer.addFile(rootName, sourceData);
      console.log(`Linked asset to [Root]: ${rootName}`);
    }
    // Write missing web version
    if (!hasWeb) {
      writer.addFile(webName, sourceData);
      console.log(`Linked asset to [web/]: ${webName}`);
    }
  }

  // 4. Output final patched bundle
  const patchedBuffer = await writer.toBuffer();
  fs.writeFileSync(aitPath, patchedBuffer);
  console.log('Linker Patch completed successfully! Size:', patchedBuffer.length, 'bytes');

  // Verify
  const newReader = AppsInTossBundle.reader(patchedBuffer);
  console.log('Verified Patched File Entries:');
  newReader.listEntries().forEach(f => console.log('  -', f));
}

main().catch(err => {
  console.error('Linker Patch Failed:', err);
  process.exit(1);
});
