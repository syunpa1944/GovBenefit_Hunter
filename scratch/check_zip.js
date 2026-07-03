const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const zipPath = 'C:\\럭포마_개발자료\\앱인토스\\공공데이터api연결\\GovBenefit_Hunter-main.zip';
console.log('Zip file exists:', fs.existsSync(zipPath));

// Natively list ZIP files via tar on Windows 10/11
const cmd = `tar -tf "${zipPath}"`;

exec(cmd, (err, stdout, stderr) => {
  if (err) {
    console.error('Error listing zip content:', err);
    return;
  }
  console.log('=== ZIP Content List ===');
  console.log(stdout);
});
