const apiKey = '5xZHDDQGkiFkDUG8_VR4DpiIiSEmsGKK8vlKIqPUH4U';
const baseUrl = 'https://apps-in-toss.toss.im/console';
const appName = 'govbenefit-hunter';
const deploymentId = '019f2988-2015-7bad-92fb-6b06394e4b5b';

async function main() {
  const url = `${baseUrl}/api-public/v3/openapi/bundles/${appName}/deployments/${deploymentId}`;
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
    console.log(`Status: ${status}`);
    console.log(`Response Body:\n`, JSON.stringify(JSON.parse(body), null, 2));
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
}

main();
