const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '../output');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function verifyJob(jobId) {
    let job;
    for (let i = 0; i < 20; i++) {
        try {
            const res = await axios.get(`${API_URL}/jobs/${jobId}`);
            job = res.data;
            console.log(`Job ${jobId} Status: ${job.status}`);
            if (job.status === 'completed' || job.status === 'failed') {
                return job;
            }
        } catch (e) {
            console.error('Error fetching job:', e.message);
        }
        await delay(1000);
    }
    return job;
}

async function run() {
    console.log('Starting verification...');

    // 1. Test CSV Export
    console.log('\n--- Testing CSV Export ---');
    try {
        const payload = {
            type: 'CSV_EXPORT',
            payload: {
                data: [
                    { id: 1, name: 'Alice', email: 'alice@example.com' },
                    { id: 2, name: 'Bob', email: 'bob@example.com' }
                ]
            }
        };
        const res = await axios.post(`${API_URL}/jobs`, payload);
        const jobId = res.data.jobId;
        console.log(`Created CSV Job: ${jobId}`);

        const completedJob = await verifyJob(jobId);
        if (completedJob && completedJob.status === 'completed') {
            const filePath = completedJob.result.filePath; // Path in container
            // Map container path to local path for verification
            const localPath = path.join(OUTPUT_DIR, path.basename(filePath));

            if (fs.existsSync(localPath)) {
                console.log('✅ CSV File created locally at:', localPath);
                const content = fs.readFileSync(localPath, 'utf8');
                console.log('File Content:\n', content);
                if (content.includes('Alice') && content.includes('Bob')) {
                    console.log('✅ CSV Content verified');
                } else {
                    console.error('❌ CSV Content incorrect');
                }
            } else {
                console.error(`❌ File not found at ${localPath}`);
            }
        } else {
            console.error('❌ CSV Job did not complete');
        }

    } catch (e) {
        console.error('CSV Test Failed:', e.message);
    }

    // 2. Test Email Send
    console.log('\n--- Testing Email Send ---');
    try {
        const payload = {
            type: 'EMAIL_SEND',
            priority: 'high',
            payload: {
                to: 'test@example.com',
                subject: 'Hello',
                body: 'World'
            }
        };
        const res = await axios.post(`${API_URL}/jobs`, payload);
        const jobId = res.data.jobId;
        console.log(`Created Email Job: ${jobId}`);

        const completedJob = await verifyJob(jobId);
        if (completedJob && completedJob.status === 'completed') {
            console.log('✅ Email Job completed locally');
            // Check Mailhog
            const mailhogRes = await axios.get('http://localhost:8025/api/v2/messages');
            const messages = mailhogRes.data.items;
            const found = messages.find(m => m.Content.Body.includes('World') && m.Raw.To.includes('test@example.com'));
            if (found) {
                console.log('✅ Email found in Mailhog');
            } else {
                console.error('❌ Email NOT found in Mailhog');
            }
        } else {
            console.error('❌ Email Job did not complete');
        }
    } catch (e) {
        console.error('Email Test Failed:', e.message);
    }
}

run();
