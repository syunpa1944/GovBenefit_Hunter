const urls = [
  'https://static.toss.im/ads/v1.js',
  'https://static.toss.im/ads/sdk/toss-ads-space-kit.js',
  'https://static.toss.im/ads/sdk/v1.js',
  'https://static.toss.im/ads/sdk/toss-ads.js',
  'https://static.toss.im/ads/sdk/toss-ads-space-kit-v1.js',
  'https://static.toss.im/ads/sdk/space-kit.js'
];

async function main() {
  for (const url of urls) {
    try {
      const resp = await fetch(url, { method: 'GET' });
      const text = await resp.text();
      console.log(`URL [${url}] -> Status: ${resp.status}, Length: ${text.length}`);
      if (resp.status === 200 && text.length > 50) {
        console.log(`FOUND ACTIVE URL: ${url}`);
        break;
      }
    } catch (e) {
      console.log(`URL [${url}] -> Error: ${e.message}`);
    }
  }
}

main();
