const { execSync } = require('child_process');

async function main() {
  const runId = '31048163508';
  const jobId = '92448735714';
  
  let token = '';
  try {
    const creds = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n'
    }).toString();
    const tokenMatch = creds.match(/password=(.+)/);
    if (tokenMatch) token = tokenMatch[1].trim();
  } catch (e) {}

  const url = `https://api.github.com/repos/syunpa1944/GovBenefit_Hunter/actions/jobs/${jobId}/logs`;
  
  // 1단계: API 인증 헤더를 붙여서 S3 다운로드 리다이렉션 위치만 획득
  const headers = { 
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/vnd.github+json'
  };
  if (token) headers['Authorization'] = `token ${token}`;

  try {
    console.log(`Fetching redirection from: ${url}`);
    const res = await fetch(url, { headers, redirect: 'manual' });
    let logUrl = '';
    
    if (res.status === 302 || res.status === 307) {
      logUrl = res.headers.get('location');
    } else {
      // 리다이렉트 안 된 경우 (결과 본문이 바로 온 경우)
      logUrl = url;
    }
    
    if (!logUrl) {
      console.log(`Could not find redirection location. Status: ${res.status}`);
      return;
    }

    console.log(`Downloading log from S3/Azure URL...`);
    // 2단계: S3/Azure로 직접 요청을 보낼 때는 API Authorization 헤더가 들어가면 서명 오류가 나므로 헤더를 완전히 비우고 호출
    const finalRes = await fetch(logUrl);
    if (finalRes.status !== 200) {
      console.log(`Failed to load final logs from AWS: ${finalRes.status} ${finalRes.statusText}`);
      // 헤더를 주입해 리다이렉션이 아니라 직접 로드가 필요할 수 있으므로 폴백 가동
      const fallbackRes = await fetch(logUrl, { headers: { 'Authorization': 'token ' + token } });
      const fallbackText = await fallbackRes.text();
      console.log(fallbackText.split('\n').slice(-50).join('\n'));
      return;
    }

    const logText = await finalRes.text();
    const lines = logText.split('\n');
    console.log(`\n=== LAST 60 LINES OF GITHUB ACTIONS JOB LOG ===`);
    console.log(lines.slice(-60).join('\n'));
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}
main();
