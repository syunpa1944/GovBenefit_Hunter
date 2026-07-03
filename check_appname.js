const { AppsInTossBundle } = require('@apps-in-toss/ait-format');

const apiKey = '5xZHDDQGkiFkDUG8_VR4DpiIiSEmsGKK8vlKIqPUH4U';
const baseUrl = 'https://apps-in-toss.toss.im/console';
const deploymentId = AppsInTossBundle.generateUUID7();

const candidates = [
  'Govbenefit'
];

async function checkApp(appName) {
  const url = `${baseUrl}/api-public/v3/openapi/bundles/${encodeURIComponent(appName)}/upload-start`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        deploymentId: deploymentId,
        memo: 'Test Connection'
      })
    });
    
    const body = await response.json();
    const isSuccess = body.resultType === 'SUCCESS' || !body.error;
    console.log(`AppName [${appName}] -> Success: ${isSuccess}, Response: ${JSON.stringify(body)}`);
    return { appName, isSuccess };
  } catch (err) {
    console.log(`AppName [${appName}] -> Error: ${err.message}`);
    return { appName, isSuccess: false };
  }
}

async function main() {
  console.log('Validating AppName against Toss API Server (Filtering SUCCESS only)...');
  for (const app of candidates) {
    const res = await checkApp(app);
    if (res.isSuccess) {
      console.log(`\n🎉 FOUND GENUINE APP NAME: [${res.appName}] 🎉\n`);
    }
  }
}

main();
