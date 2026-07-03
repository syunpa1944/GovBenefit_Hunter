const fs = require('fs');
const content = fs.readFileSync('node_modules/@apps-in-toss/cli/dist/index.js', 'utf8');
const regex = /\/api-public\/v3\/openapi\/[^\s'`"]+/g;
const matches = [...content.matchAll(regex)];
console.log('OPENAPI ENDPOINTS:', matches.map(m => m[0]));
