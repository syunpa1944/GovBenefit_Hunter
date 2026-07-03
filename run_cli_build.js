const path = require('path');
const fs = require('fs');

// We will load the builder module and run buildArtifact directly
const packageRoot = 'C:\\럭포마_개발자료\\앱인토스\\광고예상';

// We can load the internal functions from node_modules/@apps-in-toss/cli/dist/index.js
// Since it's bundled, we can find and call the functions, or run it through Node VM or directly require it.
// Let's inspect the exports of @apps-in-toss/cli or its dist/index.js
try {
  const cli = require('./node_modules/@apps-in-toss/cli/dist/index.js');
  console.log('CLI exports:', Object.keys(cli));
} catch (err) {
  console.error('Failed to require CLI directly:', err.message);
}
