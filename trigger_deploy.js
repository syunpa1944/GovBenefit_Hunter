const path = require('path');
const fs = require('fs');

const cliPath = path.resolve('node_modules/@apps-in-toss/cli/dist/index.js');
let code = fs.readFileSync(cliPath, 'utf8');

// Expose uploadArtifact
if (code.includes('async function uploadArtifact(')) {
  code = code.replace('async function uploadArtifact(', 'global.uploadArtifact = async function uploadArtifact(');
  console.log('Modified uploadArtifact injection.');
} else {
  console.log('Target uploadArtifact function signature not found!');
}

const tempCliPath = path.resolve('scratch/temp_cli_deploy.js');
fs.mkdirSync(path.dirname(tempCliPath), { recursive: true });
fs.writeFileSync(tempCliPath, code, 'utf8');

async function run() {
  try {
    require(tempCliPath);
    
    if (typeof global.uploadArtifact !== 'function') {
      throw new Error('global.uploadArtifact is not a function');
    }
    
    console.log('Triggering uploadArtifact directly...');
    
    // We need to pass the exact config required by uploadArtifact
    // config structure:
    // {
    //   artifactPath: './govbenefit-hunter.ait',
    //   appName: 'govbenefit-hunter',
    //   deploymentId: '019f107a-b502-795d-bf9f-9117b3b7d205',
    //   apiKey: '5xZHDDQGkiFkDUG8_VR4DpiIiSEmsGKK8vlKIqPUH4U',
    //   memo: '정부혜택달력 공식 마스터 빌드',
    //   baseUrl: 'https://apps-in-toss.toss.im/console',
    //   timeoutSeconds: 300
    // }
    
    const config = {
      artifactPath: path.resolve('govbenefit-hunter.ait'),
      appName: 'govbenefit-hunter',
      deploymentId: '019f3c5e-8ff8-769a-bb09-b4a7d8ab726a',
      apiKey: '5xZHDDQGkiFkDUG8_VR4DpiIiSEmsGKK8vlKIqPUH4U',
      memo: '외부 CDN 스크립트(static.toss.im, jsdelivr) 제거 → Vite 모듈 임포트로 대체',
      baseUrl: 'https://apps-in-toss.toss.im/console',
      timeoutSeconds: 300
    };
    
    console.log('Config path:', config.artifactPath, 'exists:', fs.existsSync(config.artifactPath));
    
    const result = await global.uploadArtifact(config);
    console.log('Upload Successful! Result:', result);
  } catch (err) {
    console.error('Upload Error:', err);
  }
}

run();
