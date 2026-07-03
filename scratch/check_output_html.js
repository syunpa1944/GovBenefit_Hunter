const fs = require('fs');
const { AppsInTossBundle } = require('@apps-in-toss/ait-format');

async function main() {
  console.log('Reading compiled index.html inside govbenefit-hunter.ait...');
  
  const buffer = fs.readFileSync('govbenefit-hunter.ait');
  const reader = AppsInTossBundle.reader(buffer);
  
  const htmlContent = await reader.readEntry('web/index.html');
  console.log('\n=== COMPILED web/index.html CONTENT ===\n');
  console.log(new TextDecoder().decode(htmlContent));
}

main().catch(console.error);
