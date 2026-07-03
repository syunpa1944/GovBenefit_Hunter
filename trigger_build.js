const path = require('path');
const fs = require('fs');

// We will read CLI index.js, wrap it to expose buildArtifact, and execute it.
const cliPath = path.resolve('node_modules/@apps-in-toss/cli/dist/index.js');
let code = fs.readFileSync(cliPath, 'utf8');

// 1. Expose buildArtifact to global
if (code.includes('async function buildArtifact(')) {
  code = code.replace('async function buildArtifact(', 'global.buildArtifact = async function buildArtifact(');
} else {
  console.log('Target buildArtifact function signature not found!');
}

// 2. IMPORTANT: Remove RNBuildStrategy from default strategies to bypass 'npx granite build' crash
if (code.includes('const strategies = [new WebBuildStrategy(), new RNBuildStrategy()];')) {
  code = code.replace(
    'const strategies = [new WebBuildStrategy(), new RNBuildStrategy()];',
    'const strategies = [new WebBuildStrategy()];'
  );
  console.log('Successfully bypassed RNBuildStrategy to run Web-only compilation!');
} else {
  console.log('Target strategies array not found or already modified!');
}

// Write to a temporary file in scratch
const tempCliPath = path.resolve('scratch/temp_cli.js');
fs.mkdirSync(path.dirname(tempCliPath), { recursive: true });
fs.writeFileSync(tempCliPath, code, 'utf8');

// Now run the build
async function run() {
  try {
    // Require the modified CLI to initialize it
    require(tempCliPath);
    
    if (typeof global.buildArtifact !== 'function') {
      throw new Error('global.buildArtifact is not a function');
    }
    
    console.log('Executing official buildArtifact pipeline (Web strategy only)...');
    const result = await global.buildArtifact('C:\\럭포마_개발자료\\앱인토스\\광고예상');
    console.log('Build Artifact Result:', result);
  } catch (err) {
    console.error('Execution Error:', err);
  }
}

run();
