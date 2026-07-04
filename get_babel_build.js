const fs = require('fs');
const content = fs.readFileSync('node_modules/@apps-in-toss/web-config/dist/index.js', 'utf8');
const idx = content.indexOf('function babelBuild(');
if (idx !== -1) {
  console.log(content.substring(idx, idx + 1500));
} else {
  console.log('babelBuild not found');
}
