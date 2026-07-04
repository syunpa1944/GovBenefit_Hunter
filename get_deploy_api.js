const fs = require('fs');
const content = fs.readFileSync('node_modules/@apps-in-toss/cli/dist/index.js', 'utf8');
const idx = content.indexOf('var DeployCommand = class');
if (idx !== -1) {
  console.log(content.substring(idx + 5000, idx + 10000));
} else {
  console.log('DeployCommand not found');
}
