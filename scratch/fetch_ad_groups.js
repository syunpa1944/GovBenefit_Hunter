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
      console.log(`SUCCESS! Saved response to scratch/ad_groups_api.json`);
      fs.writeFileSync('scratch/ad_groups_api.json', JSON.stringify(JSON.parse(body), null, 2));
      return true;
    }
  } catch (err) {
    console.log(`Error on ${url}: ${err.message}`);
  }
  return false;
}

async function main() {
  const urls = [
    `${baseUrl}/api-public/v3/openapi/apps/48225/ad-groups`,
    `${baseUrl}/api-public/v3/openapi/bundles/govbenefit-hunter/ad-groups`,
    `${baseUrl}/api-public/v3/openapi/bundles/govbenefit-hunter/ads`,
    `${baseUrl}/api-public/v3/openapi/ad-groups`
  ];

  for (const url of urls) {
    await testGet(url);
  }
}

main();
