const { AppsInTossBundle } = require('@apps-in-toss/ait-format');

const apiKey = '5xZHDDQGkiFkDUG8_VR4DpiIiSEmsGKK8vlKIqPUH4U';
const baseUrl = 'https://apps-in-toss.toss.im/console';
const deploymentId = AppsInTossBundle.generateUUID7();

const words = ['gov', 'government', 'benefit', 'benefits', 'calendar', 'calendars', 'hunter', 'hunters', 'dalryeok', 'dalryuk', 'dal'];
const candidates = new Set();

// Generate combinations
words.forEach(w => {
  candidates.add(w);
  candidates.add(w.toLowerCase());
  candidates.add(w.charAt(0).toUpperCase() + w.slice(1));
});

// 2-word combinations
for (let i = 0; i < words.length; i++) {
  for (let j = 0; j < words.length; j++) {
    if (i === j) continue;
    const w1 = words[i];
    const w2 = words[j];
    
    // camelCase
    const camel = w1 + w2.charAt(0).toUpperCase() + w2.slice(1);
    // lowercase flat
    const flat = (w1 + w2).toLowerCase();
    // kebab-case
    const kebab = `${w1}-${w2}`.toLowerCase();
    
    candidates.add(camel);
    candidates.add(flat);
    candidates.add(kebab);
  }
}

// 3-word combinations (focus on main patterns)
const mainPrefixes = ['gov', 'government', 'benefit'];
const mainMiddles = ['benefit', 'benefits', 'calendar', 'dalryeok'];
const mainSuffixes = ['hunter', 'hunters', 'calendar', 'calendars', 'dalryeok', 'dal'];

mainPrefixes.forEach(p => {
  mainMiddles.forEach(m => {
    mainSuffixes.forEach(s => {
      if (p === m || m === s || p === s) return;
      // camel
      const camel = p + m.charAt(0).toUpperCase() + m.slice(1) + s.charAt(0).toUpperCase() + s.slice(1);
      // kebab
      const kebab = `${p}-${m}-${s}`.toLowerCase();
      // flat
      const flat = (p + m + s).toLowerCase();
      
      candidates.add(camel);
      candidates.add(kebab);
      candidates.add(flat);
    });
  });
});

// Specific checks
candidates.add('정부혜택달력');
candidates.add('정부혜택털기');
candidates.add('GovBenefit');
candidates.add('govbenefit');
candidates.add('GovBenefitHunter');
candidates.add('gov-benefit-hunter');

const candidateList = Array.from(candidates);
console.log(`Generated ${candidateList.length} candidate AppNames to scan.`);

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
    return { appName, isSuccess, body };
  } catch (err) {
    return { appName, isSuccess: false, error: err.message };
  }
}

async function main() {
  console.log('Scanning all candidates...');
  
  // Run checks in chunks of 20 to avoid rate limits
  const chunkSize = 20;
  for (let i = 0; i < candidateList.length; i += chunkSize) {
    const chunk = candidateList.slice(i, i + chunkSize);
    const promises = chunk.map(app => checkApp(app));
    const results = await Promise.all(promises);
    
    for (const res of results) {
      if (res.isSuccess) {
        console.log(`\n🎉 🎉 🎉 FOUND GENUINE APP NAME: [${res.appName}] 🎉 🎉 🎉`);
        console.log('Response body:', JSON.stringify(res.body));
        process.exit(0);
      }
    }
  }
  
  console.log('Scan completed. No valid AppName found.');
}

main();
