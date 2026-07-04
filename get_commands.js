const fs = require('fs');
const content = fs.readFileSync('node_modules/@apps-in-toss/cli/dist/index.js', 'utf8');
const matches = content.matchAll(/static paths = \[\["([^"]+)"/g);
const paths = [];
for (const m of matches) {
  paths.push(m[1]);
}
console.log('CLI COMMANDS:', paths);
