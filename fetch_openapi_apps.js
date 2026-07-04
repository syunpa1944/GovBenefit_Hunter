const fs = require('fs');
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
      console.log(`SUCCESS! Saved response to scratch/openapi_apps_list.json`);
      fs.writeFileSync('scratch/openapi_apps_list.json', JSON.stringify(JSON.parse(body), null, 2));
      return true;
    }
  } catch (err) {
    console.log(`Error on ${url}: ${err.message}`);
  }
  return false;
}

async function main() {
  const urls = [
    `${baseUrl}/api-public/v3/openapi/mini-apps/govbenefit-hunter`,
    `${baseUrl}/api-public/v3/openapi/mini-apps`,
    `${baseUrl}/api-public/v3/openapi/apps/48225`,
    `${baseUrl}/api-public/v3/openapi/apps/govbenefit-hunter`,
    `${baseUrl}/api-public/v3/openapi/bundles/${encodeURIComponent('govbenefit-hunter')}`,
    `${baseUrl}/api-public/v3/openapi/bundles/govbenefit-hunter/deployments`,
    `${baseUrl}/api-public/v3/openapi/workspaces/apps`,
    `${baseUrl}/api-public/v3/openapi/workspaces/me/apps`
  ];

  for (const url of urls) {
    await testGet(url);
  }
}

main();
