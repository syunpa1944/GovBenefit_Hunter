const fs = require('fs');
const { execSync } = require('child_process');

function getToken() {
  try {
    const creds = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n'
    }).toString();
    const tokenMatch = creds.match(/password=(.+)/);
    if (tokenMatch) return tokenMatch[1].trim();
  } catch (e) {}
  return '';
}

async function main() {
  const token = getToken();
  const headers = { 'User-Agent': 'Mozilla/5.0' };
  if (token) headers['Authorization'] = `token ${token}`;

  const listUrl = 'https://api.github.com/repos/syunpa1944/GovBenefit_Hunter/actions/runs?per_page=1';
  try {
    const listRes = await fetch(listUrl, { headers });
    if (listRes.status !== 200) {
      console.log(`Failed to list runs: ${listRes.status}`);
      return;
    }
    const listData = await listRes.json();
    const runs = listData.workflow_runs || [];
    if (runs.length === 0) {
      console.log("No workflow runs found.");
      return;
    }

    const latestRun = runs[0];
    console.log(`Latest Run ID: ${latestRun.id}, Trigger: ${latestRun.event}, Title: ${latestRun.display_title}, Status: ${latestRun.status}, Conclusion: ${latestRun.conclusion}`);

    const jobsUrl = latestRun.jobs_url;
    const jobsRes = await fetch(jobsUrl, { headers });
    if (jobsRes.status !== 200) {
      console.log(`Failed to get jobs: ${jobsRes.status}`);
      return;
    }
    const jobsData = await jobsRes.json();
    const jobs = jobsData.jobs || [];
    for (const job of jobs) {
      console.log(`Job ID: ${job.id}, Name: ${job.name}, Conclusion: ${job.conclusion}`);
      const steps = job.steps || [];
      for (const step of steps) {
        console.log(`  Step Name: ${step.name}, Conclusion: ${step.conclusion}`);
      }
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

main();
