const http = require('http');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function runTest() {
  console.log('=== E2E Test Starting ===\n');

  try {
    // Step 1: Upload PDF
    console.log('Step 1: Uploading PDF...');
    const fileStream = fs.createReadStream('test.pdf');
    const form = new FormData();
    form.append('file', fileStream);
    form.append('name', 'Juan Perez');
    form.append('email', 'test@example.com');
    form.append('plate', 'RMNP');

    const uploadResp = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/analyze',
        method: 'POST',
        headers: form.getHeaders(),
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
      });

      req.on('error', reject);
      form.pipe(req);
    });

    console.log(`Status: ${uploadResp.status}`);
    console.log(`Response: ${JSON.stringify(uploadResp.data, null, 2)}\n`);

    const requestId = uploadResp.data.requestId;
    if (!requestId) throw new Error('No requestId in response');

    // Step 2: Get analysis results
    console.log('Step 2: Getting analysis results...');
    const resultsResp = await fetch(`http://localhost:3000/api/results/${requestId}`).then(r => r.json());
    console.log(`Total Fines: ${resultsResp.analysis.totalFines}`);
    console.log(`Prescribed: ${resultsResp.analysis.prescribedFines}`);
    console.log(`Not Prescribed: ${resultsResp.analysis.notPrescribedFines}\n`);

    // Step 3: Process payment webhook
    console.log('Step 3: Processing mock payment...');
    const paymentResp = await fetch(`http://localhost:3000/api/payment/webhook?requestId=${requestId}&status=approved`, { redirect: 'follow' });
    console.log(`Payment Status: ${paymentResp.status}\n`);

    // Step 4: Download report
    console.log('Step 4: Downloading report...');
    const reportData = await fetch(`http://localhost:3000/api/download/${requestId}?format=report`).then(r => r.text());
    fs.writeFileSync('report.html', reportData);
    console.log(`Report saved (${reportData.length} bytes)\n`);

    // Step 5: Download drafts
    console.log('Step 5: Downloading drafts...');
    const draftsData = await fetch(`http://localhost:3000/api/download/${requestId}?format=drafts`).then(r => r.text());
    fs.writeFileSync('drafts.txt', draftsData);
    console.log(`Drafts saved (${draftsData.length} bytes)\n`);

    console.log('=== E2E Test Complete ===');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

runTest();
