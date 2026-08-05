const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  const jobId = process.argv[2] || '92247820686';
  const outPath = 'C:\\Users\\neon5\\AppData\\Local\\Temp\\claude\\C--------------------\\04e210f7-4a56-445b-90d4-41a906900467\\scratchpad\\_job_log_raw.txt';

  let token = '';
  try {
    const creds = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n'
    }).toString();
    const tokenMatch = creds.match(/password=(.+)/);
    if (tokenMatch) token = tokenMatch[1].trim();
  } catch (e) {}

  const url = `https://api.github.com/repos/syunpa1944/GovBenefit_Hunter/actions/jobs/${jobId}/logs`;
  const headers = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/vnd.github+json' };
  if (token) headers['Authorization'] = `token ${token}`;

  console.log('Fetching redirection...');
  const res = await fetch(url, { headers, redirect: 'manual' });
  let logUrl = url;
  if (res.status === 302 || res.status === 307) {
    logUrl = res.headers.get('location');
  }

  console.log('Streaming log to disk (no full in-memory string)...');
  const finalRes = await fetch(logUrl);
  if (!finalRes.ok) {
    console.log('Failed:', finalRes.status, finalRes.statusText);
    return;
  }

  const fileStream = fs.createWriteStream(outPath);
  await new Promise((resolve, reject) => {
    const { Readable } = require('stream');
    Readable.fromWeb(finalRes.body).pipe(fileStream);
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });

  const stat = fs.statSync(outPath);
  console.log(`Saved log to ${outPath} (${(stat.size / 1024 / 1024).toFixed(1)}MB)`);
}
main().catch(e => console.error('Error:', e.message));
