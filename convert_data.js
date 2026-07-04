const fs = require('fs');
const path = require('path');

const jsonPath = 'C:\\럭포마_개발자료\\앱인토스\\광고예상\\data.json';
const jsPath = 'C:\\럭포마_개발자료\\앱인토스\\광고예상\\data.js';

try {
  console.log('Converting data.json to data.js...');
  const jsonContent = fs.readFileSync(jsonPath, 'utf8');
  
  // Wrap with global window variable assignment
  const jsContent = `window.BENEFITS_DATA = ${jsonContent.trim()};\n`;
  
  fs.writeFileSync(jsPath, jsContent, 'utf8');
  console.log('Conversion successful! data.js created.');
} catch (err) {
  console.error('Conversion failed:', err);
}
