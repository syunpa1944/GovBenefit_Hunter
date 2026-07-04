const fs = require('fs');
const content = fs.readFileSync('node_modules/@apps-in-toss/cli/dist/index.js', 'utf8');
const idx = content.indexOf('async function buildArtifact(');
if (idx !== -1) {
  console.log(content.substring(idx, idx + 2000));
} else {
  console.log('buildArtifact not found');
}
