async function main() {
  const url = 'https://api.github.com/repos/syunpa1944/GovBenefit_Hunter/actions/runs/28678530011/jobs';
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const status = response.status;
    const body = await response.text();
    console.log(`Status: ${status}`);
    if (status === 200) {
      const data = JSON.parse(body);
      const jobs = data.jobs || [];
      for (const job of jobs) {
        console.log(`Job ID: ${job.id}, Name: ${job.name}, Conclusion: ${job.conclusion}`);
        const steps = job.steps || [];
        for (const step of steps) {
          console.log(`  Step Name: ${step.name}, Conclusion: ${step.conclusion}`);
        }
      }
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

main();
