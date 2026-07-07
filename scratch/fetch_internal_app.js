const apiKey = '5xZHDDQGkiFkDUG8_VR4DpiIiSEmsGKK8vlKIqPUH4U';
const baseUrl = 'https://apps-in-toss.toss.im/console';

async function testGet(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });
    const status = response.status;
    const body = await response.text();
    console.log(`URL [${url}] -> Status: ${status}`);
    if (status === 200 && body.length > 5) {
      console.log(`SUCCESS! Saved response to scratch/console_app_detail.json`);
      require('fs').writeFileSync('scratch/console_app_detail.json', JSON.stringify(JSON.parse(body), null, 2));
      return true;
    }
  } catch (err) {
    console.log(`Error on ${url}: ${err.message}`);
  }
  return false;
}

async function main() {
  const urls = [
    `${baseUrl}/api/v3/apps/govbenefit-hunter`,
    `${baseUrl}/api/v2/apps/govbenefit-hunter`,
    `${baseUrl}/api/v1/apps/govbenefit-hunter`,
    `${baseUrl}/api/apps/govbenefit-hunter`,
    `${baseUrl}/api/v3/openapi/apps/govbenefit-hunter`,
    `${baseUrl}/api/v2/openapi/apps/govbenefit-hunter`,
    `${baseUrl}/api/v1/openapi/apps/govbenefit-hunter`,
    `${baseUrl}/api/openapi/apps/govbenefit-hunter`,
    `${baseUrl}/api/v3/projects/govbenefit-hunter`,
    `${baseUrl}/api/v3/applications/govbenefit-hunter`,
    `${baseUrl}/api/v3/workspaces/govbenefit-hunter`,
    `${baseUrl}/api/v3/me`,
    `${baseUrl}/api/me`
  ];

  for (const url of urls) {
    const success = await testGet(url);
    if (success) {
      console.log('Successfully found the app details endpoint!');
      break;
    }
  }
}

main();
