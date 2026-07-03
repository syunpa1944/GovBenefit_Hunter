const apiKey = '5xZHDDQGkiFkDUG8_VR4DpiIiSEmsGKK8vlKIqPUH4U';
const baseUrl = 'https://apps-in-toss.toss.im/console';

const testUrls = [
  `${baseUrl}/api-public/v3/openapi/apps`,
  `${baseUrl}/api-public/v3/openapi/workspaces`,
  `${baseUrl}/api-public/v3/openapi/me`,
  `${baseUrl}/api-public/v3/openapi/bundles`,
  `${baseUrl}/api-public/v3/openapi/projects`,
  `${baseUrl}/api-public/v3/openapi/applications`,
  `${baseUrl}/api-public/v1/openapi/apps`,
  `${baseUrl}/api-public/v2/openapi/apps`,
  `${baseUrl}/api/v3/openapi/apps`,
  `${baseUrl}/api/v3/apps`,
  `${baseUrl}/api/apps`
];

async function testGet(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    const status = response.status;
    const body = await response.text();
    console.log(`URL [${url}] -> Status: ${status}`);
    if (status === 200 || (status !== 404 && body.length > 5 && !body.includes('Cannot GET'))) {
      console.log(`  Body: ${body.substring(0, 500)}`);
    }
  } catch (err) {
    console.log(`URL [${url}] -> Error: ${err.message}`);
  }
}

async function main() {
  console.log('Probing Toss API for App List Endpoint...');
  for (const url of testUrls) {
    await testGet(url);
  }
}

main();
