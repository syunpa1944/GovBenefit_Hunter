const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');

// Find all IDs in HTML (id="something")
const idRegex = /id="([^"]+)"/g;
const htmlIds = new Set();
let m;
while ((m = idRegex.exec(html)) !== null) {
  htmlIds.add(m[1]);
}

console.log('HTML IDs found:', Array.from(htmlIds));

// Find all getElementById calls in JS
const jsRegex = /getElementById\('([^']+)'\)/g;
const jsIds = new Set();
while ((m = jsRegex.exec(app)) !== null) {
  jsIds.add(m[1]);
}

console.log('JS getElementById calls found:', Array.from(jsIds));

// Check missing IDs
for (const id of jsIds) {
  if (!htmlIds.has(id)) {
    console.warn(`🚨 WARNING: JS references ID [${id}] but it does NOT exist in index.html!`);
  }
}
