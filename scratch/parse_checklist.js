const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\neon5\\.gemini\\antigravity\\brain\\7a08c8e1-7645-42ac-85bc-6a5312bb8505\\.system_generated\\steps\\4408\\content.md', 'utf8');

const hrefs = [];
const regex = /href="([^"]+)"/g;
let match;
while ((match = regex.exec(content)) !== null) {
  hrefs.push(match[1]);
}

console.log('Found Links in Checklist:\n', Array.from(new Set(hrefs)));
